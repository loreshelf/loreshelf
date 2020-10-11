/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-syntax */
import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import MarkdownIt from 'markdown-it';
import { Mark } from 'prosemirror-model';
import { schema } from '../editor/schema';
import Metadata from '../editor/Metadata';
import MarkdownIcons from './MarkdownIcons';
import defaultNotebookStyle from '../defaultNotebookStyle';

// eslint-disable-next-line consistent-return
function maybeMerge(a, b) {
  if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks))
    return a.withText(a.text + b.text);
}

// Object used to track the context of a running parse.
class MarkdownParseState {
  constructor(myschema, tokenHandlers) {
    this.schema = myschema;
    this.stack = [{ type: myschema.topNodeType, content: [] }];
    this.marks = Mark.none;
    this.tokenHandlers = tokenHandlers;
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  push(elt) {
    if (this.stack.length) this.top().content.push(elt);
  }

  // : (string)
  // Adds the given text to the current position in the document,
  // using the current marks as styling.
  addText(text) {
    if (!text) return;
    const nodes = this.top().content;
    const last = nodes[nodes.length - 1];
    const node = this.schema.text(text, this.marks);
    let merged;
    // eslint-disable-next-line no-cond-assign
    if (last && (merged = maybeMerge(last, node)))
      nodes[nodes.length - 1] = merged;
    else nodes.push(node);
  }

  // : (Mark)
  // Adds the given mark to the set of active marks.
  openMark(mark) {
    this.marks = mark.addToSet(this.marks);
  }

  // : (Mark)
  // Removes the given mark from the set of active marks.
  closeMark(mark) {
    this.marks = mark.removeFromSet(this.marks);
  }

  parseTokens(toks) {
    for (let i = 0; i < toks.length; i += 1) {
      const tok = toks[i];
      const handler = this.tokenHandlers[tok.type];
      if (!handler)
        throw new Error(
          `Token type \`${tok.type}\` not supported by Markdown parser`
        );
      handler(this, tok);
    }
  }

  // : (NodeType, ?Object, ?[Node]) → ?Node
  // Add a node at the current position.
  addNode(type, attrs, content) {
    const node = type.createAndFill(attrs, content, this.marks);
    if (!node) return null;
    this.push(node);
    return node;
  }

  // : (NodeType, ?Object)
  // Wrap subsequent content in a node of the given type.
  openNode(type, attrs) {
    this.stack.push({ type, attrs, content: [] });
  }

  // : () → ?Node
  // Close and return the node that is currently on top of the stack.
  closeNode() {
    if (this.marks.length) this.marks = Mark.none;
    const info = this.stack.pop();
    return this.addNode(info.type, info.attrs, info.content);
  }
}

class CustomMarkdownParser extends MarkdownParser {
  parse(text) {
    const state = new MarkdownParseState(this.schema, this.tokenHandlers);
    let doc;
    state.parseTokens(this.tokenizer.parse(text, {}));
    if (text !== '') {
      // Add new line at the end of every notecard
      state.addNode(this.schema.nodes.paragraph, {}, '');
    }
    do {
      doc = state.closeNode();
    } while (state.stack.length);
    return doc;
  }
}

const markdownParser = new CustomMarkdownParser(
  schema,
  MarkdownIt('default', { html: false }),
  {
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    inline: { block: 'text' },
    list_item: { block: 'list_item' },
    bullet_list: { block: 'bullet_list' },
    ordered_list: {
      block: 'ordered_list',
      getAttrs: tok => ({ order: +tok.attrGet('start') || 1 })
    },
    heading: {
      block: 'heading',
      getAttrs: tok => ({
        level: +tok.tag.slice(1),
        class: +tok.tag.slice(1) === 2 ? 'property' : undefined
      })
    },
    code_block: {
      block: 'code_block'
    },
    fence: {
      block: 'code_block',
      getAttrs: tok => ({ params: tok.info || '' })
    },
    hr: { node: 'horizontal_rule' },
    image: {
      node: 'image',
      getAttrs: tok => ({
        src: decodeURI(tok.attrGet('src')),
        title: tok.attrGet('title') || null,
        alt: (tok.children[0] && tok.children[0].content) || null
      })
    },
    hardbreak: { node: 'hard_break' },
    s: { mark: 'strikethrough' },
    em: { mark: 'em' },
    strong: { mark: 'strong' },
    link: {
      mark: 'link',
      getAttrs: tok => ({
        href: decodeURI(tok.attrGet('href')),
        title: tok.attrGet('title') || undefined
      })
    },
    code_inline: { mark: 'code' },
    table: { block: 'table' },
    thead: { block: 'table_head' },
    tr: { block: 'table_row' },
    th: { block: 'table_header' },
    tbody: { block: 'table_body' },
    td: { block: 'table_cell' }
  }
);

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

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
        `![${state.esc(node.attrs.alt || '')}](${encodeURI(node.attrs.src)}${
          node.attrs.title ? ` ${state.quote(node.attrs.title)}` : ''
        })`
      );
    },
    hard_break(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i += 1)
        if (parent.child(i).type !== node.type) {
          state.write('\\n');
          return;
        }
    },
    text(state, node) {
      state.text(node.text);
    },
    table(state, node) {
      if (node.textContent.startsWith('Metadata-keyMetadata-value')) {
        const rows = node.content.content[1].content.content;
        state.write('```metadata\n');
        rows.forEach(row => {
          state.renderInline(row.content.content[0]);
          state.write(`=`);
          state.renderInline(row.content.content[1]);
          state.write(`\n`);
        });
        state.write('```\n\n');
      } else {
        state.renderContent(node);
        state.write(`\n`);
      }
    },
    table_row(state, node) {
      const cells = node.content.content;
      state.write(`|`);
      cells.forEach(c => {
        state.write(` `);
        state.renderInline(c);
        state.write(` |`);
      });
      state.write(`\n`);
    },
    table_body(state, node) {
      state.renderContent(node);
    },
    table_cell(state, node) {
      state.renderInline(node);
    },
    table_head(state, node) {
      const headers = node.content.content[0].content.content;
      state.write('|');
      let divider = '|';
      headers.forEach(h => {
        state.write(' ');
        state.renderInline(h);
        state.write(' |');
        divider += ' --- |';
      });
      state.write(`\n${divider}\n`);
    }
  },
  {
    em: {
      open: '*',
      close: '*',
      mixable: true,
      expelEnclosingWhitespace: true
    },
    strikethrough: {
      open: '~~',
      close: '~~',
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
          : `](${encodeURI(mark.attrs.href)}${
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

export function metadata2table(sourceMd) {
  const metaData = new RegExp('^```metadata\\n(((?!```).)*)\\n```$', 'msg');
  let metadataHtml = sourceMd;
  let found = metaData.exec(sourceMd);
  while (found) {
    metadataHtml = metadataHtml.replace(
      found[0],
      Metadata.getInstance().transformToTable(found[1])
    );
    found = metaData.exec(metadataHtml);
  }
  return metadataHtml;
}

export function icons2links(sourceMd) {
  let result = sourceMd;
  MarkdownIcons.forEach(mdi => {
    const regExp = new RegExp(escapeRegExp(mdi.code), 'g');
    result = result.replace(regExp, `![Icon](${mdi.icon})`);
  });
  return result;
}

export function icons2svg(sourceMd) {
  let result = sourceMd;
  MarkdownIcons.forEach(mdi => {
    result = result.split(`<img src="${mdi.icon}" alt="Icon">`).join(mdi.svg);
  });
  return result;
}

export function md2html(sourcemd) {
  const md = new MarkdownIt();
  let transformedMd = metadata2table(sourcemd);
  transformedMd = icons2links(transformedMd);
  const notecards = md.render(transformedMd);
  const cards = notecards.split('<h1>');
  let newcards = '';
  cards.forEach(c => {
    if (c.includes('</h1>') > 0) {
      let content = c.replace('</h1>', '</h1><div class="notecard-content">');
      content = icons2svg(content);
      // create metadata table
      content = content
        .split(
          `<table>
<thead>
<tr>
<th>Metadata-key</th>
<th>Metadata-value</th>
</tr>
</thead>`
        )
        .join('<table class="metadata">');
      // paragraph in table cells
      content = content.split('<td>').join('<td><p>');
      content = content.split('</td>').join('</p></td>');
      // paragraph in lists
      content = content.split('</td>').join('</p></td>');
      newcards += `<div class="notecard"><h1 class="notecard-title">${content}</div></div>`;
    }
  });
  // eslint-disable-next-line global-require
  const result = `<head><style>${defaultNotebookStyle}</style></head><body><div id="notebook">${newcards}</div></body>`;
  // console.log(result);
  return result;
}

export function parseMarkdown(markdownContent) {
  return markdownParser.parse(markdownContent);
}

export function serializeMarkdown(content) {
  return markdownSerializer.serialize(content);
}
