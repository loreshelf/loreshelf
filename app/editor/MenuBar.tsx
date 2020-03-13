/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { redo, undo } from 'prosemirror-history';
import { wrapInList } from 'prosemirror-schema-list';
import { lift } from 'prosemirror-commands';
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
            if (listActive(schema.nodes.bullet_list)(state)) {
              lift(state, dispatch);
            } else {
              wrapInList(schema.nodes.bullet_list)(state, dispatch);
            }
          }}
          active={listActive(schema.nodes.bullet_list)(state)}
          // disabled={!wrapInList(schema.nodes.bullet_list)(state)}
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
}

export default MenuBar;
