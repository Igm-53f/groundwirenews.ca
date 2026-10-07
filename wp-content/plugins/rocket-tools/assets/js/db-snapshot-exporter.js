/* global rtDbsExporter, jQuery */
jQuery(function ($) {
    'use strict';

    var scanData = {};

    function formatBytes(bytes) {
        bytes = parseInt(bytes, 10) || 0;
        if (bytes < 1024)       return bytes + ' B';
        if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(2) + ' GB';
    }

    function humanLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
    }

    function updateTotal() {
        var total = 0;
        $('#rt-dbs-section-rows input[type=checkbox]:checked').each(function () {
            total += parseInt($(this).data('size'), 10) || 0;
        });
        $('#rt-dbs-selected-size').text(formatBytes(total));
    }

    function renderTable(data) {
        var html = '';
        $.each(data, function (key, info) {
            html += '<tr>' +
                '<td>' + humanLabel(key) + '</td>' +
                '<td>' + info.count.toLocaleString() + '</td>' +
                '<td>' + formatBytes(info.size_bytes) + '</td>' +
                '<td style="text-align:center;">' +
                  '<input type="checkbox" name="sections[]" value="' + key + '" data-size="' + info.size_bytes + '"' +
                  (info['default'] ? ' checked' : '') + '>' +
                '</td>' +
                '</tr>';
        });
        $('#rt-dbs-section-rows').html(html);
        updateTotal();
        $('#rt-dbs-results').show();
    }

    function doGenerate(allSections) {
        var sections = [];
        if (allSections) {
            $.each(scanData, function (key) { sections.push(key); });
        } else {
            $('#rt-dbs-section-rows input:checked').each(function () { sections.push($(this).val()); });
        }
        if (!sections.length) { alert('Выберите хотя бы один раздел.'); return; }

        $('#rt-dbs-gen-spinner').show();
        $('#rt-dbs-btn-generate, #rt-dbs-btn-all').prop('disabled', true);

        $.post(rtDbsExporter.ajaxUrl, {
            action:   'rt_dbs_generate',
            nonce:    rtDbsExporter.nonce,
            sections: sections
        }, function (resp) {
            if (resp.success) {
                window.location.href = resp.data.download_url;
            } else {
                alert('Ошибка: ' + (resp.data && resp.data.message ? resp.data.message : 'Неизвестная ошибка'));
            }
        }).fail(function () {
            alert('Запрос не прошёл. Попробуйте ещё раз.');
        }).always(function () {
            $('#rt-dbs-gen-spinner').hide();
            $('#rt-dbs-btn-generate, #rt-dbs-btn-all').prop('disabled', false);
        });
    }

    $('#rt-dbs-btn-scan').on('click', function () {
        $(this).prop('disabled', true);
        $('#rt-dbs-scan-area .spinner').addClass('is-active');

        $.post(rtDbsExporter.ajaxUrl, {
            action: 'rt_dbs_scan',
            nonce:  rtDbsExporter.nonce
        }, function (resp) {
            if (resp.success) {
                scanData = resp.data;
                renderTable(scanData);
            } else {
                alert('Сканирование не удалось: ' + (resp.data && resp.data.message ? resp.data.message : 'Неизвестная ошибка'));
            }
        }).fail(function () {
            alert('Запрос сканирования не прошёл. Попробуйте ещё раз.');
        }).always(function () {
            $('#rt-dbs-btn-scan').prop('disabled', false);
            $('#rt-dbs-scan-area .spinner').removeClass('is-active');
        });
    });

    $(document).on('change', '#rt-dbs-section-rows input[type=checkbox]', updateTotal);
    $('#rt-dbs-btn-generate').on('click', function () { doGenerate(false); });
    $('#rt-dbs-btn-all').on('click',      function () { doGenerate(true);  });
});
