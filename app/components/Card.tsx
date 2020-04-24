/* eslint-disable no-param-reassign */
/* eslint-disable react/prop-types */
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
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
  EditableText,
  Button,
  Tooltip,
  Position
} from '@blueprintjs/core';
import { XYCoord } from 'dnd-core';
import { ipcRenderer } from 'electron';
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

const Card: React.FC<CardProps> = forwardRef(
  (
    {
      card,
      dividerIndex,
      dividerLeft,
      index,
      moveCard,
      hoverDivider,
      resetDivider,
      onEditCard,
      onRemoveCard,
      onEditTitle,
      onRequestBoardsAsync,
      onRequestBoardDataAsync,
      onStopSpooling
    },
    ref
  ) => {
    const blueRef = useRef<BlueCard>(null);
    const titleRef = useRef<EditableText>(null);
    const editorRef = useRef<Editor>(null);

    let cardData = card;
    let spoolingActive = '';
    if (card.spooling) {
      cardData = card.spooling.boardData.cards[card.spooling.cardIndex];
      spoolingActive =
        card.spooling.boardData.status === 'Saving...' ? styles.active : '';
    }

    const [, drop] = useDrop({
      accept: DragItemTypes.CARD,
      drop: (props, monitor) => {
        resetDivider();
        if (!blueRef.current) {
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
        const hoverBoundingRect = blueRef.current.getBoundingClientRect();

        const dropMiddleX =
          (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

        // Determine mouse position
        const clientOffset = monitor.getClientOffset();

        const dropClientX =
          (clientOffset as XYCoord).x - hoverBoundingRect.left;

        moveCard(sourceIndex, dropClientX < dropMiddleX);

        // You can do something with it
        // ChessActions.movePiece(item.fromPosition, props.position);
      },
      hover(item: DragItem, monitor: DropTargetMonitor) {
        if (!blueRef.current) {
          return;
        }
        const dragIndex = item.index;
        const hoverIndex = index;

        // Don't replace items with themselves
        if (dragIndex === hoverIndex) {
          return;
        }

        // Determine rectangle on screen
        const hoverBoundingRect = blueRef.current.getBoundingClientRect();

        const dropMiddleX =
          (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

        // Determine mouse position
        const clientOffset = monitor.getClientOffset();

        const dropClientX =
          (clientOffset as XYCoord).x - hoverBoundingRect.left;

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
    drop(blueRef);

    useImperativeHandle(ref, () => ({
      highlightSearchedLines(searchText) {
        if (searchText && card.doc.textContent.includes(searchText)) {
          blueRef.current.style.display = 'block';
          editorRef.current.highlightSearchedLines(searchText);
        } else if (!searchText) {
          blueRef.current.style.display = 'block';
          editorRef.current.highlightSearchedLines(searchText);
        } else {
          blueRef.current.style.display = 'none';
        }
      }
    }));

    const [, updateState] = React.useState();
    const forceUpdate = React.useCallback(() => updateState({}), []);

    return (
      <>
        <div
          ref={blueRef}
          className={`${styles.card}`}
          style={{
            opacity
          }}
        >
          <DragPreviewImage connect={preview} src={cardPreview} />
          {dividerIndex === index && dividerLeft && (
            <div
              style={{
                borderLeft: '1px solid hsl(206, 24%, 64%)',
                float: 'left',
                maxWidth: '0px',
                height: '100%',
                width: '0px',
                marginLeft: '-5px'
              }}
            />
          )}
          {dividerIndex === index && !dividerLeft && (
            <div
              style={{
                borderRight: '1px solid hsl(206, 24%, 64%)',
                float: 'right',
                maxWidth: '0px',
                height: '100%',
                width: '0px',
                marginRight: '-5px'
              }}
            />
          )}
          <BlueCard
            // eslint-disable-next-line react/no-array-index-key
            elevation={Elevation.TWO}
          >
            <h1 className={styles.title}>
              {card.spooling ? (
                <Button
                  icon="chevron-left"
                  minimal
                  title="Close gateway"
                  style={{
                    padding: '0px',
                    minWidth: '20px',
                    minHeight: '20px'
                  }}
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
              <Tooltip
                content={card.title}
                disabled={card.title.length <= 23}
                position={Position.BOTTOM}
                inheritDarkTheme
              >
                <EditableText
                  ref={titleRef}
                  placeholder="Edit title..."
                  alwaysRenderInput={!card.spooling}
                  disabled={card.spooling}
                  confirmOnEnterKey
                  onConfirm={() => {
                    titleRef.current.inputElement.blur();
                    setTimeout(() => {
                      titleRef.current.inputElement.parentElement.parentElement.parentElement.parentElement.nextSibling.firstChild.focus();
                    }, 100);
                  }}
                  value={card.title}
                  onChange={e => {
                    card.title = e;
                    onEditTitle(index, e);
                    forceUpdate();
                  }}
                />
              </Tooltip>
              {card.title.length > 23 && (
                <div style={{ marginLeft: '3px' }}>...</div>
              )}
            </h1>
            {card.spooling && (
              <div
                style={{
                  minHeight: '30px',
                  padding: '5px',
                  background: '#202b33',
                  cursor: 'default',
                  textIndent: '-20px',
                  paddingLeft: '25px'
                }}
                title="Gateway status"
              >
                <Button
                  icon="cross"
                  minimal
                  title="Close gateway"
                  style={{
                    padding: '0px',
                    minWidth: '20px',
                    minHeight: '20px',
                    float: 'right'
                  }}
                  onClick={() => onStopSpooling(index)}
                />
                <Icon
                  icon="exchange"
                  className={`${styles.spoolingStatus} ${spoolingActive}`}
                />
                {`@${cardData.title} from '${card.spooling.boardData.name}'`}
              </div>
            )}
            <Editor
              ref={editorRef}
              doc={cardData.doc}
              index={index}
              onChange={(doc, saveChanges) => {
                onEditCard(index, doc, saveChanges);
              }}
              onRemoveCard={() => onRemoveCard(index)}
              onRequestBoardsAsync={onRequestBoardsAsync}
              onRequestBoardDataAsync={onRequestBoardDataAsync}
              onStartSpooling={(boardPath, cardName) => {
                ipcRenderer.send(
                  'board-spooling-load',
                  boardPath,
                  index,
                  cardName
                );
              }}
              className={styles.editor}
            />
          </BlueCard>
        </div>
      </>
    );
  }
);

export default Card;
