import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { Card, Elevation } from '@blueprintjs/core';
import Item from './Item';
import ItemHeader from './ItemHeader';
import ItemProperty from './ItemProperty';
import styles from './Board.css';

function Board(props) {
  function editItem(item) {
    // eslint-disable-next-line react/prop-types
    props.onEdit(item);
  }

  const { markdownSrc } = props;
  const items = markdownSrc.trim().split(/(?=# )/g);
  return (
    <div className={styles.board}>
      {items.map(item => (
        <Card
          key={item.toString()}
          elevation={Elevation.ZERO}
          interactive
          className={styles.card}
          onClick={() => editItem(item)}
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
    </div>
  );
}

Board.propTypes = {
  markdownSrc: PropTypes.string.isRequired
};

export default Board;
