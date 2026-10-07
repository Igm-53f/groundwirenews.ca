/* global rtSettings, jQuery */
jQuery(function ($) {
    'use strict';

    $(document).on('click', '.rt-settings-toggle', function () {
        var $btn = $(this);
        var key  = $btn.data('key');

        $btn.prop('disabled', true);

        $.post(rtSettings.ajaxUrl, {
            action: 'rt_settings_toggle',
            nonce:  rtSettings.nonce,
            key:    key
        }, function (resp) {
            if (resp.success) {
                var enabled = resp.data.enabled;
                $btn.toggleClass('is-on', enabled).attr('aria-checked', String(enabled));
            } else {
                alert('Ошибка: ' + (resp.data && resp.data.message ? resp.data.message : 'Неизвестная ошибка'));
            }
        }).fail(function () {
            alert('Запрос не прошёл. Попробуйте ещё раз.');
        }).always(function () {
            $btn.prop('disabled', false);
        });
    });

    var saveTimers = {};
    $(document).on('input', '.rt-settings-text-input', function () {
        var $input = $(this);
        var key    = $input.data('key');

        clearTimeout(saveTimers[key]);
        saveTimers[key] = setTimeout(function () {
            $.post(rtSettings.ajaxUrl, {
                action: 'rt_settings_save',
                nonce:  rtSettings.nonce,
                key:    key,
                value:  $input.val()
            }).fail(function () {
                alert('Не удалось сохранить. Попробуйте ещё раз.');
            });
        }, 600);
    });
});
