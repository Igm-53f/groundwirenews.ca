/* global rtRegen, jQuery */
jQuery(function ($) {
    'use strict';

    var total   = 0;
    var running = false;

    // ── Scan on load ──────────────────────────────────────────────

    function scan() {
        $.post(rtRegen.ajaxUrl, { action: 'rt_regen_scan', nonce: rtRegen.nonce }, function (resp) {
            if (!resp.success) return;
            total = resp.data.total;
            if (total === 0) {
                $('#rt-regen-status').text('В медиабиблиотеке не найдено картинок.');
            } else {
                $('#rt-regen-status').text('Найдено картинок для регенерации: ' + total + '.');
                $('#rt-regen-btn-start').prop('disabled', false);
            }
        });
    }

    // ── Batch loop ────────────────────────────────────────────────

    function runBatch(offset, totalProcessed) {
        $.post(rtRegen.ajaxUrl, {
            action: 'rt_regen_batch',
            nonce:  rtRegen.nonce,
            offset: offset
        }, function (resp) {
            if (!resp.success) {
                stopRegen('Server error. Please try again.');
                return;
            }
            var d          = resp.data;
            var newTotal   = totalProcessed + d.processed + d.skipped;
            updateProgress(newTotal, d.total);

            if (d.done) {
                stopRegen(null);
                $('#rt-regen-done-msg').show();
                setTimeout(function () { $('#rt-regen-done-msg').fadeOut(); }, 4000);
                $('#rt-regen-status').text('Готово. Обработано ' + newTotal + ' / ' + d.total + ' картинок.');
            } else {
                runBatch(d.next_offset, newTotal);
            }
        }).fail(function () {
            stopRegen('Request failed. Please try again.');
        });
    }

    function updateProgress(processed, tot) {
        var pct = tot > 0 ? Math.round((processed / tot) * 100) : 100;
        $('#rt-regen-progress-bar').css('width', pct + '%');
        $('#rt-regen-progress-label').text(processed + ' / ' + tot + ' (' + pct + '%)');
    }

    function stopRegen(errorMsg) {
        running = false;
        $('#rt-regen-spinner').hide();
        $('#rt-regen-btn-start').prop('disabled', false).text('Перегенерировать всё');
        if (errorMsg) {
            $('#rt-regen-status').text(errorMsg);
        }
    }

    $('#rt-regen-btn-start').on('click', function () {
        if (running) return;
        running = true;
        $(this).prop('disabled', true).text('Регенерируем…');
        $('#rt-regen-spinner').show();
        $('#rt-regen-progress-wrap').show();
        $('#rt-regen-done-msg').hide();
        updateProgress(0, total);
        runBatch(0, 0);
    });

    // ── Custom sizes toggle ──────────────────────────────────────

    $('#rt-regen-sizes-toggle').on('click', function () {
        var $btn    = $(this);
        var enabled = !$btn.hasClass('is-on');
        $btn.toggleClass('is-on', enabled).attr('aria-checked', String(enabled));
        $('#rt-regen-sizes-saved').hide();

        $.post(rtRegen.ajaxUrl, {
            action:       'rt_regen_save',
            nonce:        rtRegen.nonce,
            custom_sizes: enabled ? 1 : 0
        }, function (resp) {
            if (resp.success) {
                if (enabled) {
                    $('#rt-regen-sizes-saved').show();
                }
            }
        });
    });

    // ── Init ──────────────────────────────────────────────────────

    scan();
});
