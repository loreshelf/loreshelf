/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { redo, undo } from 'prosemirror-history';
import { wrapInList } from 'prosemirror-schema-list';
import classes from './MenuBar.css';
import { schema } from './schema';

const blockActive = (type, attrs = {}) => state => {
  const { $from, to, node } = state.selection;

  if (node) {
    return node.hasMarkup(type, attrs);
  }

  return to <= $from.end() && $from.parent.hasMarkup(type, attrs);
};

const MenuBar = ({ view, onRemoveCard }) => {
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
          icon="undo"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            redo(state, dispatch);
          }}
          disabled={!redo(state)}
          icon="redo"
        />
        <div style={{ margin: '5px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            wrapInList(schema.nodes.bullet_list)(state, dispatch);
          }}
          disabled={!wrapInList(schema.nodes.bullet_list)(state)}
          icon="properties"
        />
        <div style={{ margin: '10px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onRemoveCard();
          }}
          icon="trash"
        />
      </ButtonGroup>
    </div>
  );
};

export default MenuBar;
