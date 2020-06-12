import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import MarkdownIt from 'markdown-it';
import { schema } from '../editor/schema';
import Metadata from '../editor/Metadata';
import MarkdownIcons from './MarkdownIcons';

const markdownParser = new MarkdownParser(
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
          state.write('\\\n');
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

const defaultCss = `
body {
  color: hsla(204, 33%, 97%, 1);
  background-color: hsla(206, 24%, 21%, 1);
  background-image: repeating-linear-gradient( -45deg, black, black 1px, transparent 1px, transparent 6px );
  background-size: 4px 4px;
  font-family: arial, sans-serif;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.28581;
  text-transform: none;
  text-size-adjust: 100%;
}
.notebook {
  width: 100vw;
  display: flex;
  justify-content: start;
  align-content: flex-start;
  align-items: stretch;
  box-sizing: border-box;
  flex-wrap: wrap;
  padding: 0;
  overflow-y: none;
  scroll-behavior: smooth;
}
.notecard {
  flex: 1 1 0;
  margin: 5px;
  font-size: 14px;
  min-width: 220px;
  width: 220px;
  max-width: 220px;
  min-height: 240px;
  box-shadow: 0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4);
  background-color: #30404d;
  border-radius: 3px;
  transition: transform 200ms cubic-bezier(0.4, 1, 0.75, 0.9), box-shadow 200ms cubic-bezier(0.4, 1, 0.75, 0.9), -webkit-transform 200ms cubic-bezier(0.4, 1, 0.75, 0.9), -webkit-box-shadow 200ms cubic-bezier(0.4, 1, 0.75, 0.9);
}
.notecard-title {
  font-size: 16px;
  width: 100%;
  max-width: 210px;
  background: #0081c9;
  padding: 5px;
  position: sticky;
  top: 0;
  display: flex;
  z-index: 1;
  margin: 0;
  overflow: hidden;
  line-height: 20px;
}
.notecard-content {
  height: calc(100% - 30px);
  min-height: calc(100% - 30px);
  padding: 5px;
  word-wrap: break-word;
  width: 210px;
}
h2 {
  font-size: 16px;
  line-height: 20px;
  min-height: 20px;
  margin: 0 -5px;
  padding: 7px;
  background: hsl(207, 23%, 37%);
  width: calc(100% - 5px);
  text-align: center;
}
h6 {
  font-size: 30px;
  text-align: center;
}
p {
  margin-top: 4px;
  margin-bottom: 8px;
}
a {
  color: #92f8e6 !important;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
ul {
  padding: 0;
  margin-left: 5px;
  margin-top: 10px;
  color: hsla(204, 33%, 97%, 1);
}
ul li {
  list-style: none;
}
ul li:before {
  content: '\\25CF\\00a0\\00a0';
  display: inline;
  color: #92f8e6;
}
ol {
  padding: 0;
  margin-left: 15px;
  margin-top: 10px;
}
ol li {
  color: #92f8e6;
}
ol li p {
  color: hsla(204, 33%, 97%, 1) !important;
}
table {
  width: calc(100% + 12px);
  border-collapse: collapse;
  margin: -6px;
  font-size: 14px;
}
th {
  text-align: center;
  font-weight: bold;
  width: 50%;
  background: hsl(207, 23%, 37%);
  padding: 5px 2px;
}
th:not(:first-child) {
  border-left: 5px solid #30404d;
}
tr:not(:first-child) {
  border-top: 1px solid hsl(206, 24%, 64%);
}
td {
  padding: 0;
  padding-left: 5px;
}
.metadata {
  border-collapse: separate !important;
  border-spacing: 0 5px;
  width: calc(100% + 9px) !important;
  margin-left: -4px !important;
}
.metadata td:nth-child(1) {
  background-color: #394b59;
  background-image: linear-gradient( 180deg, hsla(0, 0%, 100%, 0.05), hsla(0, 0%, 100%, 0) );
  box-shadow: 0 0 0 1px rgba(16, 22, 26, 0.4);
  border-radius: 3px 0 0 3px;
  color: #f5f8fa;
  text-align: right;
  padding-right: 5px;
  min-width: 30px;
  width: 30px;
  max-width: 120px;
}
.metadata td:nth-child(2) {
    background-color: rgba(16, 22, 26, 0.3);
    box-shadow: 0 0 0 0 rgba(19, 124, 189, 0), 0 0 0 0 rgba(19, 124, 189, 0), 0 0 0 0 rgba(19, 124, 189, 0), inset 0 0 0 1px rgba(16, 22, 26, 0.3), inset 0 1px 1px rgba(16, 22, 26, 0.4);
    word-break: break-all;
}
img {
  width: calc(100% + 10px);
  margin: 5px -5px;
  display: block;
  position: relative;
  min-height: 18px;
}
blockquote {
  border-left: 1px solid #92f8e6;
  font-style: italic;
  line-height: 1.5em;
  margin: 0;
  margin-left: 5px;
  white-space: pre-line;
  padding: 0;
  padding-left: 10px;
  position: relative;
}
blockquote::before {
  content: '';
  position: absolute;
  top: 50%;
  background-color: #30404d;
  height: 2.4em;
  left: -4px;
  width: 5px;
  margin-top: -1.2em;
}
blockquote::after {
  content: url("data:image/svg+xml; utf8, <svg aria-hidden=\\"true\\" focusable=\\"false\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 512 512\\"><path fill=\\"%2392f8e6\\" d=\\"M464 32H336c-26.5 0-48 21.5-48 48v128c0 26.5 21.5 48 48 48h80v64c0 35.3-28.7 64-64 64h-8c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h8c88.4 0 160-71.6 160-160V80c0-26.5-21.5-48-48-48zm-288 0H48C21.5 32 0 53.5 0 80v128c0 26.5 21.5 48 48 48h80v64c0 35.3-28.7 64-64 64h-8c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h8c88.4 0 160-71.6 160-160V80c0-26.5-21.5-48-48-48z\\"></path></svg>");
  position: absolute;
  top: 50%;
  color: #92f8e6;
  font-size: 8px;
  font-weight: 900;
  line-height: 1em;
  left: -0.5em;
  text-align: center;
  text-indent: -2px;
  width: 1em;
  margin-top: -0.5em;
}
hr {
  box-sizing: content-box;
  height: 0;
  overflow: visible;
  border-width: 0;
  border-bottom: 2px dashed hsl(207, 23%, 37%);
  margin-left: -5px;
  margin-right: -5px;
  margin-top: 0;
  margin-bottom: 0;
}
@media print {
  body {
    background-color: white;
    background-image: none;
  }
  .notebook {
    width: 710px;
    margin: 0 auto;
    overflow-x: hidden;
    overflow-y: hidden;
  }
}
`;

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
  const cssString = String(defaultCss);
  const result = `<head><style>${cssString}</style></head><body><div class="notebook">${newcards}</div></body>`;
  // console.log(result);
  return result;
}

export function parseMarkdown(markdownContent) {
  return markdownParser.parse(markdownContent);
}

export function serializeMarkdown(content) {
  return markdownSerializer.serialize(content);
}
