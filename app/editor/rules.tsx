/* eslint-disable no-useless-escape */
/* eslint-disable no-cond-assign */
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  ellipsis,
  InputRule
} from 'prosemirror-inputrules';
import path from 'path';
import MarkdownIcons from '../components/MarkdownIcons';

// : (NodeType) → InputRule
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
export function blockQuoteRule(nodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType);
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
export function orderedListRule(nodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order === +match[1]
  );
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
export function bulletListRule(nodeType) {
  return wrappingInputRule(/^\s*([-*])\s$/, nodeType);
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType) {
  return textblockTypeInputRule(/^```$/, nodeType);
}

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export function buildInputRules(schema) {
  const rules = smartQuotes.concat(ellipsis);
  let type;
  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type));
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type));
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type));
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type));
  if ((type = schema.nodes.heading))
    rules.push(
      textblockTypeInputRule(new RegExp(`^(#{2,2})\\s$`), type, match => ({
        level: match[1].length,
        class: 'property'
      }))
    );
  const linkRegexp = /((?:http(s)?:\/\/|www.)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&%'\(\)\*\+,;=.]+ )$/;
  const imageUrlRegexp = /((?:https?:\/\/|www\.)[^ ]+\.(?:png|jpg|gif) )$/;

  if ((type = schema.marks.link)) {
    rules.push(
      new InputRule(imageUrlRegexp, (state, match, start, end) => {
        const bareUrl = match[1].trim();
        const src = encodeURI(bareUrl);
        const alt = bareUrl.substring(bareUrl.lastIndexOf(path.sep) + 1);
        const insert = schema.nodes.image.create({
          src,
          alt
        });
        return state.tr.replaceWith(start, end, insert);
      })
    );
    rules.push(
      new InputRule(linkRegexp, (state, match, start, end) => {
        const newStart = start;
        let url = match[0].trim();
        if (url.startsWith('www.')) {
          url = `https://${url}`;
        }
        return state.tr
          .insertText(url, newStart, end)
          .addMark(
            newStart,
            newStart + url.length,
            schema.marks.link.create({ href: url })
          );
      })
    );
  }

  MarkdownIcons.forEach(mdi => {
    const regExp = new RegExp(escapeRegExp(mdi.code));
    rules.push(
      new InputRule(regExp, (state, match, start, end) => {
        const insert = schema.nodes.image.create({
          src: mdi.icon,
          alt: 'Icon'
        });
        return state.tr.replaceWith(start, end, insert);
      })
    );
  });
  return inputRules({ rules });
}
