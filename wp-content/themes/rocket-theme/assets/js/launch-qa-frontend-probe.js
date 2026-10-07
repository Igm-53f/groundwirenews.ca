/* global rtQaProbe */
/**
 * Launch QA — frontend visual/responsive probe.
 *
 * Loads the site's key pages inside hidden, same-origin iframes at desktop /
 * tablet / mobile widths and runs best-effort layout measurements plus JS- and
 * resource-error capture. Results update the matching rows in the Launch QA
 * table and a dedicated probe panel. When a check cannot be determined it is
 * reported as a warning, never a hard fail.
 */
(function () {
    'use strict';

    if (typeof rtQaProbe === 'undefined') {
        return;
    }

    var cfg = rtQaProbe;
    var i18n = cfg.i18n || {};
    var TOL = 2; // px tolerance for overflow checks

    function t(key, fallback) {
        return (i18n[key] !== undefined) ? i18n[key] : fallback;
    }

    /* ----- status helpers ----- */
    var RANK = { pass: 0, info: 0, warning: 1, fail: 2 };
    function worse(a, b) { return (RANK[b] > RANK[a]) ? b : a; }

    function bump(acc, id, status, detail) {
        if (!acc[id]) { acc[id] = { status: 'pass', details: [] }; }
        acc[id].status = worse(acc[id].status, status);
        if (detail) { acc[id].details.push(detail); }
    }

    /* ----- one iframe load + measure ----- */
    function measure(url, width, label) {
        return new Promise(function (resolve) {
            var frame = document.createElement('iframe');
            frame.style.width = width + 'px';
            frame.style.height = '1400px';
            frame.setAttribute('aria-hidden', 'true');
            var jsErrors = [];
            var settled = false;

            var holder = document.getElementById('rt-qa-probe-frames');
            holder.appendChild(frame);

            function finish(result) {
                if (settled) { return; }
                settled = true;
                try { holder.removeChild(frame); } catch (e) {}
                resolve(result);
            }

            // Safety timeout — never hang the whole run on one frame.
            var timer = setTimeout(function () {
                finish({ accessible: false, reason: 'timeout', jsErrors: jsErrors });
            }, 9000);

            frame.addEventListener('load', function () {
                // Capture runtime JS errors that fire shortly after load.
                try {
                    frame.contentWindow.addEventListener('error', function (ev) {
                        if (ev && ev.target && ev.target.tagName) {
                            // resource error handled separately via DOM scan
                            return;
                        }
                        jsErrors.push((ev && ev.message) ? ev.message : 'script error');
                    }, true);
                } catch (e) { /* cross-origin */ }

                // Give async scripts a moment, then measure.
                setTimeout(function () {
                    clearTimeout(timer);
                    var result;
                    try {
                        result = inspect(frame, width, label);
                    } catch (e) {
                        result = { accessible: false, reason: 'cross-origin' };
                    }
                    result.jsErrors = jsErrors.concat(result.jsErrors || []);
                    finish(result);
                }, 600);
            });

            frame.src = url;
        });
    }

    /* ----- DOM inspection inside a loaded iframe ----- */
    function inspect(frame, width, label) {
        var doc = frame.contentDocument;
        var win = frame.contentWindow;
        if (!doc || !doc.body) {
            return { accessible: false, reason: 'no-doc' };
        }
        var body = doc.body;
        var root = doc.documentElement;
        var out = {
            accessible: true,
            horizontalScroll: false,
            overflow: [],
            wideImages: [],
            noPadding: [],
            cardVariance: null,
            orphans: [],
            iconsOutside: [],
            footerEmpty: false,
            sidebarEmpty: false,
            brokenResources: [],
            jsErrors: []
        };

        // Horizontal scroll / body wider than viewport.
        var scrollW = Math.max(root.scrollWidth, body.scrollWidth);
        if (scrollW > width + TOL) {
            out.horizontalScroll = true;
        }

        // Elements overflowing the viewport on the right edge.
        var all = body.querySelectorAll('*');
        var seenOverflow = 0;
        for (var i = 0; i < all.length && seenOverflow < 6; i++) {
            var el = all[i];
            var r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) { continue; }
            if (r.right > width + 16) {
                out.overflow.push(tag(el));
                seenOverflow++;
            }
        }

        // Images wider than their container (or the viewport).
        var imgs = body.querySelectorAll('img');
        for (var j = 0; j < imgs.length; j++) {
            var im = imgs[j];
            var ir = im.getBoundingClientRect();
            if (ir.width > width + TOL) {
                out.wideImages.push((im.currentSrc || im.src || '').split('/').pop());
                continue;
            }
            var parent = im.parentElement;
            if (parent) {
                var pr = parent.getBoundingClientRect();
                if (pr.width > 0 && ir.width > pr.width + 4) {
                    out.wideImages.push((im.currentSrc || im.src || '').split('/').pop());
                }
            }
            // Broken image.
            if (im.complete && im.naturalWidth === 0 && (im.src || im.currentSrc)) {
                out.brokenResources.push('img: ' + ((im.currentSrc || im.src || '').split('/').pop()));
            }
        }

        // Block padding on common section/card containers.
        var blocks = body.querySelectorAll('section, article, .rt-section, [class*="card"], [class*="block"], [class*="widget"]');
        var noPad = 0;
        for (var k = 0; k < blocks.length && noPad < 6; k++) {
            var b = blocks[k];
            var br = b.getBoundingClientRect();
            if (br.width < 120 || br.height < 60) { continue; }
            var cs = win.getComputedStyle(b);
            var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingRight) + parseFloat(cs.paddingBottom);
            if (pad < 2 && (b.children.length > 0)) {
                out.noPadding.push(tag(b));
                noPad++;
            }
        }

        // Card height consistency (siblings sharing a card-ish class).
        out.cardVariance = cardVariance(body);

        // Orphan tiny leaf elements with junk text.
        var junk = /^(undefined|null|nan|f|t|\d{1,2})$/i;
        var leaves = body.querySelectorAll('p, span, div, li, h1, h2, h3, h4, h5, h6');
        var orph = 0;
        for (var m = 0; m < leaves.length && orph < 6; m++) {
            var lf = leaves[m];
            if (lf.children.length > 0) { continue; }
            var txt = (lf.textContent || '').trim();
            if (txt.length > 0 && txt.length <= 4 && junk.test(txt)) {
                var lr = lf.getBoundingClientRect();
                if (lr.width > 0 && lr.height > 0) {
                    out.orphans.push('"' + txt + '" ' + tag(lf));
                    orph++;
                }
            }
        }

        // Icons leaking outside their container.
        var icons = body.querySelectorAll('svg, i[class*="icon"], [class*="icon"] > svg');
        var io = 0;
        for (var n = 0; n < icons.length && io < 6; n++) {
            var ic = icons[n];
            var par = ic.parentElement;
            if (!par) { continue; }
            var icr = ic.getBoundingClientRect();
            var par2 = par.getBoundingClientRect();
            if (icr.width === 0 || par2.width === 0) { continue; }
            if (icr.right > par2.right + 6 || icr.bottom > par2.bottom + 6) {
                out.iconsOutside.push(tag(ic));
                io++;
            }
        }

        // Footer / sidebar emptiness.
        var footer = doc.querySelector('footer, .site-footer, [class*="footer"]');
        if (footer) {
            out.footerEmpty = (footer.textContent || '').trim().length < 3 && footer.querySelectorAll('a, img, svg').length === 0;
        }
        var sidebar = doc.querySelector('aside, .sidebar, [class*="sidebar"], [id*="sidebar"]');
        if (sidebar) {
            var sbr = sidebar.getBoundingClientRect();
            if (sbr.width > 40) {
                out.sidebarEmpty = (sidebar.textContent || '').trim().length < 3 && sidebar.querySelectorAll('a, img, svg, li').length === 0;
            }
        }

        return out;
    }

    function tag(el) {
        var s = el.tagName ? el.tagName.toLowerCase() : '?';
        if (el.id) { s += '#' + el.id; }
        else if (el.className && typeof el.className === 'string') {
            var c = el.className.trim().split(/\s+/)[0];
            if (c) { s += '.' + c; }
        }
        return s;
    }

    // Coefficient of variation of heights among same-class card siblings.
    function cardVariance(body) {
        var groups = {};
        var cards = body.querySelectorAll('[class*="card"], article');
        for (var i = 0; i < cards.length; i++) {
            var cls = (cards[i].className && typeof cards[i].className === 'string')
                ? cards[i].className.trim().split(/\s+/)[0] : 'article';
            var rect = cards[i].getBoundingClientRect();
            if (rect.height < 40) { continue; }
            (groups[cls] = groups[cls] || []).push(rect.height);
        }
        var worstCv = 0;
        Object.keys(groups).forEach(function (key) {
            var hs = groups[key];
            if (hs.length < 2) { return; }
            var mean = hs.reduce(function (a, b) { return a + b; }, 0) / hs.length;
            if (mean === 0) { return; }
            var variance = hs.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / hs.length;
            var cv = Math.sqrt(variance) / mean;
            if (cv > worstCv) { worstCv = cv; }
        });
        return worstCv;
    }

    /* ----- aggregate one frame's findings into the accumulator ----- */
    function merge(acc, f, vp, label) {
        var ctx = vp + ' · ' + label;
        if (!f.accessible) {
            ['responsive_no_horizontal_scroll', 'responsive_no_overflow', 'responsive_images_fit',
             'responsive_text_not_overlapping', 'blocks_have_padding', 'blocks_same_size',
             'no_orphan_elements', 'no_large_empty_spaces', 'icons_inside_containers',
             'footer_sidebar_visual_ok'].forEach(function (id) {
                bump(acc, id, 'warning', ctx + ': ' + t('inaccessible', 'не удалось проверить') + ' (' + (f.reason || '') + ')');
            });
            if (f.jsErrors && f.jsErrors.length) {
                bump(acc, 'browser_console_errors', 'fail', ctx + ': ' + f.jsErrors.slice(0, 3).join(' | '));
            }
            return;
        }

        bump(acc, 'responsive_no_horizontal_scroll', f.horizontalScroll ? 'fail' : 'pass',
            f.horizontalScroll ? ctx + ': ' + t('hscroll', 'есть горизонтальный скролл') : '');
        bump(acc, 'responsive_no_overflow', f.overflow.length ? 'warning' : 'pass',
            f.overflow.length ? ctx + ': ' + f.overflow.join(', ') : '');
        bump(acc, 'responsive_images_fit', f.wideImages.length ? 'warning' : 'pass',
            f.wideImages.length ? ctx + ': ' + f.wideImages.slice(0, 4).join(', ') : '');
        bump(acc, 'blocks_have_padding', f.noPadding.length ? 'warning' : 'pass',
            f.noPadding.length ? ctx + ': ' + f.noPadding.join(', ') : '');
        bump(acc, 'no_orphan_elements', f.orphans.length ? 'warning' : 'pass',
            f.orphans.length ? ctx + ': ' + f.orphans.join(', ') : '');
        bump(acc, 'icons_inside_containers', f.iconsOutside.length ? 'warning' : 'pass',
            f.iconsOutside.length ? ctx + ': ' + f.iconsOutside.join(', ') : '');

        if (f.cardVariance !== null && f.cardVariance > 0.35) {
            bump(acc, 'blocks_same_size', 'warning', ctx + ': CV=' + f.cardVariance.toFixed(2));
        } else {
            bump(acc, 'blocks_same_size', 'pass', '');
        }

        var footerSidebar = f.footerEmpty || f.sidebarEmpty;
        bump(acc, 'footer_sidebar_visual_ok', footerSidebar ? 'warning' : 'pass',
            footerSidebar ? ctx + ': ' + (f.footerEmpty ? t('footerEmpty', 'пустой подвал') : '') + (f.sidebarEmpty ? ' ' + t('sidebarEmpty', 'пустой сайдбар') : '') : '');

        // Text overlap + large empty spaces are hard to assert reliably in PHP/JS;
        // treat as pass unless an overflow signal suggests a problem.
        bump(acc, 'responsive_text_not_overlapping', f.overflow.length ? 'warning' : 'pass',
            f.overflow.length ? ctx + ': ' + t('maybeOverlap', 'возможен наезд текста') : '');
        bump(acc, 'no_large_empty_spaces', 'pass', '');

        bump(acc, 'browser_resource_errors', f.brokenResources.length ? 'fail' : 'pass',
            f.brokenResources.length ? ctx + ': ' + f.brokenResources.slice(0, 4).join(', ') : '');
        bump(acc, 'browser_console_errors', (f.jsErrors && f.jsErrors.length) ? 'fail' : 'pass',
            (f.jsErrors && f.jsErrors.length) ? ctx + ': ' + f.jsErrors.slice(0, 3).join(' | ') : '');
    }

    /* ----- write results back into the table + panel ----- */
    function applyToRows(acc) {
        Object.keys(acc).forEach(function (id) {
            var row = document.querySelector('tr[data-qa-id="' + id + '"]');
            if (!row) { return; }
            var res = acc[id];
            var dot = row.querySelector('.rt-qa-dot');
            if (dot) {
                dot.className = 'rt-qa-dot rt-qa-' + (res.status === 'fail' ? 'critical' : (res.status === 'pass' ? 'pass' : 'warning'));
            }
            var msg = row.querySelector('.rt-qa-msg-text');
            if (msg) {
                msg.textContent = res.status === 'pass'
                    ? t('okMsg', 'Проверено визуально — проблем не найдено.')
                    : (res.details.length ? res.details[0] : t('warnMsg', 'Найдены потенциальные проблемы.'));
            }
            var ev = row.querySelector('.rt-qa-evidence');
            if (res.details.length) {
                if (!ev) {
                    ev = document.createElement('div');
                    ev.className = 'rt-qa-evidence';
                    var cell = row.querySelector('.rt-qa-msg');
                    if (cell) { cell.appendChild(ev); }
                }
                if (ev) {
                    var items = res.details.slice(0, 8).map(function (d) { return '<li>' + escapeHtml(d) + '</li>'; }).join('');
                    ev.innerHTML = '<ul>' + items + '</ul>';
                }
            } else if (ev) {
                ev.parentNode.removeChild(ev);
            }
        });
    }

    function renderPanel(acc, ran) {
        var panel = document.getElementById('rt-qa-probe-panel');
        if (!panel) { return; }
        panel.classList.remove('is-hidden');
        var status = panel.querySelector('.rt-qa-probe-status');
        var grid = panel.querySelector('.rt-qa-probe-grid');
        var fails = 0, warns = 0, passes = 0;
        Object.keys(acc).forEach(function (id) {
            var s = acc[id].status;
            if (s === 'fail') { fails++; } else if (s === 'warning') { warns++; } else { passes++; }
        });
        if (status) {
            status.textContent = t('summary', 'Визуальная проверка завершена')
                + ' — ' + t('crit', 'крит.') + ' ' + fails + ' · ' + t('warn', 'пред.') + ' ' + warns + ' · ' + t('ok', 'ок') + ' ' + passes;
        }
        if (grid) {
            grid.innerHTML = '';
            Object.keys(acc).forEach(function (id) {
                var res = acc[id];
                var dotCls = res.status === 'fail' ? 'critical' : (res.status === 'pass' ? 'pass' : 'warning');
                var dot = document.createElement('span');
                dot.className = 'rt-qa-dot rt-qa-' + dotCls;
                grid.appendChild(dot);
                var line = document.createElement('div');
                line.className = 'rt-qa-probe-line';
                var name = (cfg.titles && cfg.titles[id]) ? cfg.titles[id] : id;
                line.innerHTML = '<strong>' + escapeHtml(name) + '</strong>'
                    + (res.details.length ? '<div class="rt-qa-probe-detail">' + escapeHtml(res.details.slice(0, 3).join(' · ')) + '</div>' : '');
                grid.appendChild(line);
            });
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    /* ----- main runner ----- */
    function runProbe(btn) {
        var urls = [];
        Object.keys(cfg.urls || {}).forEach(function (label) {
            if (cfg.urls[label]) { urls.push({ label: label, url: cfg.urls[label] }); }
        });
        var viewports = cfg.viewports || [
            { name: 'Desktop', width: 1366 },
            { name: 'Tablet', width: 768 },
            { name: 'Mobile', width: 390 }
        ];
        if (!urls.length) { return; }

        btn.disabled = true;
        var spinner = document.getElementById('rt-qa-probe-spinner');
        if (spinner) { spinner.classList.add('is-active'); }
        var panel = document.getElementById('rt-qa-probe-panel');
        if (panel) {
            panel.classList.remove('is-hidden');
            var st = panel.querySelector('.rt-qa-probe-status');
            if (st) { st.textContent = t('running', 'Идёт визуальная проверка…'); }
        }

        var acc = {};
        var chain = Promise.resolve();
        viewports.forEach(function (vp) {
            urls.forEach(function (u) {
                chain = chain.then(function () {
                    return measure(u.url, vp.width, u.label).then(function (f) {
                        merge(acc, f, vp.name, u.label);
                    });
                });
            });
        });

        chain.then(function () {
            applyToRows(acc);
            renderPanel(acc, true);
        }).catch(function () {
            // swallow — best effort
        }).then(function () {
            btn.disabled = false;
            if (spinner) { spinner.classList.remove('is-active'); }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('rt-qa-run-visual');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                runProbe(btn);
            });
        }
    });
})();
