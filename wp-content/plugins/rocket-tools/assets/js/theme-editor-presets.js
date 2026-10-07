/* global window */
window.RT_TE_PRESETS = {

    'wordpress-light': {
        type: 'light',
        colors: {
            'editor.background':                   '#ffffff',
            'editor.foreground':                   '#1d2327',
            'editorCursor.foreground':             '#1d2327',
            'editor.selectionBackground':          'rgba(200,224,244,0.6)',
            'editor.findMatchBackground':          'rgba(255,140,0,0.70)',
            'editor.findMatchHighlightBackground': 'rgba(255,214,0,0.45)',
            'sideBar.background':                  '#ffffff',
            'sideBar.foreground':                  '#1d2327',
            'sideBar.border':                      '#c3c4c7',
            'list.hoverBackground':                '#f0f6fc',
            'list.activeSelectionBackground':      '#dce9f8'
        },
        tokenColors: [
            { scope: ['comment'],                                              settings: { foreground: '#008000' } },
            { scope: ['string', 'string.tag', 'string.value'],                settings: { foreground: '#a31515' } },
            { scope: ['constant.numeric'],                                    settings: { foreground: '#098658' } },
            { scope: ['keyword.control', 'keyword', 'storage.type', 'storage'], settings: { foreground: '#0000ff' } },
            { scope: ['entity.name.function', 'support.function'],            settings: { foreground: '#795e26' } },
            { scope: ['entity.name.class', 'entity.name.type', 'support.class'], settings: { foreground: '#267f99' } },
            { scope: ['keyword.operator'],                                    settings: { foreground: '#000000' } },
            { scope: ['entity.name.tag'],                                     settings: { foreground: '#800000' } },
            { scope: ['entity.other.attribute-name'],                         settings: { foreground: '#ff0000' } },
            { scope: ['support.type.property-name'],                          settings: { foreground: '#ff0000' } },
            { scope: ['variable'],                                            settings: { foreground: '#001080' } },
            { scope: ['constant.language'],                                   settings: { foreground: '#0000ff' } },
            { scope: ['string.regexp'],                                       settings: { foreground: '#811f3f' } },
            { scope: ['keyword.other.unit'],                                  settings: { foreground: '#098658' } }
        ]
    },

    'dark-modern': {
        type: 'dark',
        colors: {
            'editor.background':                   '#1f1f1f',
            'editor.foreground':                   '#cccccc',
            'editorCursor.foreground':             '#aeafad',
            'editor.selectionBackground':          '#264f78',
            'editor.findMatchBackground':          '#9e6a03',
            'editor.findMatchHighlightBackground': 'rgba(234,92,0,0.33)',
            'sideBar.background':                  '#181818',
            'sideBar.foreground':                  '#cccccc',
            'sideBar.border':                      '#2b2b2b',
            'list.hoverBackground':                '#2a2d2e',
            'list.activeSelectionBackground':      '#04395e'
        },
        tokenColors: [
            { scope: ['comment'],                                              settings: { foreground: '#6A9955' } },
            { scope: ['string', 'string.tag', 'string.value'],                settings: { foreground: '#CE9178' } },
            { scope: ['constant.numeric'],                                    settings: { foreground: '#B5CEA8' } },
            { scope: ['keyword.control', 'keyword', 'storage.type', 'storage'], settings: { foreground: '#569CD6' } },
            { scope: ['entity.name.function', 'support.function'],            settings: { foreground: '#DCDCAA' } },
            { scope: ['entity.name.class', 'entity.name.type', 'support.class'], settings: { foreground: '#4EC9B0' } },
            { scope: ['keyword.operator'],                                    settings: { foreground: '#D4D4D4' } },
            { scope: ['entity.name.tag'],                                     settings: { foreground: '#569CD6' } },
            { scope: ['entity.other.attribute-name'],                         settings: { foreground: '#9CDCFE' } },
            { scope: ['support.type.property-name'],                          settings: { foreground: '#9CDCFE' } },
            { scope: ['variable'],                                            settings: { foreground: '#9CDCFE' } },
            { scope: ['constant.language'],                                   settings: { foreground: '#569CD6' } },
            { scope: ['string.regexp'],                                       settings: { foreground: '#D16969' } },
            { scope: ['keyword.other.unit'],                                  settings: { foreground: '#B5CEA8' } }
        ]
    },

    'dracula': {
        type: 'dark',
        colors: {
            'editor.background':                   '#282a36',
            'editor.foreground':                   '#f8f8f2',
            'editorCursor.foreground':             '#f8f8f0',
            'editor.selectionBackground':          '#44475a',
            'editor.findMatchBackground':          '#ffb86c',
            'editor.findMatchHighlightBackground': 'rgba(255,184,108,0.3)',
            'sideBar.background':                  '#21222c',
            'sideBar.foreground':                  '#f8f8f2',
            'sideBar.border':                      '#191a21',
            'list.hoverBackground':                '#44475a',
            'list.activeSelectionBackground':      '#44475a'
        },
        tokenColors: [
            { scope: ['comment'],                                              settings: { foreground: '#6272a4' } },
            { scope: ['string', 'string.tag', 'string.value'],                settings: { foreground: '#f1fa8c' } },
            { scope: ['constant.numeric'],                                    settings: { foreground: '#bd93f9' } },
            { scope: ['keyword.control', 'keyword', 'storage.type', 'storage'], settings: { foreground: '#ff79c6' } },
            { scope: ['entity.name.function', 'support.function'],            settings: { foreground: '#50fa7b' } },
            { scope: ['entity.name.class', 'entity.name.type', 'support.class'], settings: { foreground: '#8be9fd' } },
            { scope: ['keyword.operator'],                                    settings: { foreground: '#ff79c6' } },
            { scope: ['entity.name.tag'],                                     settings: { foreground: '#ff79c6' } },
            { scope: ['entity.other.attribute-name'],                         settings: { foreground: '#50fa7b' } },
            { scope: ['support.type.property-name'],                          settings: { foreground: '#66d9e8' } },
            { scope: ['variable'],                                            settings: { foreground: '#f8f8f2' } },
            { scope: ['constant.language'],                                   settings: { foreground: '#bd93f9' } },
            { scope: ['string.regexp'],                                       settings: { foreground: '#ffb86c' } },
            { scope: ['keyword.other.unit'],                                  settings: { foreground: '#bd93f9' } }
        ]
    }
};
