/* eslint-disable react/prop-types */
import React from 'react';
import { Card, Elevation, Icon } from '@blueprintjs/core';
import CKEditor from '@ckeditor/ckeditor5-react';
import MarkdownEditor from '@ibek/ckeditor5-build-markdown';
import styles from './Board.css';

function Board(props) {
  const { items, onChange, addNewItem } = props;
  return (
    <div className={styles.board}>
      {items.map((item, id) => (
        <Card
          // eslint-disable-next-line react/no-array-index-key
          key={id}
          elevation={Elevation.ZERO}
          className={styles.card}
        >
          <CKEditor
            editor={MarkdownEditor}
            data={item}
            onChange={(event, editor) => {
              const data = editor.getData();
              onChange(id, data);
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
