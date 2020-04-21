import { Selection, TextSelection } from 'prosemirror-state';
import { schema } from './schema';

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
    onSelect: (start, end, state, dispatch, cursor) => {
      const insert = schema.nodes.heading.createAndFill({
        level: 2,
        class: 'property'
      });
      const tr = state.tr.replaceWith(start - 1, end + 1, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(cursor - 1)));
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
      tr.setSelection(TextSelection.create(tr.doc, cursor + today.length - 1));
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
      tr.setSelection(TextSelection.create(tr.doc, cursor + today.length - 1));
      dispatch(tr);
    }
  },
  {
    name: 'table',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch, cursor) => {
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
      // dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
      const tr = state.tr.replaceWith(start - 1, end + 1, table);
      tr.setSelection(Selection.near(tr.doc.resolve(cursor)));
      dispatch(tr);
    }
  },
  {
    name: 'quote',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch, cursor) => {
      const insert = schema.nodes.blockquote.createAndFill();
      const tr = state.tr.replaceWith(start - 1, end + 1, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(cursor - 1)));
      dispatch(tr);
    }
  }
];

export default COMMANDS;