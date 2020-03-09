import { history } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { placeholder } from '@aeaton/prosemirror-placeholder';

import 'prosemirror-tables/style/tables.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import '@aeaton/prosemirror-footnotes/style/footnotes.css';
import '@aeaton/prosemirror-placeholder/style/placeholder.css';

import keys from './keys';
import rules from './rules';

export default [
  rules,
  keys,
  placeholder(),
  dropCursor(),
  gapCursor(),
  history()
];

// for tables
// document.execCommand('enableObjectResizing', false, false);
// document.execCommand('enableInlineTableEditing', false, false);
