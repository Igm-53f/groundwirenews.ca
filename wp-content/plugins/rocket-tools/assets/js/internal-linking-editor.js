(function ($) {
    'use strict';

    var ajaxUrl = rtIlEditor.ajaxUrl;
    var nonce   = rtIlEditor.nonce;
    var object  = rtIlEditor.object;
    var id      = rtIlEditor.id;

    // "+ Add Anchor": append one more input row before the button paragraph.
    $(document).on('click', '.rt-il-add', function () {
        var $box = $(this).closest('.rt-il-anchors');
        var n    = $box.find('.rt-il-row').length + 1;
        var $row = $(
            '<p class="rt-il-row"><label>Анкор ' + n + ' </label>' +
            '<input type="text" name="rt_il_anchors[]" value="" class="rt-il-input regular-text" autocomplete="off" />' +
            '<span class="rt-il-msg" style="margin-left:8px;"></span></p>'
        );
        $(this).parent().before($row);
        $row.find('.rt-il-input').trigger('focus');
    });

    // Duplicate check on blur: an anchor may belong to exactly one target site-wide.
    $(document).on('blur', '.rt-il-input', function () {
        var $input = $(this);
        var $msg   = $input.siblings('.rt-il-msg');
        var value  = $input.val().trim();

        $msg.text('');
        $input.css('border-color', '');
        if (value.length < 4) {
            return;
        }
        $.post(ajaxUrl, {
            action: 'rt_il_check',
            nonce:  nonce,
            anchor: $input.val(),
            object: object,
            id:     id
        }).done(function (res) {
            if (res && res.success && res.data && res.data.taken) {
                $input.css('border-color', '#d63638');
                $msg.css('color', '#d63638').text('Уже используется: ' + res.data.owner);
            }
        });
    });

}(jQuery));
