/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { redo, undo } from 'prosemirror-history';
import { ipcRenderer } from 'electron';
import classes from './MenuBar.css';
import { schema } from './schema';

const canInsert = type => state => {
  const { $from } = state.selection;

  for (let d = $from.depth; d >= 0; d -= 1) {
    const index = $from.index(d);

    if ($from.node(d).canReplaceWith(index, index, type)) {
      return true;
    }
  }

  return false;
};

function MenuBar(props) {
  const { view, onRemoveCard } = props;
  const { state, dispatch } = view;
  return (
    <div className={classes.bar}>
      <ButtonGroup vertical style={{ background: '#30404d' }}>
        <Button
          onMouseDown={e => {
            e.preventDefault();
            undo(state, dispatch);
          }}
          disabled={!undo(state)}
          title="Undo"
          icon="undo"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            redo(state, dispatch);
          }}
          disabled={!redo(state)}
          title="Redo"
          icon="redo"
        />
        <div style={{ margin: '5px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            const headerCells = [];
            const cells = [];
            const pros = schema.text('Pros');
            const cons = schema.text('Cons');
            cells.push(schema.nodes.table_cell.createAndFill());
            cells.push(schema.nodes.table_cell.createAndFill());
            headerCells.push(
              schema.nodes.table_header.createChecked(null, pros)
            );
            headerCells.push(
              schema.nodes.table_header.createChecked(null, cons)
            );
            const headerRows = schema.nodes.table_row.createChecked(
              null,
              headerCells
            );
            const rows = schema.nodes.table_row.createChecked(null, cells);
            const thead = schema.nodes.table_head.createChecked(
              null,
              headerRows
            );
            const tbody = schema.nodes.table_body.createChecked(null, rows);
            const table = schema.nodes.table.createChecked(null, [
              thead,
              tbody
            ]);
            dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
          }}
          disabled={!canInsert(schema.nodes.table)(state)}
          title="Insert a table"
          icon="list-columns"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            setTimeout(() => {
              const filePath = ipcRenderer.sendSync('file-link');
              if (filePath) {
                dispatch(state.tr.insertText(filePath));
              }
            }, 200);
          }}
          title="Add link to a file"
          icon="document-open"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            setTimeout(() => {
              const filePath = ipcRenderer.sendSync('file-link');
              if (filePath) {
                dispatch(state.tr.insertText(`![Photo](${filePath})`));
              }
            }, 200);
          }}
          title="Add a local image"
          icon="media"
        />
        <div style={{ margin: '10px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onRemoveCard();
          }}
          title="Remove the card"
          icon="trash"
        />
      </ButtonGroup>
    </div>
  );
}

export default MenuBar;
