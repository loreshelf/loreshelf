import React from 'react';
import PropTypes from 'prop-types';
import { Card, Elevation } from '@blueprintjs/core';
import styles from './Board.css';

function Item(props) {
  // eslint-disable-next-line react/prop-types
  const { children, onEdit } = props;
  console.log(props);
  return (
    <Card
      elevation={Elevation.ZERO}
      interactive
      className={styles.card}
      onClick={onEdit}
    >
      {children}
    </Card>
  );
}

export default Item;
