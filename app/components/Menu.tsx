/* eslint-disable react/prop-types */
import React from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import styles from './Menu.css';

export default function Menu(props) {
  const { menuItems } = props;
  return (
    <div className={styles.menu}>
      <ButtonGroup
        vertical
        large
        minimal
        alignText="right"
        style={{
          minWidth: '150px',
          maxWidth: '150px'
        }}
      >
        {menuItems.map((item, id) => (
          // eslint-disable-next-line react/no-array-index-key
          <Button key={id}>{item}</Button>
        ))}
      </ButtonGroup>
    </div>
  );
}
