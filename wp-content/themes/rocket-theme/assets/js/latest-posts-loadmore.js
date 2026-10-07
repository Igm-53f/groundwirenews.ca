/* rocket-theme — latest-posts-loadmore.js
 * Front-end handler for the core Latest Posts block's "Load more" button.
 * Fetches the next batch from the REST endpoint and appends the items.
 * Config (endpoint, nonce, ns) comes from window.RocketLatestPosts.
 */
(function () {
    'use strict';

    var cfg = window.RocketLatestPosts || {};
    if (!cfg.endpoint || !cfg.ns) {
        return;
    }
    var BTN = '.' + cfg.ns + '-latest-posts__loadmore-btn';

    document.addEventListener('click', function (e) {
        var btn = e.target.closest(BTN);
        if (!btn || btn.dataset.loading === '1') {
            return;
        }
        e.preventDefault();

        var page = parseInt(btn.dataset.page, 10) || 1;
        var next = page + 1;
        var attrs;
        try { attrs = JSON.parse(btn.dataset.attrs); } catch (err) { attrs = {}; }

        btn.dataset.loading = '1';
        btn.setAttribute('aria-busy', 'true');

        fetch(cfg.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': cfg.nonce || '',
            },
            body: JSON.stringify({ attrs: attrs, page: next }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var wrap = btn.closest('.' + cfg.ns + '-latest-posts__wrap');
                var list = wrap ? wrap.querySelector('ul') : null;
                if (list && data && data.html) {
                    var tmp = document.createElement('div');
                    tmp.innerHTML = data.html;
                    var items = tmp.querySelectorAll('li');
                    for (var i = 0; i < items.length; i++) {
                        list.appendChild(items[i]);
                    }
                }
                btn.dataset.page = String(next);
                btn.dataset.loading = '0';
                btn.removeAttribute('aria-busy');

                if (!data || !data.hasMore) {
                    var box = btn.closest('.' + cfg.ns + '-latest-posts__loadmore');
                    if (box) { box.remove(); } else { btn.remove(); }
                }
            })
            .catch(function () {
                btn.dataset.loading = '0';
                btn.removeAttribute('aria-busy');
            });
    });
})();
