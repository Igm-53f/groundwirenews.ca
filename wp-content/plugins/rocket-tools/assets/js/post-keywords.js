(function ($) {
    'use strict';

    var ajaxUrl = rtPkData.ajaxUrl;
    var nonce   = rtPkData.nonce;

    function showMessage(msg, isError) {
        var cls = isError ? 'rt-notice rt-notice-error' : 'rt-notice rt-notice-success';
        $('#rt-pk-message').html('<div class="' + cls + '"><p>' + msg + '</p></div>');
        setTimeout(function () { $('#rt-pk-message').html(''); }, 3000);
    }

    function humanizeSlug(slug) {
        return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    // Toggle on/off — optimistic update, revert on failure
    $(document).on('click', '.rt-pk-toggle', function () {
        var $btn  = $(this);
        var slug  = $btn.closest('.rt-pk-row').data('slug');
        var wasOn = $btn.hasClass('is-on');

        $btn.toggleClass('is-on').attr('aria-checked', String(!wasOn));

        $.post(ajaxUrl, { action: 'rt_pk_toggle', nonce: nonce, slug: slug })
            .done(function (res) {
                if (!res.success) {
                    $btn.toggleClass('is-on', wasOn).attr('aria-checked', String(wasOn));
                    showMessage(res.data && res.data.message ? res.data.message : 'Error.', true);
                }
            })
            .fail(function () {
                $btn.toggleClass('is-on', wasOn).attr('aria-checked', String(wasOn));
                showMessage('Request failed. Please try again.', true);
            });
    });

    // Remove row
    $(document).on('click', '.rt-pk-remove', function () {
        var $row = $(this).closest('.rt-pk-row');
        var slug = $row.data('slug');

        if (!confirm('Убрать "' + slug + '" из списка?')) return;

        $.post(ajaxUrl, { action: 'rt_pk_remove', nonce: nonce, slug: slug })
            .done(function (res) {
                if (res.success) {
                    $row.fadeOut(200, function () { $(this).remove(); });
                } else {
                    showMessage(res.data && res.data.message ? res.data.message : 'Error.', true);
                }
            })
            .fail(function () {
                showMessage('Request failed. Please try again.', true);
            });
    });

    // Show add form
    $('#rt-pk-add-btn').on('click', function () {
        $(this).hide();
        $('#rt-pk-add-form').show();
        $('#rt-pk-slug-input').trigger('focus');
    });

    // Cancel add
    $('#rt-pk-cancel-add').on('click', function (e) {
        e.preventDefault();
        $('#rt-pk-add-form').hide();
        $('#rt-pk-slug-input').val('');
        $('#rt-pk-add-btn').show();
    });

    // Confirm add
    $('#rt-pk-confirm-add').on('click', function () {
        var slug = $.trim($('#rt-pk-slug-input').val());
        if (!slug) {
            showMessage('Please enter a slug.', true);
            return;
        }

        var $btn = $(this).prop('disabled', true);

        $.post(ajaxUrl, { action: 'rt_pk_add', nonce: nonce, slug: slug })
            .done(function (res) {
                if (res.success) {
                    var row = '<div class="rt-pk-row" data-slug="' + res.data.slug + '">'
                            + '<span class="rt-pk-slug">' + humanizeSlug(res.data.slug) + '</span>'
                            + '<button type="button" class="rt-pk-toggle rt-switch" role="switch" aria-checked="false">'
                            + '<span class="rt-switch-knob"></span>'
                            + '</button>'
                            + '<button type="button" class="rt-pk-remove button button-small">Delete</button>'
                            + '</div>';
                    $('#rt-pk-list').append(row);
                    $('#rt-pk-add-form').hide();
                    $('#rt-pk-slug-input').val('');
                    $('#rt-pk-add-btn').show();
                    showMessage('"' + humanizeSlug(res.data.slug) + '" added.', false);
                } else {
                    showMessage(res.data && res.data.message ? res.data.message : 'Error.', true);
                }
            })
            .fail(function () {
                showMessage('Request failed. Please try again.', true);
            })
            .always(function () {
                $btn.prop('disabled', false);
            });
    });

}(jQuery));
