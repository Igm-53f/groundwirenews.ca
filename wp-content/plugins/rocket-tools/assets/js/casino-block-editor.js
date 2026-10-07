(function (blocks, element, blockEditor, components, i18n, serverSideRender) {
    'use strict';

    var el = element.createElement;
    var useState = element.useState;
    var __ = i18n.__;

    function searchCasinos(term, callback) {
        var body = new URLSearchParams();
        body.set('action', 'rt_casino_search');
        body.set('nonce', rtCasinoBlock.nonce);
        body.set('term', term);
        fetch(rtCasinoBlock.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: body })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                callback(res && res.success ? res.data.results : []);
            })
            .catch(function () { callback([]); });
    }

    var SEARCH_DEBOUNCE_MS = 250;

    /** Resolve titles for a set of already-known casino IDs (e.g. reopening a saved block). */
    function resolveTitles(ids, callback) {
        if (!ids.length) { callback([]); return; }
        var body = new URLSearchParams();
        body.set('action', 'rt_casino_search');
        body.set('nonce', rtCasinoBlock.nonce);
        body.set('ids', ids.join(','));
        fetch(rtCasinoBlock.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: body })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                callback(res && res.success ? res.data.results : []);
            })
            .catch(function () { callback([]); });
    }

    function Picker(props) {
        var casinoIds = props.casinoIds;
        var titles = props.titles; // { [id]: title }
        var onChange = props.onChange;

        // ComboboxControl owns the open-on-click/keyboard-nav UI; we own
        // `options`, re-fetched server-side on every keystroke (debounced) so
        // it scales the same way whether a site has 5 casinos or 500 — no
        // "type 2 characters first" dead zone, and no client-side dump of the
        // entire library into the browser.
        var optionsState = useState([]);
        var options = optionsState[0];
        var setOptions = optionsState[1];

        var debounceRef = element.useRef(null);

        function applyResults(results) {
            var opts = [];
            results.forEach(function (r) {
                if (casinoIds.indexOf(r.id) === -1) {
                    opts.push({ value: String(r.id), label: r.title });
                }
            });
            setOptions(opts);
        }

        // Initial "click with nothing typed yet" list.
        element.useEffect(function () {
            searchCasinos('', applyResults);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        function onFilterValueChange(value) {
            if (debounceRef.current) { clearTimeout(debounceRef.current); }
            debounceRef.current = setTimeout(function () {
                searchCasinos(value, applyResults);
            }, SEARCH_DEBOUNCE_MS);
        }

        function add(id, title) {
            if (casinoIds.indexOf(id) !== -1) { return; }
            onChange(casinoIds.concat([id]), Object.assign({}, titles, (function () {
                var t = {}; t[id] = title; return t;
            })()));
            // Prune immediately so the just-picked casino doesn't linger in
            // the dropdown as if still pickable (options only refresh on the
            // next keystroke/fetch otherwise).
            setOptions(function (prev) { return prev.filter(function (o) { return o.value !== String(id); }); });
        }

        function onPick(value) {
            if (!value) { return; }
            var id = parseInt(value, 10);
            var picked = options.filter(function (o) { return o.value === value; })[0];
            add(id, picked ? picked.label : ('#' + id));
        }

        function remove(id) {
            onChange(casinoIds.filter(function (x) { return x !== id; }), titles);
        }

        function move(index, delta) {
            var newIndex = index + delta;
            if (newIndex < 0 || newIndex >= casinoIds.length) { return; }
            var ids = casinoIds.slice();
            var tmp = ids[index];
            ids[index] = ids[newIndex];
            ids[newIndex] = tmp;
            onChange(ids, titles);
        }

        return el('div', { className: 'rt-cas-block-picker' },
            el(components.ComboboxControl, {
                label: __('Добавить казино', 'rocket-tools'),
                value: null,
                options: options,
                onFilterValueChange: onFilterValueChange,
                onChange: onPick,
            }),
            el('p', { className: 'description' }, __('Ровно одна ссылка на казино в блоке — данные подтягиваются из библиотеки «Казино», ничего не дублируется.', 'rocket-tools')),
            el('ol', { className: 'rt-cas-block-list' },
                casinoIds.map(function (id, index) {
                    return el('li', { key: id },
                        el('span', { className: 'rt-cas-block-list-title' }, titles[id] || ('#' + id)),
                        el('span', { className: 'rt-cas-block-list-actions' },
                            el('button', {
                                type: 'button',
                                className: 'button button-small',
                                'aria-label': __('Переместить выше', 'rocket-tools'),
                                disabled: index === 0,
                                onClick: function () { move(index, -1); },
                            }, '▲'),
                            el('button', {
                                type: 'button',
                                className: 'button button-small',
                                'aria-label': __('Переместить ниже', 'rocket-tools'),
                                disabled: index === casinoIds.length - 1,
                                onClick: function () { move(index, 1); },
                            }, '▼'),
                            el('button', {
                                type: 'button',
                                className: 'button button-small rt-cas-block-remove',
                                'aria-label': __('Убрать из витрины', 'rocket-tools'),
                                onClick: function () { remove(id); },
                            }, '✕')
                        )
                    );
                })
            )
        );
    }

    blocks.registerBlockType(rtCasinoBlock.blockName, {
        title: __('Витрина казино', 'rocket-tools'),
        description: __('Показывает карточки выбранных казино из библиотеки «Казино». Данные всегда свежие — блок хранит только порядок и шаблон.', 'rocket-tools'),
        icon: 'money-alt',
        category: 'widgets',
        attributes: {
            casinoIds: { type: 'array', default: [] },
            template: { type: 'string', default: 'row' },
            all: { type: 'boolean', default: false },
        },
        supports: { align: ['wide', 'full'] },
        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var blockProps = blockEditor.useBlockProps({ className: 'rt-cas-block-edit' });

            // Titles are resolved lazily (from search results / block re-open);
            // on first load of an existing block we only have IDs, so show a
            // generic label until the editor's own search interactions (or a
            // fresh fetch) fill titles[] in. Good enough for Крок 4's scope —
            // it never affects what's actually rendered on the front end.
            var titlesState = useState({});
            var titles = titlesState[0];
            var setTitles = titlesState[1];

            element.useEffect(function () {
                var missing = attributes.casinoIds.filter(function (id) { return !titles[id]; });
                if (!missing.length) { return; }
                resolveTitles(missing, function (results) {
                    var found = {};
                    results.forEach(function (r) { found[r.id] = r.title; });
                    setTitles(function (prev) { return Object.assign({}, prev, found); });
                });
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [attributes.casinoIds.join(',')]);

            function onChange(ids, newTitles) {
                setAttributes({ casinoIds: ids });
                setTitles(Object.assign({}, titles, newTitles));
            }

            return el(element.Fragment, {},
                el(blockEditor.InspectorControls, {},
                    el(components.PanelBody, { title: __('Настройки витрины', 'rocket-tools') },
                        el(components.SelectControl, {
                            label: __('Шаблон', 'rocket-tools'),
                            value: attributes.template,
                            options: [
                                { label: __('Таблица на всю ширину', 'rocket-tools'), value: 'row' },
                                { label: __('Карточки (компактно)', 'rocket-tools'), value: 'card' },
                            ],
                            onChange: function (value) { setAttributes({ template: value }); },
                        }),
                        el(components.ToggleControl, {
                            label: __('Все казино из библиотеки', 'rocket-tools'),
                            help: __('Показывает все опубликованные казино в порядке библиотеки. Новые казино появляются автоматически — список ниже не нужен.', 'rocket-tools'),
                            checked: !!attributes.all,
                            onChange: function (value) { setAttributes({ all: !!value }); },
                        })
                    )
                ),
                el('div', blockProps,
                    !attributes.all && el(Picker, {
                        casinoIds: attributes.casinoIds,
                        titles: titles,
                        onChange: onChange,
                    }),
                    attributes.all && el('p', { className: 'description' }, __('Режим «все казино»: порядок задаётся в библиотеке (поле «Порядок» / импорт).', 'rocket-tools')),
                    (attributes.all || attributes.casinoIds.length > 0) && el('div', { className: 'rt-cas-block-preview' },
                        el('p', { className: 'description' }, __('Предпросмотр (как на реальной странице):', 'rocket-tools')),
                        el(serverSideRender, {
                            block: rtCasinoBlock.blockName,
                            attributes: attributes,
                        })
                    )
                )
            );
        },
        save: function () {
            return null; // dynamic block — PHP render_callback owns the output
        },
    });
}(
    window.wp.blocks,
    window.wp.element,
    window.wp.blockEditor,
    window.wp.components,
    window.wp.i18n,
    window.wp.serverSideRender
));
