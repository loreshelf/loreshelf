import { marks } from 'prosemirror-schema-basic';

const subscript = {
  excludes: 'superscript',
  parseDOM: [{ tag: 'sub' }, { style: 'vertical-align=sub' }],
  toDOM: () => ['sub']
};

const superscript = {
  excludes: 'subscript',
  parseDOM: [{ tag: 'sup' }, { style: 'vertical-align=super' }],
  toDOM: () => ['sup']
};

const strikethrough = {
  parseDOM: [
    { tag: 'strike' },
    { style: 'text-decoration=line-through' },
    { style: 'text-decoration-line=line-through' }
  ],
  toDOM: () => [
    'span',
    {
      style: 'text-decoration-line:line-through'
    }
  ]
};

const underline = {
  parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
  toDOM: () => [
    'span',
    {
      style: 'text-decoration:underline'
    }
  ]
};

export default {
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
      title: { default: null }
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
      return ['a', node.attrs];
    }
  },

  code: {
    parseDOM: [{ tag: 'code' }],
    toDOM() {
      return ['code'];
    }
  }
};
