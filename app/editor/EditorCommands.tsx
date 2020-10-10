import { Selection } from 'prosemirror-state';
import {
  selectedRect,
  addRow,
  isInTable,
  selectionCell
} from 'prosemirror-tables';

export function addRowAfter(state, dispatch) {
  if (!isInTable(state)) return false;
  if (dispatch) {
    const transaction = state.tr;
    const { $cursor } = transaction.selection;
    if ($cursor.parent && $cursor.parent.type.name !== 'table_cell') {
      return false;
    }
    const rect = selectedRect(state);
    const cell = selectionCell(state);
    const rowStart = cell.after();
    if (dispatch) {
      const tr = addRow(state.tr, rect, rect.bottom);
      tr.setSelection(Selection.near(tr.doc.resolve(rowStart)));
      dispatch(tr);
    }
  }
  return true;
}

export function addRowBefore(state, dispatch) {
  if (!isInTable(state)) return false;
  if (dispatch) {
    const transaction = state.tr;
    const { $cursor } = transaction.selection;
    if ($cursor.parent && $cursor.parent.type.name !== 'table_cell') {
      return false;
    }
    const rect = selectedRect(state);
    const cell = selectionCell(state);
    const rowStart = cell.after();
    if (dispatch) {
      const tr = addRow(state.tr, rect, rect.top);
      tr.setSelection(Selection.near(tr.doc.resolve(rowStart)));
      dispatch(tr);
    }
  }
  return true;
}

export function moveRowUp(state, dispatch, schema) {
  const transaction = state.tr;
  const { $cursor } = transaction.selection;
  if ($cursor.parent && $cursor.parent.type !== schema.nodes.table_cell) {
    return;
  }
  if ($cursor.path.length < 8) {
    return;
  }
  if ($cursor.path[7] - 1 < 0) {
    // Cannot move upper than to the top
    return;
  }

  const startPos = $cursor.path[8];
  const currentRow = $cursor.node(3);
  const currentNodeSize = currentRow.nodeSize;
  const rowBefore = $cursor.path[6].content.content[$cursor.path[7] - 1];
  const beforeNodeSize = rowBefore.nodeSize;
  const offsetPos = $cursor.pos - startPos;

  let tr = state.tr.delete(startPos, startPos + currentNodeSize);
  tr = tr.replaceWith(
    startPos - beforeNodeSize - 1,
    startPos - beforeNodeSize,
    currentRow
  );
  tr = tr.setSelection(
    Selection.near(tr.doc.resolve(startPos - beforeNodeSize + offsetPos))
  );
  dispatch(tr);
}

export function moveRowDown(state, dispatch, schema) {
  const transaction = state.tr;
  const { $cursor } = transaction.selection;

  if ($cursor.parent && $cursor.parent.type !== schema.nodes.table_cell) {
    return;
  }
  if ($cursor.path.length < 8) {
    return;
  }
  if ($cursor.path[7] + 1 > $cursor.path[6].content.content.length - 1) {
    // Cannot move lower than to the bottom
    return;
  }

  const startPos = $cursor.path[8];
  const currentRow = $cursor.node(3);
  const currentNodeSize = currentRow.nodeSize;
  const rowAfter = $cursor.path[6].content.content[$cursor.path[7] + 1];
  const afterNodeSize = rowAfter.nodeSize;
  const offsetPos = $cursor.pos - startPos;

  let tr = state.tr.delete(startPos, startPos + currentNodeSize);
  tr = tr.replaceWith(
    startPos + afterNodeSize - 1,
    startPos + afterNodeSize,
    currentRow
  );
  tr = tr.setSelection(
    Selection.near(tr.doc.resolve(startPos + afterNodeSize + offsetPos))
  );
  dispatch(tr);
}
