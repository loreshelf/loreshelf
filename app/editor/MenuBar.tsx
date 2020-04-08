/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup, Icon } from '@blueprintjs/core';
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
      <ButtonGroup vertical>
        <Button
          onMouseDown={e => {
            e.preventDefault();
            undo(state, dispatch);
          }}
          disabled={!undo(state)}
          title="Undo"
          icon="undo"
          style={{ background: '#30404d' }}
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            redo(state, dispatch);
          }}
          disabled={!redo(state)}
          title="Redo"
          icon="redo"
          style={{ background: '#30404d' }}
        />
        <div style={{ height: '40px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            setTimeout(() => {
              const baseURI = document.getElementById('baseURI');
              const filePath = ipcRenderer.sendSync('file-link', baseURI.href);
              if (filePath) {
                const label = 'Local file';
                const cursorPos = state.selection.from;
                let tr = state.tr.insertText(label);
                tr = tr.addMark(
                  cursorPos,
                  cursorPos + label.length + 1,
                  schema.marks.link.create({ href: filePath })
                );
                dispatch(tr);
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
              const baseURI = document.getElementById('baseURI');
              const filePath = ipcRenderer.sendSync('file-link', baseURI.href);
              if (filePath) {
                const insert = schema.nodes.image.create({
                  src: filePath,
                  title: filePath,
                  alt: filePath
                });
                const tr = state.tr.replaceSelectionWith(insert);
                dispatch(tr);
              }
            }, 200);
          }}
          title="Add a local image"
          icon="media"
        />
        <div style={{ height: '15px', background: '#30404d' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onRemoveCard();
          }}
          title="Remove the card"
        >
          <Icon icon="trash" style={{ color: '#ff7373' }} />
        </Button>
      </ButtonGroup>
    </div>
  );
}

export default MenuBar;
