/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import {
  Button,
  Intent,
  NonIdealState,
  Classes,
  Dialog,
  Overlay
} from '@blueprintjs/core';
import Card from './Card';
import styles from './Board.css';

class Board extends Component {
  constructor(props) {
    super(props);

    this.boardRef = React.createRef();
    this.state = {
      dividerIndex: -1,
      dividerLeft: false,
      imageSrc: null,
      collapsed: false
    };
    // const { boardData } = this.props;
    // this.numCards = boardData ? boardData.cards.length : 0;
    this.updateDivider = this.updateDivider.bind(this);
    this.openImage = this.openImage.bind(this);
    this.closeImage = this.closeImage.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { boardData } = this.props;
    if (this.state !== nextState) {
      return true;
    }
    if (boardData !== nextProps.boardData) {
      return true;
    }
    /** if (boardData) {
      if (boardData.cards.length !== this.numCards) {
        this.numCards = boardData.cards.length;
        return true;
      }
    } */
    return false;
  }

  updateDivider(newIndex, left) {
    this.setState({ dividerIndex: newIndex, dividerLeft: left });
  }

  openImage(imageSrc) {
    this.setState({ imageSrc });
  }

  closeImage() {
    this.setState({ imageSrc: null });
  }

  render() {
    const {
      boardData,
      workspace,
      onEditCard,
      onNewCard,
      onRemoveCard,
      onReorderCards,
      onEditTitle,
      onRequestBoardsAsync,
      onRequestBoardDataAsync,
      onStartSpooling,
      onStopSpooling,
      onOpenBoard
    } = this.props;
    const { dividerIndex, dividerLeft, imageSrc, collapsed } = this.state;
    const cardData = boardData && boardData.cards ? boardData.cards : [];
    const NewCard = (
      <Button intent={Intent.PRIMARY} onClick={onNewCard}>
        Add new notecard
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
    return (
      <div className={styles.board} ref={this.boardRef}>
        {cardData.length > 0 ? (
          <>
            {cardData.map((c, id) => (
              <Card
                key={`${c.title}-${cardData.indexOf(c)}`}
                card={c}
                workspace={workspace}
                collapsed={collapsed}
                index={cardData.indexOf(c)}
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
                onStartSpooling={onStartSpooling}
                onStopSpooling={onStopSpooling}
                onOpenImage={this.openImage}
                onMoveToTop={() => {
                  onReorderCards(cardData.indexOf(c), 0);
                }}
                onMoveToBottom={() => {
                  onReorderCards(cardData.indexOf(c), cardData.length - 1);
                }}
                onToggleCollapse={() => {
                  this.setState({ collapsed: !collapsed });
                }}
                onOpenBoard={onOpenBoard}
              />
            ))}
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
            <Overlay
              className={Classes.DARK}
              isOpen={imageSrc !== null}
              onClose={this.closeImage}
            >
              <div
                style={{ width: '100%', height: '100%', margin: '0' }}
                onClick={this.closeImage}
              >
                <img
                  src={imageSrc}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    bottom: '0',
                    right: '0',
                    margin: 'auto',
                    padding: '5px',
                    background: '#30404d'
                  }}
                />
              </div>
            </Overlay>
          </>
        ) : (
          <NonIdealState
            icon="new-layer"
            title="Empty Notebook"
            description="Start with adding a new notecard. Notecards contain key information that you want to remember next to the other related notecards within the notebook."
            action={NewCard}
          />
        )}
      </div>
    );
  }
}

export default Board;
