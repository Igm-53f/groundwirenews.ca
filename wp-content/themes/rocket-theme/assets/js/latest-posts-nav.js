/* rocket-theme — latest-posts-nav.js
 * Adds a "More posts" control (None / Pagination / Load more) to the core
 * Latest Posts block. Plain ES6 against the wp.* globals — no build step.
 *
 * "Number of items" (postsToShow) becomes the page / batch size; the server
 * (inc/latest-posts-nav.php) handles offsetting and rendering the navigation.
 */
((hooks, element, blockEditor, components, compose, i18n) => {
    'use strict';

    const { addFilter } = hooks;
    const { createElement: el, Fragment } = element;
    const { InspectorControls } = blockEditor;
    const { PanelBody, SelectControl } = components;
    const { createHigherOrderComponent } = compose;
    const { __ } = i18n;

    const TARGET = 'core/latest-posts';

    // 1. Register the rtNav attribute on the core block.
    addFilter(
        'blocks.registerBlockType',
        'rocket-theme/latest-posts-nav-attribute',
        (settings, name) => {
            if (name !== TARGET) {
                return settings;
            }
            settings.attributes = Object.assign({}, settings.attributes, {
                rtNav: { type: 'string', default: 'none' },
            });
            return settings;
        }
    );

    // 2. Add the Inspector control to the block.
    const withNavControl = createHigherOrderComponent(
        (BlockEdit) => (props) => {
            if (props.name !== TARGET) {
                return el(BlockEdit, props);
            }
            const { attributes, setAttributes } = props;
            return el(
                Fragment,
                {},
                el(BlockEdit, props),
                el(
                    InspectorControls,
                    {},
                    el(
                        PanelBody,
                        { title: __('More posts', 'rocket-theme'), initialOpen: false },
                        el(SelectControl, {
                            label: __('Navigation', 'rocket-theme'),
                            value: attributes.rtNav || 'none',
                            options: [
                                { label: __('None', 'rocket-theme'), value: 'none' },
                                { label: __('Pagination ( /page/2/ )', 'rocket-theme'), value: 'pagination' },
                                { label: __('Load more button', 'rocket-theme'), value: 'loadmore' },
                            ],
                            onChange: (v) => setAttributes({ rtNav: v }),
                            help: __('“Number of items” becomes the page / batch size.', 'rocket-theme'),
                        })
                    )
                )
            );
        },
        'withRtLatestPostsNav'
    );

    addFilter('editor.BlockEdit', 'rocket-theme/latest-posts-nav-control', withNavControl);
})(
    window.wp.hooks,
    window.wp.element,
    window.wp.blockEditor,
    window.wp.components,
    window.wp.compose,
    window.wp.i18n
);
