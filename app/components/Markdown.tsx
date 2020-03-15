import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import markdownit from 'markdown-it';
import { schema } from '../editor/schema';

const markdownParser = new MarkdownParser(
  schema,
  markdownit('commonmark', { html: false }),
  {
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    list_item: { block: 'list_item' },
    bullet_list: { block: 'bullet_list' },
    ordered_list: {
      block: 'ordered_list',
      getAttrs: tok => ({ order: +tok.attrGet('start') || 1 })
    },
    heading: {
      block: 'heading',
      getAttrs: tok => ({ level: +tok.tag.slice(1) })
    },
    code_block: { block: 'code_block' },
    fence: {
      block: 'code_block',
      getAttrs: tok => ({ params: tok.info || '' })
    },
    hr: { node: 'horizontal_rule' },
    image: {
      node: 'image',
      getAttrs: tok => ({
        src: tok.attrGet('src'),
        title: (tok.children[0] && tok.children[0].content) || null,
        alt: (tok.children[0] && tok.children[0].content) || null
      })
    },
    hardbreak: { node: 'hard_break' },

    em: { mark: 'em' },
    strong: { mark: 'strong' },
    link: {
      mark: 'link',
      getAttrs: tok => ({
        href: tok.attrGet('href'),
        title: tok.attrGet('title') || null
      })
    },
    code_inline: { mark: 'code' }
  }
);

function isPlainURL(link, parent, index, side) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) return false;
  const content = parent.child(index + (side < 0 ? -1 : 0));
  if (
    !content.isText ||
    content.text !== link.attrs.href ||
    content.marks[content.marks.length - 1] !== link
  )
    return false;
  if (index === (side < 0 ? 1 : parent.childCount - 1)) return true;
  const next = parent.child(index + (side < 0 ? -2 : 1));
  return !link.isInSet(next.marks);
}

function backticksFor(node, side) {
  const ticks = /`+/g;
  let m;
  let len = 0;
  if (node.isText) {
    m = ticks.exec(node.text);
    while (m) {
      len = Math.max(len, m[0].length);
      m = ticks.exec(node.text);
    }
  }
  let result = len > 0 && side > 0 ? ' `' : '`';
  for (let i = 0; i < len; i += 1) result += '`';
  if (len > 0 && side < 0) result += ' ';
  return result;
}

const markdownSerializer = new MarkdownSerializer(
  {
    blockquote(state, node) {
      state.wrapBlock('> ', null, node, () => state.renderContent(node));
    },
    code_block(state, node) {
      state.write(`\`\`\`${node.attrs.params || ''}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write('```');
      state.closeBlock(node);
    },
    heading(state, node) {
      state.write(`${state.repeat('#', node.attrs.level)} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    horizontal_rule(state, node) {
      state.write(node.attrs.markup || '---');
      state.closeBlock(node);
    },
    bullet_list(state, node) {
      state.renderList(node, '  ', () => `${node.attrs.bullet || '*'} `);
    },
    ordered_list(state, node) {
      const start = node.attrs.order || 1;
      const maxW = String(start + node.childCount - 1).length;
      const space = state.repeat(' ', maxW + 2);
      state.renderList(node, space, i => {
        const nStr = String(start + i);
        return `${state.repeat(' ', maxW - nStr.length) + nStr}. `;
      });
    },
    list_item(state, node) {
      state.renderContent(node);
    },
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },

    image(state, node) {
      state.write(
        `![${state.esc(node.attrs.alt || '')}](${state.esc(node.attrs.src)}${
          node.attrs.title ? ` ${state.quote(node.attrs.title)}` : ''
        })`
      );
    },
    hard_break(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i += 1)
        if (parent.child(i).type !== node.type) {
          state.write('\\\n');
          return;
        }
    },
    text(state, node) {
      state.text(node.text);
    }
  },
  {
    em: {
      open: '*',
      close: '*',
      mixable: true,
      expelEnclosingWhitespace: true
    },
    strong: {
      open: '**',
      close: '**',
      mixable: true,
      expelEnclosingWhitespace: true
    },
    link: {
      open(_state, mark, parent, index) {
        return isPlainURL(mark, parent, index, 1) ? '<' : '[';
      },
      close(state, mark, parent, index) {
        return isPlainURL(mark, parent, index, -1)
          ? '>'
          : `](${state.esc(mark.attrs.href)}${
              mark.attrs.title ? ` ${state.quote(mark.attrs.title)}` : ''
            })`;
      }
    },
    code: {
      open(_state, _mark, parent, index) {
        return backticksFor(parent.child(index), -1);
      },
      close(_state, _mark, parent, index) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false
    }
  }
);

export function parseMarkdown(markdownContent) {
  return markdownParser.parse(markdownContent);
}

export function serializeMarkdown(content) {
  return markdownSerializer.serialize(content);
}
