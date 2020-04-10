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
    this.state = { dividerIndex: -1, dividerLeft: false };
    this.addCardRef = this.addCardRef.bind(this);
    this.updateDivider = this.updateDivider.bind(this);
  }

  updateDivider(newIndex, left) {
    this.setState({ dividerIndex: newIndex, dividerLeft: left });
  }

  addCardRef(node) {
    this.cardRefs = [...this.cardRefs, node];
  }

  highlightSearchedLines(searchText) {
    this.cardRefs.forEach(cardRef => {
      if (cardRef) {
        cardRef.highlightSearchedLines(searchText);
      }
    });
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
    this.cardRefs = [];
    const { dividerIndex, dividerLeft } = this.state;
    const cardData = boardData && boardData.cards ? boardData.cards : [];
    const NewCard = (
      <Button intent={Intent.PRIMARY} onClick={onNewCard}>
        Add new block
      </Button>
    );
    const moveCard = (sourceIndex, left) => {
      const di = !dividerLeft ? dividerIndex + 1 : dividerIndex;
      if (left && sourceIndex > di) {
        onReorderCards(sourceIndex, di);
      } else if (left) {
        onReorderCards(sourceIndex, di - 1);
      } else if (sourceIndex < di) {
        onReorderCards(sourceIndex, di - 1);
      } else {
        onReorderCards(sourceIndex, di);
      }
    };
    const hoverDivider = (index, left) => {
      if (dividerLeft !== left || dividerIndex !== index) {
        this.updateDivider(index, left);
      }
    };
    const cards = cardData.map((c, id) => (
      <Card
        ref={this.addCardRef}
        key={id}
        card={c}
        index={id}
        dividerIndex={dividerIndex}
        dividerLeft={dividerLeft}
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
