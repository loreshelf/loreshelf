/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { redo, undo } from 'prosemirror-history';
import { wrapInList } from 'prosemirror-schema-list';
import { lift } from 'prosemirror-commands';
import { ipcRenderer } from 'electron';
import classes from './MenuBar.css';
import { schema } from './schema';

const listActive = (type, attrs = {}) => state => {
  const { $from } = state.selection;
  return $from.path[3].type === type;
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
            if (listActive(schema.nodes.bullet_list)(state)) {
              lift(state, dispatch);
            } else {
              wrapInList(schema.nodes.bullet_list)(state, dispatch);
            }
          }}
          active={listActive(schema.nodes.bullet_list)(state)}
          // disabled={!wrapInList(schema.nodes.bullet_list)(state)}
          title="Bullet list"
          icon="properties"
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
