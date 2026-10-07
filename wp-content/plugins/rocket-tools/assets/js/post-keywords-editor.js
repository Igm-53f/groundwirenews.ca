(function ($) {
    'use strict';

    var postType = rtPkEditor.postType;
    var ajaxUrl  = rtPkEditor.ajaxUrl;
    var nonce    = rtPkEditor.nonce;

    function syncMetaBox() {
        $.post(ajaxUrl, { action: 'rt_pk_check', nonce: nonce, slug: postType })
            .done(function (res) {
                if (res.success) {
                    $('#rt_cmk_meta_box').toggle(res.data.enabled);
                }
            });
    }

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) syncMetaBox();
    });

}(jQuery));
