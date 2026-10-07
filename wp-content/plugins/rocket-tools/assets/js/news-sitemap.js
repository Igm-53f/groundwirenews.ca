(function ($) {
    'use strict';

    if (!$('#rt-ns-toggle').length) return;

    var $toggle    = $('#rt-ns-toggle');
    var $dot       = $('#rt-ns-dot');
    var $statusText = $('#rt-ns-status-text');
    var $openLink  = $('#rt-ns-open-link');
    var $flushNote = $('#rt-ns-flush-notice');

    function setStatus(status) {
        switch (status) {
            case 'active':
                $dot.css('background', '#00a32a');
                $statusText.text('Сайтмап работает — ' + rtNewsSitemap.sitemapUrl);
                $openLink.show();
                $flushNote.hide();
                break;
            case 'needs_flush':
                $dot.css('background', '#dba617');
                $statusText.text('Включён, но нужно сбросить правила перезаписи');
                $openLink.hide();
                $flushNote.show();
                break;
            case 'inactive':
                $dot.css('background', '#c3c4c7');
                $statusText.text('Сайтмап выключен');
                $openLink.hide();
                $flushNote.hide();
                break;
        }
    }

    function checkStatus() {
        $dot.css('background', '#c3c4c7');
        $statusText.text('Проверяем…');
        $openLink.hide();

        $.post(rtNewsSitemap.ajaxUrl, {
            action: 'rt_news_sitemap_status',
            nonce:  rtNewsSitemap.nonce,
        })
        .done(function (res) {
            setStatus(res.success ? res.data.status : 'error');
        })
        .fail(function () {
            setStatus('error');
        });
    }

    $toggle.on('click', function () {
        $toggle.prop('disabled', true);

        $.post(rtNewsSitemap.ajaxUrl, {
            action: 'rt_news_sitemap_toggle',
            nonce:  rtNewsSitemap.nonce,
        })
        .done(function (res) {
            if (!res.success) return;
            var enabled = res.data.enabled;
            $toggle.toggleClass('is-on', enabled).attr('aria-checked', String(enabled));
            $flushNote.toggle(enabled);
            // Give rewrite rules a moment to propagate, then verify.
            setTimeout(checkStatus, 1500);
        })
        .always(function () {
            $toggle.prop('disabled', false);
        });
    });

    checkStatus();

}(jQuery));
