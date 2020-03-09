/* eslint-disable react/prop-types */
import React from 'react';
import { Card, Elevation, Icon } from '@blueprintjs/core';
import Editor from '../editor/Editor';
import styles from './Board.css';

function Board(props) {
  const { boardData, onChange, addNewItem } = props;
  const items = boardData && boardData.items ? boardData.items : [];
  return (
    <div className={styles.board}>
      {items.map((item, id) => (
        <Card
          // eslint-disable-next-line react/no-array-index-key
          key={id}
          elevation={Elevation.TWO}
          className={`${styles.card} `}
        >
          <Editor
            doc={item}
            onChange={doc => {
              onChange(id, doc);
            }}
          />
        </Card>
      ))}
      <Card
        key="addNew"
        elevation={Elevation.ZERO}
        interactive
        className={styles.newCard}
        onClick={addNewItem}
      >
        <Icon icon="plus" iconSize={Icon.SIZE_LARGE} />
      </Card>
    </div>
  );
}

export default Board;
