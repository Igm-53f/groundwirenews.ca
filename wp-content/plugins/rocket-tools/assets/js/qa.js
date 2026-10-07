/* Rocket Tools — QA tab. Vanilla JS (no jQuery dependency). */
(function () {
	'use strict';

	var cfg = window.rtQa || {};
	var i18n = cfg.i18n || {};

	function post(action, data) {
		var body = new URLSearchParams();
		body.append('action', action);
		body.append('nonce', cfg.nonce || '');
		Object.keys(data || {}).forEach(function (k) { body.append(k, data[k]); });
		return fetch(cfg.ajaxUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString()
		}).then(function (r) { return r.json(); });
	}

	/* ---- Non-blocking scan --------------------------------------------- */
	var scanForm = document.querySelector('.rt-qa-scan-form');
	if (scanForm) {
		scanForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var btn = scanForm.querySelector('.rt-qa-scan-btn');
			var spin = scanForm.querySelector('.rt-qa-spinner');
			if (btn) { btn.disabled = true; btn.textContent = i18n.scanning || 'Scanning…'; }
			if (spin) { spin.classList.add('is-active'); }
			post('rt_qa_scan', {}).then(function (res) {
				if (res && res.success) {
					window.location.reload();
				} else {
					if (btn) { btn.disabled = false; }
					if (spin) { spin.classList.remove('is-active'); }
					window.alert((res && res.data && res.data.message) || i18n.error || 'Error');
				}
			}).catch(function () {
				// Fall back to a plain synchronous submit if the AJAX call fails.
				scanForm.submit();
			});
		});
	}

	/* ---- Per-finding resolution status --------------------------------- */
	document.querySelectorAll('.rt-qa-resolve').forEach(function (sel) {
		sel.addEventListener('change', function () {
			var row = sel.closest('tr');
			sel.disabled = true;
			post('rt_qa_resolve', {
				hash: sel.getAttribute('data-hash'),
				check_id: sel.getAttribute('data-check') || '',
				state: sel.value
			}).then(function (res) {
				sel.disabled = false;
				if (res && res.success) {
					flash(sel, i18n.saved || 'Saved', true);
					if (row) { row.setAttribute('data-resolution', sel.value); }
				} else {
					flash(sel, (res && res.data && res.data.message) || i18n.error || 'Error', false);
				}
			}).catch(function () {
				sel.disabled = false;
				flash(sel, i18n.error || 'Error', false);
			});
		});
	});

	function flash(el, text, ok) {
		var tag = document.createElement('span');
		tag.className = 'rt-qa-flash ' + (ok ? 'ok' : 'err');
		tag.textContent = text;
		if (el.parentNode) {
			el.parentNode.appendChild(tag);
			setTimeout(function () { if (tag.parentNode) { tag.parentNode.removeChild(tag); } }, 1800);
		}
	}
})();
