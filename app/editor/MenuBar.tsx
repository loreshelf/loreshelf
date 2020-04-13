/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup, Icon } from '@blueprintjs/core';
import classes from './MenuBar.css';

function MenuBar(props) {
  const {
    undoDisabled,
    redoDisabled,
    onRemoveCard,
    onUndo,
    onRedo,
    onAddLink,
    onAddImage
  } = props;
  return (
    <div className={classes.bar}>
      <ButtonGroup
        vertical
        style={{
          background: '#30404d',
          boxShadow:
            '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)',
          border: '1px solid #137cbd'
        }}
      >
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onUndo();
          }}
          disabled={undoDisabled}
          title="Undo"
          minimal
          icon="undo"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onRedo();
          }}
          disabled={redoDisabled}
          title="Redo"
          minimal
          icon="redo"
        />
        <div style={{ height: '15px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onAddLink();
          }}
          title="Add link to a file"
          minimal
          icon="document-open"
        />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onAddImage();
          }}
          title="Add a local image"
          minimal
          icon="media"
        />
        <div style={{ height: '15px' }} />
        <Button
          onMouseDown={e => {
            e.preventDefault();
            onRemoveCard();
          }}
          minimal
          title="Remove the block"
        >
          <Icon icon="trash" style={{ color: '#ff7373' }} />
        </Button>
      </ButtonGroup>
    </div>
  );
}

export default MenuBar;
