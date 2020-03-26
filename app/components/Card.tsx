/* eslint-disable no-param-reassign */
/* eslint-disable react/prop-types */
import React, { useRef } from 'react';
import {
  useDrag,
  useDrop,
  DropTargetMonitor,
  DragPreviewImage
} from 'react-dnd';
import {
  Card as BlueCard,
  Elevation,
  Icon,
  Intent,
  Callout,
  EditableText,
  Button
} from '@blueprintjs/core';
import { XYCoord } from 'dnd-core';
import Editor from '../editor/Editor';
import DragItemTypes from '../utils/DragItemTypes';
import styles from './Card.css';
import cardPreview from '../resources/cardPreview.png';

export interface CardProps {
  id: any;
  text: string;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
}

interface DragItem {
  index: number;
  type: string;
}

const Card: React.FC<CardProps> = ({
  card,
  dividerIndex,
  index,
  moveCard,
  hoverDivider,
  resetDivider,
  onEditCard,
  onRemoveCard,
  onEditTitle,
  onRequestBoardsAsync,
  onRequestBoardDataAsync,
  onStartSpooling,
  onStopSpooling
}) => {
  const ref = useRef<BlueCard>(null);
  const titleRef = useRef<EditableText>(null);

  let cardData = card;
  if (card.spooling) {
    cardData = card.spooling.boardData.cards[card.spooling.cardIndex];
  }

  const [, drop] = useDrop({
    accept: DragItemTypes.CARD,
    drop: (props, monitor) => {
      resetDivider();
      if (!ref.current) {
        return;
      }
      const item = monitor.getItem();
      const sourceIndex = item.index;
      const targetIndex = index;

      // Don't replace items with themselves
      if (sourceIndex === targetIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      const dropMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      const dropClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;

      moveCard(sourceIndex, dropClientX < dropMiddleX);

      // You can do something with it
      // ChessActions.movePiece(item.fromPosition, props.position);
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      const dropMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      const dropClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;

      if (dropClientX < dropMiddleX) {
        hoverDivider(index, true);
        return;
      }
      if (dropClientX >= dropMiddleX) {
        hoverDivider(index, false);
      }
    }
  });

  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: DragItemTypes.CARD, index },
    end: () => {
      resetDivider();
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging()
    })
  });

  const opacity = isDragging ? 0.5 : 1;
  drop(ref);
  return (
    <>
      <DragPreviewImage connect={preview} src={cardPreview} />
      {dividerIndex === index && (
        <div
          style={{
            background: 'hsl(206, 24%, 64%)',
            maxWidth: '1px',
            width: '1px',
            marginLeft: '-1px'
          }}
        />
      )}
      <div
        ref={ref}
        className={`${styles.card}`}
        style={{
          opacity
        }}
      >
        <BlueCard
          // eslint-disable-next-line react/no-array-index-key
          elevation={Elevation.TWO}
        >
          <h1 className={styles.title}>
            {card.spooling ? (
              <Button
                icon="chevron-left"
                minimal
                style={{ padding: '0px', minWidth: '20px', minHeight: '20px' }}
                onClick={() => onStopSpooling(index)}
              />
            ) : (
              <div ref={drag}>
                <Icon
                  icon="drag-handle-vertical"
                  style={{ cursor: 'grab', minWidth: '20px' }}
                />
              </div>
            )}
            <EditableText
              ref={titleRef}
              maxLength={23}
              placeholder="Edit title..."
              alwaysRenderInput={!card.spooling}
              disabled={card.spooling}
              confirmOnEnterKey
              onConfirm={() => {
                titleRef.current.inputElement.blur();
                // console.log(titleRef.current);
                setTimeout(() => {
                  titleRef.current.inputElement.parentElement.parentElement.nextSibling.firstChild.focus();
                }, 100);
              }}
              value={card.title}
              onChange={e => onEditTitle(index, e)}
              style={{ width: '100%' }}
            />
          </h1>
          {card.spooling && (
            <Callout intent={Intent.WARNING} icon="exchange">
              {`Spooling '${cardData.title}' from '${card.spooling.boardData.name}'`}
              <Button
                icon="cross"
                minimal
                style={{
                  padding: '0px',
                  minWidth: '20px',
                  minHeight: '20px',
                  float: 'right'
                }}
                onClick={() => onStopSpooling(index)}
              />
            </Callout>
          )}
          <Editor
            doc={cardData.doc}
            onChange={doc => {
              onEditCard(index, doc);
            }}
            onRemoveCard={() => onRemoveCard(index)}
            onRequestBoardsAsync={onRequestBoardsAsync}
            onRequestBoardDataAsync={onRequestBoardDataAsync}
            onStartSpooling={(boardPath, cardName) => {
              onStartSpooling(boardPath, cardName, index);
            }}
            className={styles.editor}
          />
        </BlueCard>
      </div>
    </>
  );
};

export default Card;
