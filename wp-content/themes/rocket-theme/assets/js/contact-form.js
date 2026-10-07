/**
 * Native contact form — progressive enhancement.
 *
 * Without JS the form is a plain POST to admin-post.php (PRG banner). With JS we
 * intercept, submit via admin-ajax (never page-cached), and swap in an inline
 * status message. We also stamp a load timestamp on first interaction so the
 * server-side time-trap works even when the form HTML was served from cache.
 */
(function () {
    'use strict';

    var cfg = window.RocketContact || {};
    var ns = cfg.ns || 'rt';
    var i18n = cfg.i18n || {};

    function ready(fn) {
        if (document.readyState !== 'loading') { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }

    function isEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    ready(function () {
        var forms = document.querySelectorAll('.' + ns + '-contact-form');
        Array.prototype.forEach.call(forms, function (form) {
            var started = form.querySelector('input[name="rt_started"]');

            // Cache-proof time-trap: record when a human first touches the form.
            function stamp() {
                if (started && !started.value) { started.value = String(Date.now()); }
            }
            form.addEventListener('focusin', stamp, { once: true });
            form.addEventListener('pointerdown', stamp, { once: true });

            form.addEventListener('submit', function (e) {
                if (!cfg.ajaxurl) { return; } // no config → let it POST natively

                var name = form.querySelector('[name="rt_name"]');
                var email = form.querySelector('[name="rt_email"]');
                var message = form.querySelector('[name="rt_message"]');
                var notice = form.querySelector('.' + ns + '-contact__ajax-notice');
                var button = form.querySelector('.' + ns + '-contact__submit');

                // Light client-side validation (server re-checks everything).
                if (!name || !name.value.trim() || !email || !email.value.trim() ||
                    !message || !message.value.trim()) {
                    show(notice, i18n.required || '', false);
                    e.preventDefault();
                    return;
                }
                if (!isEmail(email.value.trim())) {
                    show(notice, i18n.invalidEmail || '', false);
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                stamp();

                var data = new FormData(form);
                data.set('action', cfg.action || 'rt_contact');

                if (button) {
                    if (!button.dataset.original) { button.dataset.original = button.textContent; }
                    button.disabled = true;
                    if (button.dataset.sending) { button.textContent = button.dataset.sending; }
                }

                fetch(cfg.ajaxurl, {
                    method: 'POST',
                    body: data,
                    credentials: 'same-origin'
                }).then(function (r) {
                    return r.json();
                }).then(function (res) {
                    if (res && res.ok) {
                        // Replace the whole form with the success message.
                        var wrap = form.parentNode;
                        var ok = document.createElement('div');
                        ok.className = ns + '-contact__notice ' + ns + '-contact__notice--ok';
                        ok.setAttribute('role', 'status');
                        ok.textContent = res.msg || '';
                        wrap.replaceChild(ok, form);
                    } else {
                        show(notice, (res && res.msg) || i18n.error || '', false);
                        resetButton(button);
                    }
                }).catch(function () {
                    show(notice, i18n.error || '', false);
                    resetButton(button);
                });
            });
        });
    });

    function show(el, msg, ok) {
        if (!el) { return; }
        el.hidden = false;
        el.textContent = msg;
        el.className = el.className.replace(/\s*is-(ok|err)/g, '') + (ok ? ' is-ok' : ' is-err');
    }

    function resetButton(button) {
        if (!button) { return; }
        button.disabled = false;
        if (button.dataset.original) { button.textContent = button.dataset.original; }
    }
})();
