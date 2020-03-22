/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import {
  Button,
  Card as BlueCard,
  Elevation,
  Icon,
  Intent,
  NonIdealState
} from '@blueprintjs/core';
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
      onEditTitle
    } = this.props;
    const { dividerIndex } = this.state;
    const items = boardData && boardData.items ? boardData.items : [];
    const titles = boardData && boardData.titles ? boardData.titles : [];
    const NewCard = (
      <Button intent={Intent.PRIMARY} onClick={onNewCard}>
        Add new card
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
    const cards = items.map((item, id) => (
      <Card
        key={id}
        data={item}
        title={titles[id]}
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
      />
    ));
    return (
      <div className={styles.board} ref={this.boardRef}>
        {items.length > 0 ? (
          <>
            {cards}
            <BlueCard
              key="addNew"
              elevation={Elevation.TWO}
              intent={Intent.SUCCESS}
              interactive
              className={styles.newCard}
              onClick={onNewCard}
            >
              <Icon icon="plus" iconSize={Icon.SIZE_LARGE} />
            </BlueCard>
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
}

export default Board;
