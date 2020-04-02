/* eslint-disable no-useless-escape */
/* eslint-disable no-cond-assign */
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis,
  InputRule
} from 'prosemirror-inputrules';

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
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType) {
  return textblockTypeInputRule(/^```$/, nodeType);
}

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
export function headingRule(nodeType, maxLevel) {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${maxLevel}})\\s$`),
    nodeType,
    match => ({ level: match[1].length })
  );
}

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export function buildInputRules(schema) {
  const rules = smartQuotes.concat(ellipsis, emDash);
  let type;
  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type));
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type));
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type));
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type));
  if ((type = schema.nodes.heading)) rules.push(headingRule(type, 2));
  const linkRegexp = /((?:http(s)?:\/\/|www.)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+ )$/;
  const imageUrlRegexp = /((?:https?:\/\/|www\.)[^ ]+\.(?:png|jpg|gif) )$/;

  /** const str =
    '![Photo](/home/ibek/Pictures/Screenshot from 2019-11-19 17-30-40.png) ';
  const res = localImageRegexp.exec(str);
  console.log(res); */
  if ((type = schema.marks.link)) {
    rules.push(
      new InputRule(imageUrlRegexp, (state, match, start, end) => {
        const src = encodeURI(match[1]).trim();
        const insert = schema.nodes.image.create({
          src,
          alt: 'WebImage'
        });
        return state.tr.replaceWith(start, end, insert);
      })
    );
    rules.push(
      new InputRule(linkRegexp, (state, match, start, end) => {
        let insert = 'Web address';
        let newStart = start;
        const url = match[0];
        if (match[1]) {
          const offset = match[0].lastIndexOf(match[1]);
          insert += match[0].slice(offset + match[1].length);
          newStart += offset;
          const cutOff = newStart - end;
          if (cutOff > 0) {
            insert = match[0].slice(offset - cutOff, offset) + insert;
            newStart = end;
          }
        }
        return state.tr
          .insertText(insert, newStart, end)
          .addMark(
            newStart,
            newStart + insert.length,
            schema.marks.link.create({ href: url.trim() })
          );
      })
    );
  }
  return inputRules({ rules });
}
