(function ($) {
    'use strict';

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Delete user
    $(document).on('click', '.rt-delete-user', function () {
        var $btn      = $(this);
        var userId    = $btn.data('user-id');
        var userLogin = $btn.data('user-login');
        var $row      = $btn.closest('tr');

        if (!confirm('Удалить "' + userLogin + '" (ID: ' + userId + ') со всеми данными безвозвратно?\n\nОтменить будет нельзя.')) {
            return;
        }

        $btn.prop('disabled', true).text('Удаляем…');

        $.post(rtData.ajaxUrl, {
            action:  'rt_delete_user',
            nonce:   rtData.nonce,
            user_id: userId,
        })
        .done(function (res) {
            if (res.success) {
                $row.fadeOut(300, function () { $(this).remove(); });
            } else {
                alert('Ошибка: ' + (res.data && res.data.message ? res.data.message : 'Неизвестная ошибка.'));
                $btn.prop('disabled', false).text('Удалить');
            }
        })
        .fail(function () {
            alert('Запрос не прошёл. Попробуйте ещё раз.');
            $btn.prop('disabled', false).text('Удалить');
        });
    });

    // Backdoor scan
    $('#rt-scan-backdoor').on('click', function () {
        var $btn     = $(this);
        var $results = $('#rt-scan-results');

        $btn.prop('disabled', true).text('Сканируем…');
        $results.html('<p>Сканируем…</p>');

        $.post(rtData.ajaxUrl, {
            action: 'rt_scan_backdoor',
            nonce:  rtData.nonce,
        })
        .done(function (res) {
            if (!res.success) {
                $results.html('<div class="rt-notice rt-notice-error"><p>' + escHtml(res.data && res.data.message ? res.data.message : 'Сканирование не удалось.') + '</p></div>');
                return;
            }

            var sections      = res.data.sections;
            var totalScanned  = res.data.total_scanned || 0;

            if (!Array.isArray(sections)) {
                $results.html('<div class="rt-notice rt-notice-error"><p>Неожиданный ответ сервера.</p></div>');
                return;
            }

            var total = 0;
            $.each(sections, function (i, s) {
                $.each(s.items, function (j, item) { total += item.findings.length; });
            });

            if (total === 0) {
                $results.html(
                    '<div class="rt-notice rt-notice-success"><p>✓ Подозрительных конструкций не найдено. Проверено файлов: ' +
                    totalScanned + ' — всё чисто.</p></div>'
                );
                return;
            }

            var multiSection = sections.length > 1;
            var html = '<div class="rt-notice rt-notice-error">'
                     + '<p><strong>⚠ Найдено подозрительных мест: ' + total + ' — проверено файлов: '
                     + totalScanned + '</strong></p>';

            $.each(sections, function (i, section) {
                var sectionTotal = 0;
                $.each(section.items, function (j, item) { sectionTotal += item.findings.length; });
                if (sectionTotal === 0) return;

                if (multiSection) {
                    html += '<p style="margin:14px 0 6px; font-weight:700; font-size:13px; border-top:1px solid rgba(255,255,255,.25); padding-top:10px;">'
                          + escHtml(section.label) + '</p>';
                }

                $.each(section.items, function (j, item) {
                    html += '<p style="margin:10px 0 4px; font-weight:600; color:#dba617; font-family:monospace; font-size:12px;">'
                          + '📄 ' + escHtml(item.file) + '</p>';
                    $.each(item.findings, function (k, f) {
                        var label = f.pattern.replace(/_/g, ' ');
                        html += '<div class="rt-finding">'
                              + '<span class="rt-line-badge">Строка ' + escHtml(f.line) + '</span>'
                              + '<span class="rt-pattern-label">' + escHtml(label) + '</span>'
                              + '<pre>' + escHtml(f.code) + '</pre>'
                              + '</div>';
                    });
                });
            });

            html += '</div>';
            $results.html(html);
        })
        .fail(function () {
            $results.html('<div class="rt-notice rt-notice-error"><p>Запрос не прошёл. Попробуйте ещё раз.</p></div>');
        })
        .always(function () {
            $btn.prop('disabled', false).text('Запустить проверку');
        });
    });

}(jQuery));
