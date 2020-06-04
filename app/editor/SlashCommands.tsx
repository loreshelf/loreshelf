import { Selection, TextSelection } from 'prosemirror-state';
import { schema } from './schema';
import MarkdownIcons from '../components/MarkdownIcons';

const isNotInline = state => {
  const { path } = state.tr.selection.$cursor;
  const isInBlockQuote =
    path.length > 3 && path[3].type === schema.nodes.blockquote;
  const isNotParentParagraph =
    state.tr.selection.$cursor.parent.type !== schema.nodes.paragraph;
  return isNotParentParagraph || isInBlockQuote;
};

const COMMANDS = [
  {
    name: 'header',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch) => {
      const insert = schema.nodes.heading.createAndFill({
        level: 2,
        class: 'property'
      });
      const tr = state.tr.replaceWith(start, end, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
      dispatch(tr);
    }
  },
  {
    name: 'today',
    onSelect: (start, end, state, dispatch, cursor) => {
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const today = new Date().toLocaleDateString(undefined, options);
      const tr = state.tr.insertText(today, start, cursor);
      tr.setSelection(TextSelection.create(tr.doc, start + today.length));
      dispatch(tr);
    }
  },
  {
    name: 'now',
    onSelect: (start, end, state, dispatch, cursor) => {
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const today = new Date().toLocaleTimeString(undefined, options);
      const tr = state.tr.insertText(today, start, cursor);
      tr.setSelection(TextSelection.create(tr.doc, start + today.length));
      dispatch(tr);
    }
  },
  {
    name: 'table',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch) => {
      const headerCells = [];
      const cells = [];
      const pros = schema.text('Pros');
      const cons = schema.text('Cons');
      cells.push(schema.nodes.table_cell.createAndFill());
      cells.push(schema.nodes.table_cell.createAndFill());
      headerCells.push(schema.nodes.table_header.createChecked(null, pros));
      headerCells.push(schema.nodes.table_header.createChecked(null, cons));
      const headerRows = schema.nodes.table_row.createChecked(
        null,
        headerCells
      );
      const rows = schema.nodes.table_row.createChecked(null, cells);
      const thead = schema.nodes.table_head.createChecked(null, headerRows);
      const tbody = schema.nodes.table_body.createChecked(null, rows);
      const table = schema.nodes.table.createChecked(null, [thead, tbody]);
      const tr = state.tr.replaceWith(start, end, table);
      tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
      dispatch(tr);
    }
  },
  {
    name: 'quote',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch) => {
      const insert = schema.nodes.blockquote.createAndFill();
      const tr = state.tr.replaceWith(start, end, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
      dispatch(tr);
    }
  },
  {
    name: 'large',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch) => {
      const insert = schema.nodes.heading.createAndFill({
        level: 6
      });
      const tr = state.tr.replaceWith(start, end, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
      dispatch(tr);
    }
  },
  {
    name: 'rule',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch) => {
      const insert = schema.nodes.horizontal_rule.create();
      const tr = state.tr.replaceWith(start, end, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(end)));
      dispatch(tr);
    }
  },
  {
    name: 'strike',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch, cursor) => {
      const label = 'strike out';
      let tr = state.tr.insertText(label, start, cursor);
      tr = tr.addMark(
        start,
        start + label.length,
        schema.marks.strikethrough.create()
      );
      dispatch(tr);
    }
  }
];

MarkdownIcons.forEach(mdi => {
  COMMANDS.push({
    name: `icon-${mdi.name}`,
    onSelect: (start, end, state, dispatch) => {
      const insert = schema.nodes.image.createAndFill({
        src: mdi.icon,
        alt: 'Icon'
      });
      const tr = state.tr.replaceWith(start, end, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
      dispatch(tr);
    }
  });
});

export default COMMANDS;
