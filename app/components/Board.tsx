/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Button, Intent, NonIdealState } from '@blueprintjs/core';
import Card from './Card';
import styles from './Board.css';

class Board extends Component {
  constructor(props) {
    super(props);

    this.boardRef = React.createRef();
    this.state = { dividerIndex: -1 };
    this.updateDivider = this.updateDivider.bind(this);
  }

  updateDivider(newIndex) {
    this.setState({ dividerIndex: newIndex });
  }

  render() {
    const {
      boardData,
      onEditCard,
      onNewCard,
      onRemoveCard,
      onReorderCards,
      onEditTitle,
      onRequestBoardsAsync,
      onRequestBoardDataAsync,
      onStopSpooling
    } = this.props;
    const { dividerIndex } = this.state;
    const cardData = boardData && boardData.cards ? boardData.cards : [];
    const NewCard = (
      <Button intent={Intent.PRIMARY} onClick={onNewCard}>
        Add new block
      </Button>
    );
    const moveCard = (sourceIndex, left) => {
      if (left && sourceIndex > dividerIndex) {
        onReorderCards(sourceIndex, dividerIndex);
      } else if (left) {
        onReorderCards(sourceIndex, dividerIndex - 1);
      } else if (sourceIndex < dividerIndex) {
        onReorderCards(sourceIndex, dividerIndex - 1);
      } else {
        onReorderCards(sourceIndex, dividerIndex);
      }
    };
    const hoverDivider = (index, left) => {
      if (left && dividerIndex !== index) {
        this.updateDivider(index);
      } else if (!left && dividerIndex !== index + 1) {
        this.updateDivider(index + 1);
      }
    };
    const cards = cardData.map((c, id) => (
      <Card
        key={id}
        card={c}
        index={id}
        dividerIndex={dividerIndex}
        resetDivider={() => {
          this.setState({ dividerIndex: -1 });
        }}
        moveCard={moveCard}
        hoverDivider={hoverDivider}
        onEditCard={onEditCard}
        onRemoveCard={onRemoveCard}
        onEditTitle={onEditTitle}
        onRequestBoardsAsync={onRequestBoardsAsync}
        onRequestBoardDataAsync={onRequestBoardDataAsync}
        onStopSpooling={onStopSpooling}
      />
    ));
    return (
      <div className={styles.board} ref={this.boardRef}>
        {cardData.length > 0 ? (
          <>
            {cards}
            {cardData.length === dividerIndex && (
              <div
                style={{
                  width: '1px',
                  background: 'hsl(206, 24%, 64%)',
                  maxWidth: '1px',
                  marginRight: '-1px'
                }}
              />
            )}
          </>
        ) : (
          <NonIdealState
            icon="new-layer"
            title="Empty Notebook"
            description="Start with adding a new block. Blocks contain key information that you want to remember next to the other related blocks within the notebook."
            action={NewCard}
          />
        )}
      </div>
    );
  }
}

export default Board;
