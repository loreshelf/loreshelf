/* eslint-disable react/prop-types */
import React from 'react';
import {
  Button,
  Card,
  Elevation,
  Icon,
  Intent,
  EditableText,
  NonIdealState
} from '@blueprintjs/core';
import Editor from '../editor/Editor';
import styles from './Board.css';

function Board(props) {
  const { boardData, onEditCard, onNewCard, onRemoveCard, onEditTitle } = props;
  const items = boardData && boardData.items ? boardData.items : [];
  const titles = boardData && boardData.titles ? boardData.titles : [];
  const NewCard = (
    <Button intent={Intent.PRIMARY} onClick={onNewCard}>
      Add new card
    </Button>
  );
  const cards = items.map((item, id) => (
    <Card
      // eslint-disable-next-line react/no-array-index-key
      key={id}
      elevation={Elevation.TWO}
      className={`${styles.card} `}
    >
      <h1 className={styles.title}>
        <EditableText
          maxLength={30}
          placeholder="Edit title..."
          alwaysRenderInput
          value={titles[id]}
          onChange={e => onEditTitle(id, e)}
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
  ));
  return (
    <div className={styles.board}>
      {items.length > 0 ? (
        <>
          {cards}
          <Card
            key="addNew"
            elevation={Elevation.ZERO}
            interactive
            className={styles.newCard}
            onClick={onNewCard}
          >
            <Icon icon="plus" iconSize={Icon.SIZE_LARGE} />
          </Card>
        </>
      ) : (
        <NonIdealState
          icon="new-layer"
          title="Empty Board"
          description="Start with adding a new card."
          action={NewCard}
        />
      )}
    </div>
  );
}

export default Board;
