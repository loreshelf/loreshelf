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

function replaceBlockBefore(
  state,
  dispatch,
  startPos,
  currentRow,
  currentNodeSize,
  beforeNodeSize,
  offsetPos
) {
  let tr = state.tr.delete(startPos, startPos + currentNodeSize);
  tr = tr.replaceWith(
    startPos - beforeNodeSize,
    startPos - beforeNodeSize,
    currentRow
  );
  tr = tr.setSelection(
    Selection.near(tr.doc.resolve(startPos - beforeNodeSize + offsetPos))
  );
  dispatch(tr);
}

function replaceBlockAfter(
  state,
  dispatch,
  startPos,
  currentRow,
  currentNodeSize,
  afterNodeSize,
  offsetPos
) {
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

export function moveRowUp(state, dispatch, schema) {
  const transaction = state.tr;
  const { $cursor } = transaction.selection;
  if (!$cursor || !$cursor.parent) {
    // click on img for example
    return;
  }
  if (
    $cursor.path.length > 6 &&
    $cursor.path[6].type === schema.nodes.list_item
  ) {
    if ($cursor.path[4] - 1 >= 0) {
      const startPos = $cursor.path[5];
      const currentRow = $cursor.path[6];
      const currentNodeSize = currentRow.nodeSize;
      const rowBefore = $cursor.path[3].content.content[$cursor.path[4] - 1];
      const beforeNodeSize = rowBefore.nodeSize;
      const offsetPos = $cursor.pos - startPos;

      replaceBlockBefore(
        state,
        dispatch,
        startPos,
        currentRow,
        currentNodeSize,
        beforeNodeSize,
        offsetPos
      );
      return;
    }
  }
  if (
    $cursor.path.length > 7 &&
    $cursor.parent.type === schema.nodes.table_cell
  ) {
    if ($cursor.path[7] - 1 >= 0) {
      const startPos = $cursor.path[8];
      const currentRow = $cursor.node(3);
      const currentNodeSize = currentRow.nodeSize;
      const rowBefore = $cursor.path[6].content.content[$cursor.path[7] - 1];
      const beforeNodeSize = rowBefore.nodeSize;
      const offsetPos = $cursor.pos - startPos;

      replaceBlockBefore(
        state,
        dispatch,
        startPos,
        currentRow,
        currentNodeSize,
        beforeNodeSize,
        offsetPos
      );
      return;
    }
  }
  if ($cursor.path[1] - 1 >= 0) {
    const startPos = $cursor.path[2];
    const currentRow = $cursor.path[3];
    const currentNodeSize = currentRow.nodeSize;
    const rowBefore = $cursor.path[0].content.content[$cursor.path[1] - 1];
    const beforeNodeSize = rowBefore.nodeSize;
    const offsetPos = $cursor.pos - startPos;

    replaceBlockBefore(
      state,
      dispatch,
      startPos,
      currentRow,
      currentNodeSize,
      beforeNodeSize,
      offsetPos
    );
  }
}

export function moveRowDown(state, dispatch, schema) {
  const transaction = state.tr;
  const { $cursor } = transaction.selection;

  if (
    $cursor.path.length > 6 &&
    $cursor.path[6].type === schema.nodes.list_item
  ) {
    if ($cursor.path[4] + 1 < $cursor.path[3].content.content.length) {
      const startPos = $cursor.path[5];
      const currentRow = $cursor.path[6];
      const currentNodeSize = currentRow.nodeSize;
      const rowAfter = $cursor.path[3].content.content[$cursor.path[4] + 1];
      const afterNodeSize = rowAfter.nodeSize;
      const offsetPos = $cursor.pos - startPos;

      replaceBlockAfter(
        state,
        dispatch,
        startPos,
        currentRow,
        currentNodeSize,
        afterNodeSize,
        offsetPos
      );
      return;
    }
  }

  if (
    $cursor.path.length > 7 &&
    $cursor.parent.type === schema.nodes.table_cell
  ) {
    if ($cursor.path[7] + 1 < $cursor.path[6].content.content.length) {
      const startPos = $cursor.path[8];
      const currentRow = $cursor.node(3);
      const currentNodeSize = currentRow.nodeSize;
      const rowAfter = $cursor.path[6].content.content[$cursor.path[7] + 1];
      const afterNodeSize = rowAfter.nodeSize;
      const offsetPos = $cursor.pos - startPos;

      replaceBlockAfter(
        state,
        dispatch,
        startPos,
        currentRow,
        currentNodeSize,
        afterNodeSize,
        offsetPos
      );
      return;
    }
  }

  if ($cursor.path[1] + 1 < $cursor.path[0].content.content.length) {
    const startPos = $cursor.path[2];
    const currentRow = $cursor.path[3];
    const currentNodeSize = currentRow.nodeSize;
    const rowAfter = $cursor.path[0].content.content[$cursor.path[1] + 1];
    const afterNodeSize = rowAfter.nodeSize;
    const offsetPos = $cursor.pos - startPos;

    replaceBlockAfter(
      state,
      dispatch,
      startPos,
      currentRow,
      currentNodeSize,
      afterNodeSize,
      offsetPos
    );
  }
}
