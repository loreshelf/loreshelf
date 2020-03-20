import { history } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { baseKeymap } from 'prosemirror-commands';
import { tableEditing } from 'prosemirror-tables';
import { keymap } from 'prosemirror-keymap';

import 'prosemirror-tables/style/tables.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import '@aeaton/prosemirror-footnotes/style/footnotes.css';
import '@aeaton/prosemirror-placeholder/style/placeholder.css';

import { schema } from './schema';
import { buildKeymap, buildTableKeymap } from './keys';
import { buildInputRules } from './rules';

export default [
  buildInputRules(schema),
  keymap(buildKeymap(schema)),
  keymap(buildTableKeymap(schema)),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  history(),
  tableEditing()
];
