/* eslint-disable react/prop-types */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, Elevation } from '@blueprintjs/core';
import ItemHeader from './ItemHeader';
import ItemProperty from './ItemProperty';
import styles from './Board.css';

function Board(props) {
  const { items, onEdit, addNewItem } = props;
  return (
    <div className={styles.board}>
      {items.map((item, id) => (
        <Card
          // eslint-disable-next-line react/no-array-index-key
          key={id}
          elevation={Elevation.ZERO}
          interactive
          className={styles.card}
          onClick={() => onEdit(id, item)}
        >
          <ReactMarkdown
            source={item}
            renderers={{
              ...{ heading: ItemHeader },
              ...{ text: ItemProperty }
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
        +
      </Card>
    </div>
  );
}

export default Board;
