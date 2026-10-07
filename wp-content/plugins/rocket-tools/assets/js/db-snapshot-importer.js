/* global rtDbsImporter, jQuery */
jQuery(function ($) {
    'use strict';

    // All import requests go to the REST API (/wp-json/rocket-tools/v1/db-import/…)
    // instead of admin-ajax.php. Hosting WAFs block file-like payloads on
    // admin-ajax.php but have no pre-built rules for custom REST routes.

    var tempKey = '';

    function rest(path, data, done, fail) {
        $.ajax({
            url:     rtDbsImporter.restUrl + path,
            method:  'POST',
            headers: { 'X-WP-Nonce': rtDbsImporter.restNonce },
            data:    data
        }).done(done).fail(function (xhr) {
            var msg = 'Unknown error';
            try { msg = JSON.parse(xhr.responseText).message || msg; } catch (e) {}
            if (fail) fail(msg);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────

    function humanLabel(key) {
        var label = key.replace(/_/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        return $('<span>').text(label).html();
    }

    function formatDate(str) {
        try { return new Date(str.replace(' ', 'T') + 'Z').toLocaleString(); }
        catch (e) { return str || 'Unknown'; }
    }

    function makeTempKey() {
        return 'rt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // ── Chunked base64 upload ─────────────────────────────────────

    var CHUNK_BYTES = 384 * 1024; // 384 KB binary → ~512 KB base64

    function toBase64Chunks(buffer) {
        var bytes  = new Uint8Array(buffer);
        var chunks = [];
        for (var i = 0; i < bytes.length; i += CHUNK_BYTES) {
            var slice = bytes.subarray(i, Math.min(i + CHUNK_BYTES, bytes.length));
            var str   = '';
            for (var j = 0; j < slice.length; j++) {
                str += String.fromCharCode(slice[j]);
            }
            chunks.push(btoa(str));
        }
        return chunks.length ? chunks : [''];
    }

    function uploadChunks(chunks, index, key) {
        $('#rt-dbs-file-name').text('Загружаем… ' + (index + 1) + ' / ' + chunks.length);

        rest('db-import/chunk', {
            temp_key:     key,
            chunk:        chunks[index],
            chunk_index:  index,
            total_chunks: chunks.length
        }, function () {
            if (index + 1 < chunks.length) {
                uploadChunks(chunks, index + 1, key);
            } else {
                fetchPreview(key);
            }
        }, function (msg) {
            $('#rt-dbs-upload-spinner').removeClass('is-active').hide();
            $('#rt-dbs-file-name').text('Загрузка не удалась: ' + msg);
        });
    }

    function fetchPreview(key) {
        rest('db-import/preview', { temp_key: key }, function (data) {
            $('#rt-dbs-upload-spinner').removeClass('is-active').hide();
            tempKey = data.temp_key;
            renderPreview(data.manifest, data.summary);
        }, function (msg) {
            $('#rt-dbs-upload-spinner').removeClass('is-active').hide();
            $('#rt-dbs-file-name').text('Предпросмотр не удался: ' + msg);
        });
    }

    // ── File selected ─────────────────────────────────────────────

    $('#rt-dbs-file-input').on('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;

        $('#rt-dbs-file-name').text(file.name);
        $('#rt-dbs-preview-area, #rt-dbs-success-area').hide();
        $('#rt-dbs-upload-spinner').addClass('is-active').show();

        var key    = makeTempKey();
        var reader = new FileReader();

        reader.onload = function (e) {
            uploadChunks(toBase64Chunks(e.target.result), 0, key);
        };

        reader.onerror = function () {
            $('#rt-dbs-upload-spinner').removeClass('is-active').hide();
            $('#rt-dbs-file-name').text('Не удалось прочитать файл.');
        };

        reader.readAsArrayBuffer(file);
    });

    // ── Preview render ────────────────────────────────────────────

    function renderPreview(manifest, summary) {
        var srcUrl = $('<span>').text(manifest.source_url || 'Unknown').html();
        var wpVer  = $('<span>').text(manifest.wp_version || '?').html();
        var info   = 'Source: <strong>' + srcUrl + '</strong>' +
                     ' &mdash; Exported: ' + formatDate(manifest.date) +
                     ' &mdash; WordPress ' + wpVer;
        $('#rt-dbs-manifest-info').html(info);

        var html = '';
        $.each(summary, function (key, count) {
            html += '<tr><td>' + humanLabel(key) + '</td><td>' + parseInt(count, 10).toLocaleString() + '</td></tr>';
        });
        $('#rt-dbs-preview-rows').html(html);
        $('#rt-dbs-preview-area').show();
    }

    // ── Import ────────────────────────────────────────────────────

    $('#rt-dbs-btn-import').on('click', function () {
        if (!tempKey) { alert('Снимок не загружен.'); return; }
        $(this).prop('disabled', true);
        $('#rt-dbs-import-spinner').addClass('is-active').show();

        rest('db-import/run', {
            temp_key: tempKey,
            conflict: $('#rt-dbs-conflict').val()
        }, function (data) {
            renderSuccess(data);
        }, function (msg) {
            alert('Импорт не удался: ' + msg);
        });

        $('#rt-dbs-btn-import').prop('disabled', false);
        $('#rt-dbs-import-spinner').removeClass('is-active').hide();
    });

    // ── Success render ────────────────────────────────────────────

    function renderSuccess(data) {
        var imported = data.imported || {};
        var skipped  = data.skipped  || {};
        var html     = '<ul>';

        $.each(imported, function (key, count) {
            html += '<li>Imported <strong>' + parseInt(count, 10) + '</strong> ' + humanLabel(key) + '</li>';
        });
        $.each(skipped, function (key, count) {
            html += '<li>Skipped <strong>' + parseInt(count, 10) + '</strong> ' + humanLabel(key) + ' (already exists locally)</li>';
        });

        if (!Object.keys(imported).length && !Object.keys(skipped).length) {
            html += '<li>Nothing was imported (snapshot may be empty).</li>';
        }

        html += '</ul>';
        $('#rt-dbs-success-details').html(html);
        $('#rt-dbs-preview-area').hide();
        $('#rt-dbs-success-area').show();
        tempKey = '';
    }
});
