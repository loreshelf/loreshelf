/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Card, Elevation, Icon } from '@blueprintjs/core';
import Editor from '../editor/Editor';
import MenuBar from '../editor/MenuBar';
import { options, menu } from '../editor/index';
import styles from './Board.css';

class Board extends Component {
  constructor() {
    super();
    this.state = {
      focusId: -1
    };
  }

  render() {
    const { items, onChange, addNewItem } = this.props;
    const { focusId } = this.state;
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
              options={options}
              onChange={doc => {
                console.log(doc);
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
}

export default Board;
