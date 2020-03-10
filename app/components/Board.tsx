/* eslint-disable react/prop-types */
import React from 'react';
import { Card, Elevation, Icon, EditableText } from '@blueprintjs/core';
import Editor from '../editor/Editor';
import styles from './Board.css';

function Board(props) {
  const { boardData, onEditCard, onNewCard, onRemoveCard, onEditTitle } = props;
  const items = boardData && boardData.items ? boardData.items : [];
  const titles = boardData && boardData.titles ? boardData.titles : [];
  return (
    <div className={styles.board}>
      {items.map((item, id) => (
        <Card
          // eslint-disable-next-line react/no-array-index-key
          key={id}
          elevation={Elevation.TWO}
          className={`${styles.card} `}
        >
          <h1>
            <EditableText
              maxLength={30}
              placeholder="Edit title..."
              alwaysRenderInput
              value={titles[id]}
              onChange={e => onEditTitle(id, e)}
              className={styles.title}
            />
          </h1>
          <Editor
            doc={item}
            onChange={doc => {
              onEditCard(id, doc);
            }}
            onRemoveCard={() => onRemoveCard(id)}
            className={styles.editor}
          />
        </Card>
      ))}
      <Card
        key="addNew"
        elevation={Elevation.ZERO}
        interactive
        className={styles.newCard}
        onClick={onNewCard}
      >
        <Icon icon="plus" iconSize={Icon.SIZE_LARGE} />
      </Card>
    </div>
  );
}

export default Board;
