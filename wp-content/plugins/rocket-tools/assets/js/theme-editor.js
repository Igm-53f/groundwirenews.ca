/* global rtTE, jQuery, wp, CodeMirror */
jQuery(function ($) {
    'use strict';

    var state = {
        theme:         '',
        file:          '',
        changed:       false,
        gotoLine:      0,
        findAfterLoad: ''
    };

    var cmEditor    = null;   // CodeMirror instance (created once, reused)
    var findMatches = [];     // [{from:{line,ch}, to:{line,ch}}]
    var findIdx     = 0;
    var findQuery   = '';
    var findMarks   = [];     // CodeMirror text markers for find results

    // ── Init ──────────────────────────────────────────────────────────

    function init() {
        var defaultSlug = '';
        $.each(rtTE.themes, function (i, t) {
            if (t.active) { defaultSlug = t.slug; return false; }
        });
        if (defaultSlug) {
            $('#rt-te-theme-select').val(defaultSlug);
            loadTree(defaultSlug);
        }
    }

    // ── Ajax helper ───────────────────────────────────────────────────

    function ajax(action, data, done, fail) {
        $.post(rtTE.ajaxUrl, $.extend({ action: action, nonce: rtTE.nonce }, data))
            .done(function (res) {
                if (res.success) {
                    if (done) done(res.data || {});
                } else {
                    var msg = (res.data && res.data.message) ? res.data.message : 'Unknown error';
                    if (fail) fail(msg); else alert(msg);
                }
            })
            .fail(function () {
                if (fail) fail('Request failed'); else alert('Request failed');
            });
    }

    // ── Tree ──────────────────────────────────────────────────────────

    function loadTree(slug) {
        state.theme = slug;
        $('#rt-te-tree-wrap').html('<p style="padding:8px 12px;color:#646970;font-size:12px;">' + rtTE.i18n.loading + '</p>');
        ajax('rt_te_tree', { theme_slug: slug }, function (data) {
            var $ul = buildTree(data.tree);
            $('#rt-te-tree-wrap').empty().append($ul);
            if (state.file) {
                $('[data-path="' + escAttr(state.file) + '"]').addClass('rt-te-active');
            }
            applyTreeFilter();
        });
    }

    function buildTree(items) {
        var $ul = $('<ul class="rt-te-tree">');
        $.each(items, function (i, item) {
            var $li   = $('<li class="rt-te-item">').attr({ 'data-path': item.path, 'data-type': item.type });
            var $row  = $('<div class="rt-te-row">');
            var $acts = $('<span class="rt-te-item-actions">');

            if (item.type === 'dir') {
                $row.append('<span class="rt-te-arrow">▶</span>');
                $row.append('<span class="rt-te-icon">📁</span>');
                $acts.append('<button class="rt-te-act rt-te-act-new-file"  title="+File">+F</button>');
                $acts.append('<button class="rt-te-act rt-te-act-new-folder" title="+Folder">+D</button>');
            } else {
                $row.append('<span class="rt-te-spacer"></span>');
                $row.append('<span class="rt-te-icon">📄</span>');
            }

            $row.append($('<span class="rt-te-name">').text(item.name));
            $acts.append('<button class="rt-te-act rt-te-act-rename" title="Rename">✏</button>');
            $acts.append('<button class="rt-te-act rt-te-act-delete" title="Delete">✕</button>');
            $row.append($acts);
            $li.append($row);

            if (item.type === 'dir' && item.children && item.children.length) {
                $li.append(buildTree(item.children).addClass('rt-te-children').hide());
            }
            $ul.append($li);
        });
        return $ul;
    }

    // ── Tree interactions ─────────────────────────────────────────────

    $(document).on('click', '.rt-te-item[data-type="dir"] > .rt-te-row > .rt-te-arrow,' +
                            '.rt-te-item[data-type="dir"] > .rt-te-row > .rt-te-icon,' +
                            '.rt-te-item[data-type="dir"] > .rt-te-row > .rt-te-name', function (e) {
        if ($(e.target).hasClass('rt-te-act') || $(e.target).hasClass('rt-te-inline-input')) return;
        var $li       = $(this).closest('li');
        var $children = $li.children('.rt-te-children');
        var $arrow    = $li.children('.rt-te-row').find('.rt-te-arrow');
        if ($children.length) {
            $children.toggle();
            $arrow.text($children.is(':visible') ? '▼' : '▶');
        }
    });

    $(document).on('click', '.rt-te-item[data-type="file"] > .rt-te-row', function (e) {
        if ($(e.target).hasClass('rt-te-act') || $(e.target).hasClass('rt-te-inline-input')) return;
        openFile($(this).closest('li').data('path'));
    });

    // ── Tree actions ──────────────────────────────────────────────────

    $(document).on('click', '.rt-te-act-rename', function (e) {
        e.stopPropagation();
        var $li      = $(this).closest('li');
        var oldName  = $li.data('path').split('/').pop();
        var $nameSpan = $li.find('> .rt-te-row > .rt-te-name');
        var $input   = $('<input class="rt-te-inline-input" type="text">').val(oldName);
        $nameSpan.replaceWith($input);
        $input.focus().select();

        function commit() {
            var newName = $.trim($input.val());
            if (!newName || newName === oldName) { loadTree(state.theme); return; }
            ajax('rt_te_rename', { theme_slug: state.theme, path: $li.data('path'), new_name: newName },
                function (data) {
                    if ($li.data('type') === 'file' && $li.data('path') === state.file) {
                        state.file = data.new_path;
                        $('#rt-te-file-path').text(data.new_path);
                    }
                    loadTree(state.theme);
                }
            );
        }

        $input.on('keydown', function (e) {
            if (e.key === 'Enter')  { commit(); }
            if (e.key === 'Escape') { loadTree(state.theme); }
        }).on('blur', commit);
    });

    $(document).on('click', '.rt-te-act-delete', function (e) {
        e.stopPropagation();
        var $li  = $(this).closest('li');
        var path = $li.data('path');
        var type = $li.data('type');
        var msg  = type === 'dir'
            ? rtTE.i18n.deleteFolder.replace('%s', path)
            : rtTE.i18n.deleteFile.replace('%s', path);

        if (!confirm(msg)) return;
        ajax('rt_te_delete', { theme_slug: state.theme, path: path }, function () {
            if (type === 'file' && path === state.file) closeEditor();
            loadTree(state.theme);
        });
    });

    $(document).on('click', '.rt-te-act-new-file', function (e) {
        e.stopPropagation();
        promptCreate($(this).closest('li').data('path'), 'file');
    });

    $(document).on('click', '.rt-te-act-new-folder', function (e) {
        e.stopPropagation();
        promptCreate($(this).closest('li').data('path'), 'dir');
    });

    $('#rt-te-root-new-file').on('click',   function () { promptCreate('', 'file'); });
    $('#rt-te-root-new-folder').on('click', function () { promptCreate('', 'dir'); });

    function promptCreate(parentPath, type) {
        var label = type === 'dir' ? rtTE.i18n.newFolderName : rtTE.i18n.newFileName;
        var name  = $.trim(prompt(label) || '');
        if (!name) return;
        var rel = parentPath ? parentPath + '/' + name : name;
        ajax('rt_te_create', { theme_slug: state.theme, path: rel, type: type }, function () {
            loadTree(state.theme);
            if (type === 'file') openFile(rel);
        });
    }

    // ── Tree filter ───────────────────────────────────────────────────

    $('#rt-te-tree-filter').on('input', applyTreeFilter);

    function applyTreeFilter() {
        var q = $.trim($('#rt-te-tree-filter').val()).toLowerCase();
        if (!q) { $('#rt-te-tree-wrap .rt-te-item').show(); return; }
        $('#rt-te-tree-wrap .rt-te-item').hide();
        $('#rt-te-tree-wrap .rt-te-item[data-type="file"]').each(function () {
            if ($(this).data('path').toLowerCase().indexOf(q) !== -1) {
                $(this).show();
                $(this).parents('.rt-te-item').show();
                $(this).parents('.rt-te-children').show();
            }
        });
    }

    // ── Content search ────────────────────────────────────────────────

    function runContentSearch() {
        var q = $.trim($('#rt-te-content-search').val());
        if (!q) {
            $('#rt-te-search-results').hide().empty();
            $('#rt-te-tree-wrap').show();
            $('#rt-te-search-back').hide();
            return;
        }
        $('#rt-te-tree-wrap').hide();
        $('#rt-te-search-back').show();
        $('#rt-te-search-results').show()
            .html('<p style="padding:8px 12px;color:#646970;font-size:12px;">' + rtTE.i18n.searching + '</p>');

        ajax('rt_te_search', { theme_slug: state.theme, query: q }, function (data) {
            renderSearchResults(data.results, q);
        }, function (msg) {
            $('#rt-te-search-results').html('<p style="padding:8px 12px;color:#d63638;font-size:12px;">' + escHtml(msg) + '</p>');
        });
    }

    function renderSearchResults(results, q) {
        var $wrap = $('#rt-te-search-results');
        if (!results || !results.length) {
            $wrap.html('<p style="padding:8px 12px;color:#646970;font-size:12px;">' + rtTE.i18n.noResults + '</p>');
            return;
        }
        var byFile = {}, order = [];
        $.each(results, function (i, r) {
            if (!byFile[r.path]) { byFile[r.path] = []; order.push(r.path); }
            byFile[r.path].push(r);
        });
        var $ul = $('<ul class="rt-te-search-list">');
        $.each(order, function (i, path) {
            var $li = $('<li class="rt-te-search-file">');
            $li.append($('<span class="rt-te-search-file-path">').text(path).attr('data-path', path));
            $.each(byFile[path], function (j, m) {
                var $row = $('<div class="rt-te-search-match">').attr({ 'data-path': m.path, 'data-line': m.line });
                $row.append($('<span class="rt-te-search-ln">').text(m.line));
                $row.append($('<span class="rt-te-search-text">').html(highlightInLine(m.content, q)));
                $li.append($row);
            });
            $ul.append($li);
        });
        $wrap.empty().append($ul);
    }

    $('#rt-te-content-search-btn').on('click', runContentSearch);
    $('#rt-te-content-search').on('keydown', function (e) {
        if (e.key === 'Enter') runContentSearch();
    });

    $('#rt-te-search-back').on('click', function () {
        $('#rt-te-search-results').hide().empty();
        $('#rt-te-tree-wrap').show();
        $('#rt-te-search-back').hide();
        $('#rt-te-content-search').val('');
    });

    $(document).on('click', '.rt-te-search-file-path', function () {
        state.findAfterLoad = $.trim($('#rt-te-content-search').val());
        openFile($(this).data('path'));
    });

    $(document).on('click', '.rt-te-search-match', function () {
        state.gotoLine      = parseInt($(this).data('line'), 10) || 0;
        state.findAfterLoad = $.trim($('#rt-te-content-search').val());
        openFile($(this).data('path'));
    });

    // ── CodeMirror editor ─────────────────────────────────────────────

    function detectCMMode(path) {
        var ext = (path || '').split('.').pop().toLowerCase();
        var map = {
            php: 'php', css: 'css', scss: 'css', less: 'css',
            js: 'javascript', jsx: 'javascript', ts: 'javascript',
            html: 'htmlmixed', htm: 'htmlmixed',
            xml: 'xml', svg: 'xml',
            json: { name: 'javascript', json: true }
        };
        return map[ext] || 'null';
    }

    function initEditor(path, content) {
        var mode = detectCMMode(path);

        if (!cmEditor) {
            if (!window.wp || !wp.codeEditor) {
                // Fallback: plain textarea
                $('#rt-te-textarea').val(content).prop('disabled', false).focus();
                return;
            }

            var cmBase   = (rtTE.cmSettings && rtTE.cmSettings.codemirror) ? rtTE.cmSettings.codemirror : {};
            var cmConfig = $.extend(true, {}, cmBase, {
                mode:        mode,
                lineWrapping: true,
                indentUnit:  4,
                tabSize:     4,
                lineNumbers: true,
                extraKeys:   $.extend({}, cmBase.extraKeys || {}, {
                    'Ctrl-F': function () { openFindBar(); },
                    'Cmd-F':  function () { openFindBar(); },
                    'Ctrl-S': function () { $('#rt-te-save').trigger('click'); },
                    'Cmd-S':  function () { $('#rt-te-save').trigger('click'); },
                    'Esc':    function (cm) {
                        if ($('#rt-te-find-bar').is(':visible')) { closeFindBar(); }
                    }
                })
            });

            var instance = wp.codeEditor.initialize(
                document.getElementById('rt-te-textarea'),
                { codemirror: cmConfig }
            );
            cmEditor = instance.codemirror;

            cmEditor.on('change', function () {
                if (!state.file) return;
                state.changed = true;
                $('#rt-te-save-status').text('');
                clearFindMarks();
            });
        } else {
            cmEditor.setOption('mode', mode);
        }

        cmEditor.setValue(content);
        cmEditor.clearHistory();
        cmEditor.setOption('readOnly', false);
        cmEditor.focus();
        cmEditor.refresh();
    }

    function openFile(path) {
        if (state.changed && !confirm(rtTE.i18n.unsaved)) return;

        clearFindMarks();
        state.file    = path;
        state.changed = false;

        $('#rt-te-empty').hide();
        $('#rt-te-copy-panel').hide();
        $('#rt-te-editor-area').css('display', 'flex').show();
        $('#rt-te-file-path').text(path);
        $('#rt-te-save-status').text('');

        if (cmEditor) cmEditor.setOption('readOnly', true);

        $('.rt-te-item').removeClass('rt-te-active');
        $('[data-path="' + escAttr(path) + '"]').addClass('rt-te-active');

        ajax('rt_te_read', { theme_slug: state.theme, path: path }, function (data) {
            initEditor(path, data.content);

            if (state.findAfterLoad) {
                var q = state.findAfterLoad;
                state.findAfterLoad = '';
                $('#rt-te-find-input').val(q);
                $('#rt-te-find-bar').show();
                findQuery = q;
                runFind();

                if (state.gotoLine > 0 && findMatches.length) {
                    var targetLine = state.gotoLine - 1;
                    var best = 0;
                    for (var i = 0; i < findMatches.length; i++) {
                        if (findMatches[i].from.line >= targetLine) { best = i; break; }
                        best = i;
                    }
                    jumpToMatch(best);
                    state.gotoLine = 0;
                }
            } else if (state.gotoLine > 0) {
                cmEditor.setCursor(state.gotoLine - 1, 0);
                cmEditor.scrollIntoView({ line: state.gotoLine - 1, ch: 0 }, 80);
                state.gotoLine = 0;
            } else if ($('#rt-te-find-bar').is(':visible') && findQuery) {
                runFind();
            }
        });
    }

    function closeEditor() {
        state.file    = '';
        state.changed = false;
        clearFindMarks();
        if (cmEditor) {
            cmEditor.setValue('');
            cmEditor.clearHistory();
        }
        closeFindBar();
        findQuery   = '';
        findMatches = [];
        findIdx     = 0;
        $('#rt-te-find-count').text('');
        $('#rt-te-editor-area').hide();
        $('#rt-te-empty').show();
        $('.rt-te-item').removeClass('rt-te-active');
    }

    $('#rt-te-save').on('click', function () {
        if (!state.file) return;
        var content = cmEditor ? cmEditor.getValue() : $('#rt-te-textarea').val();
        var $btn = $(this).prop('disabled', true);
        ajax('rt_te_save',
            { theme_slug: state.theme, path: state.file, content: content },
            function () {
                state.changed = false;
                $btn.prop('disabled', false);
                $('#rt-te-save-status').text(rtTE.i18n.saved).css('color', '#00a32a');
                setTimeout(function () { $('#rt-te-save-status').text(''); }, 3000);
            },
            function (msg) {
                $btn.prop('disabled', false);
                $('#rt-te-save-status').text(msg).css('color', '#d63638');
            }
        );
    });

    $('#rt-te-toolbar-rename').on('click', function () {
        $('[data-path="' + escAttr(state.file) + '"] .rt-te-act-rename').trigger('click');
    });

    $('#rt-te-toolbar-delete').on('click', function () {
        $('[data-path="' + escAttr(state.file) + '"] .rt-te-act-delete').trigger('click');
    });

    // ── In-file find ──────────────────────────────────────────────────

    function openFindBar() {
        $('#rt-te-find-bar').show();
        $('#rt-te-find-input').focus().select();
        if (findQuery) runFind();
    }

    function closeFindBar() {
        $('#rt-te-find-bar').hide();
        clearFindMarks();
        if (cmEditor) cmEditor.focus();
    }

    function clearFindMarks() {
        $.each(findMarks, function (i, m) { try { m.clear(); } catch (e) {} });
        findMarks   = [];
        findMatches = [];
        findIdx     = 0;
        $('#rt-te-find-count').text('');
    }

    function runFind() {
        clearFindMarks();
        if (!findQuery || !cmEditor) return;

        var cursor = cmEditor.getSearchCursor(findQuery, { line: 0, ch: 0 }, { caseFold: true });
        while (cursor.findNext()) {
            findMatches.push({ from: cursor.from(), to: cursor.to() });
        }

        if (!findMatches.length) {
            $('#rt-te-find-count').text('0');
            return;
        }

        $.each(findMatches, function (i, m) {
            var mark = cmEditor.markText(m.from, m.to, { className: 'rt-te-find-match', clearWhenEmpty: false });
            findMarks.push(mark);
        });

        jumpToMatch(0);
    }

    function jumpToMatch(idx) {
        if (!findMatches.length || !cmEditor) return;
        findIdx = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
        var match = findMatches[findIdx];
        cmEditor.setSelection(match.from, match.to);
        cmEditor.scrollIntoView({ from: match.from, to: match.to }, 60);
        $('#rt-te-find-count').text((findIdx + 1) + ' / ' + findMatches.length);
        setTimeout(function () { $('#rt-te-find-input').focus(); }, 0);
    }

    $('#rt-te-find-input').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            var q = $(this).val();
            if (q !== findQuery) { findQuery = q; runFind(); }
            else { jumpToMatch(e.shiftKey ? findIdx - 1 : findIdx + 1); }
        }
        if (e.key === 'Escape') { closeFindBar(); }
    });
    $('#rt-te-find-next').on('click', function () {
        if (!findMatches.length) { findQuery = $('#rt-te-find-input').val(); runFind(); }
        else jumpToMatch(findIdx + 1);
    });
    $('#rt-te-find-prev').on('click', function () {
        if (!findMatches.length) { findQuery = $('#rt-te-find-input').val(); runFind(); }
        else jumpToMatch(findIdx - 1);
    });
    $('#rt-te-find-close').on('click', function () { closeFindBar(); });

    // ── Copy panel ────────────────────────────────────────────────────

    $('#rt-te-copy-btn').on('click', function () {
        if (!state.file) return;
        $('#rt-te-copy-path').val(state.file);
        $('#rt-te-copy-panel').toggle();
    });

    $('#rt-te-copy-cancel').on('click', function () { $('#rt-te-copy-panel').hide(); });

    $('#rt-te-copy-confirm').on('click', function () {
        var destSlug = $('#rt-te-copy-theme').val();
        var destPath = $.trim($('#rt-te-copy-path').val());
        if (!destPath) { alert(rtTE.i18n.enterDestPath); return; }

        var $btn = $(this).prop('disabled', true);
        ajax('rt_te_copy',
            { src_slug: state.theme, src_path: state.file, dest_slug: destSlug, dest_path: destPath },
            function () {
                $btn.prop('disabled', false);
                $('#rt-te-copy-panel').hide();
                alert(rtTE.i18n.copyOk);
                if (destSlug === state.theme) loadTree(state.theme);
            },
            function (msg) { $btn.prop('disabled', false); alert(msg); }
        );
    });

    // ── Theme switch ──────────────────────────────────────────────────

    $('#rt-te-theme-select').on('change', function () {
        if (state.changed && !confirm(rtTE.i18n.unsaved)) {
            $(this).val(state.theme);
            return;
        }
        closeEditor();
        $('#rt-te-search-results').hide().empty();
        $('#rt-te-tree-wrap').show();
        $('#rt-te-search-back').hide();
        $('#rt-te-content-search').val('');
        $('#rt-te-tree-filter').val('');
        loadTree($(this).val());
    });

    // ── Utility ───────────────────────────────────────────────────────

    function escAttr(str) { return str.replace(/"/g, '\\"'); }
    function escHtml(str) { return $('<div>').text(str).html(); }

    function highlightInLine(text, query) {
        if (!query) return escHtml(text);
        var result = '', lower = text.toLowerCase(), lq = query.toLowerCase();
        var qLen = query.length, last = 0, idx;
        while ((idx = lower.indexOf(lq, last)) !== -1) {
            result += escHtml(text.substring(last, idx));
            result += '<mark>' + escHtml(text.substring(idx, idx + qLen)) + '</mark>';
            last = idx + qLen;
        }
        return result + escHtml(text.substring(last));
    }

    init();
});
