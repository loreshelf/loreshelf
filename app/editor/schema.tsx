import { Schema } from 'prosemirror-model';
import React from 'react';
import ReactDOM from 'react-dom';
import ImageNode from './ImageNode';

function getCellAttrs(dom) {
  const widthAttr = dom.getAttribute('data-colwidth');
  const widths =
    widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
      ? widthAttr.split(',').map(s => Number(s))
      : null;
  const colspan = Number(dom.getAttribute('colspan') || 1);
  const result = {
    colspan,
    rowspan: Number(dom.getAttribute('rowspan') || 1),
    colwidth: widths && widths.length === colspan ? widths : null
  };
  return result;
}

// ::Schema Document schema for the data model used by CommonMark.
// eslint-disable-next-line import/prefer-default-export
export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },

    paragraph: {
      attrs: { class: { default: undefined } },
      content: 'inline*',
      group: 'block',
      parseDOM: [
        {
          tag: 'p',
          getAttrs(dom) {
            return {
              class: dom.getAttribute('class')
            };
          }
        }
      ],
      toDOM(node) {
        return ['p', node.attrs, 0];
      }
    },

    blockquote: {
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() {
        return ['blockquote', 0];
      }
    },

    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM() {
        return ['div', ['hr']];
      }
    },

    heading: {
      attrs: { level: { default: 1 }, class: { default: undefined } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2, class: 'property' } }
      ],
      toDOM(node) {
        return [`h${node.attrs.level}`, node.attrs, 0];
      }
    },

    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      marks: '',
      attrs: { params: { default: '' } },
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: node => ({ params: node.getAttribute('data-params') || '' })
        }
      ],
      toDOM(node) {
        return [
          'pre',
          node.attrs.params ? { 'data-params': node.attrs.params } : {},
          ['code', 0]
        ];
      }
    },

    ordered_list: {
      content: 'list_item+',
      group: 'block',
      attrs: {
        order: { default: 1 },
        tight: { default: false },
        class: { default: undefined }
      },
      parseDOM: [
        {
          tag: 'ol',
          getAttrs(dom) {
            return {
              order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1,
              tight: dom.hasAttribute('data-tight')
            };
          }
        }
      ],
      toDOM(node) {
        return [
          'ol',
          {
            start: node.attrs.order === 1 ? null : node.attrs.order,
            'data-tight': node.attrs.tight ? 'true' : null,
            class: node.attrs.class
          },
          0
        ];
      }
    },

    bullet_list: {
      content: 'list_item+',
      group: 'block',
      attrs: { tight: { default: true }, class: { default: undefined } },
      parseDOM: [
        {
          tag: 'ul',
          getAttrs: dom => ({ tight: dom.hasAttribute('data-tight') })
        }
      ],
      toDOM(node) {
        return ['ul', node.attrs, 0];
      }
    },

    list_item: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM() {
        return ['li', 0];
      }
    },

    text: {
      group: 'inline'
    },

    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        style: { default: 'width: calc(100% + 10px); margin: -5px;' }
      },
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs(dom) {
            return {
              src: dom.getAttribute('src'),
              title: dom.getAttribute('title'),
              alt: dom.getAttribute('alt')
            };
          }
        },
        {
          tag: 'span[icon]',
          getAttrs(dom) {
            return { src: dom.getAttribute('icon'), alt: 'Icon' };
          }
        }
      ],
      toDOM(node) {
        // return ['img', node.attrs];
        const dom = document.createElement('span');
        ReactDOM.render(
          <ImageNode
            attrs={node.attrs}
            src={node.attrs.src}
            alt={node.attrs.alt}
            title={node.attrs.title}
          />,
          dom
        );
        return dom;
      }
    },

    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM() {
        return ['br'];
      }
    },

    table: {
      content: 'table_head table_body',
      attrs: {
        class: { default: undefined }
      },
      tableRole: 'table',
      group: 'block',
      parseDOM: [{ tag: 'table' }],
      toDOM(node) {
        return [
          'table',
          {
            class: node.textContent.startsWith('Metadata-keyMetadata-value')
              ? 'metadata'
              : null
          },
          0
        ];
      }
    },
    table_head: {
      content: 'table_row+',
      parseDOM: [{ tag: 'thead' }],
      tableRole: 'table',
      allowGapCursor: false,
      toDOM() {
        return ['thead', 0];
      }
    },
    table_body: {
      content: 'table_row+',
      parseDOM: [{ tag: 'tbody' }],
      tableRole: 'table',
      allowGapCursor: false,
      toDOM() {
        return ['tbody', 0];
      }
    },
    table_row: {
      content: '(table_cell | table_header)*',
      tableRole: 'row',
      allowGapCursor: false,
      parseDOM: [{ tag: 'tr' }],
      toDOM() {
        return ['tr', 0];
      }
    },
    table_cell: {
      content: 'inline*',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null }
      },
      tableRole: 'cell',
      allowGapCursor: false,
      isolating: true,
      parseDOM: [
        {
          tag: 'td',
          getAttrs: dom => getCellAttrs(dom)
        }
      ],
      toDOM(node) {
        return ['td', node.attrs, ['p', 0]];
      }
    },
    table_header: {
      content: 'inline*',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null }
      },
      tableRole: 'header_cell',
      allowGapCursor: false,
      isolating: true,
      parseDOM: [{ tag: 'th', getAttrs: dom => getCellAttrs(dom) }],
      toDOM(node) {
        return ['th', node.attrs, 0];
      }
    }
  },

  marks: {
    em: {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { style: 'font-style', getAttrs: value => value === 'italic' && null }
      ],
      toDOM() {
        return ['em'];
      }
    },

    strikethrough: {
      parseDOM: [
        {
          tag: 'span',
          style: 'text-decoration',
          getAttrs: value => value === 'line-through' && null
        }
      ],
      toDOM() {
        return ['span', { style: 'text-decoration: line-through' }];
      }
    },

    strong: {
      parseDOM: [
        { tag: 'b' },
        { tag: 'strong' },
        {
          style: 'font-weight',
          getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
        }
      ],
      toDOM() {
        return ['strong'];
      }
    },

    link: {
      attrs: {
        href: {},
        title: { default: undefined }
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom) {
            return {
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title')
            };
          }
        }
      ],
      toDOM(node) {
        return [
          'span',
          {
            href: node.attrs.href,
            class: node.attrs.href.startsWith('@')
              ? 'cardLinkIcon'
              : 'openUrlIcon'
          },
          [
            'a',
            {
              href: node.attrs.href,
              title: node.attrs.title !== 'null' ? node.attrs.title : undefined,
              ...{
                class: node.attrs.href.startsWith('@') ? 'cardLink' : 'regular'
              }
            },
            0
          ]
        ];
      }
    },

    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() {
        return ['code'];
      }
    }
  }
});
