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
  ContextMenu,
  Card as BlueCard,
  Elevation,
  Icon,
  EditableText,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  Position,
  ButtonGroup
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

const Card: React.FC<CardProps> = forwardRef(
  (
    {
      card,
      workspace,
      collapsed,
      dividerIndex,
      dividerLeft,
      index,
      moveCard,
      hoverDivider,
      resetDivider,
      settings,
      onEditCard,
      onRemoveCard,
      onEditTitle,
      onRequestBoardsAsync,
      onRequestBoardDataAsync,
      onStartSpooling,
      onStopSpooling,
      onOpenImage,
      onMoveToTop,
      onMoveToBottom,
      onToggleCollapse,
      onOpenBoard
    },
    ref
  ) => {
    const blueRef = useRef<BlueCard>(null);
    const titleRef = useRef<EditableText>(null);

    const { notecardWidth } = settings;

    let cardData = card;
    if (card.spooling) {
      cardData = card.spooling.boardData.cards[card.spooling.cardIndex];
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

    const [, updateState] = React.useState();
    const forceUpdate = React.useCallback(() => updateState({}), []);
    const doubleWidth = card.spooling ? 2 : 1;

    return (
      <>
        <ButtonGroup
          className={`${card.spooling ? styles.spoolingCard : styles.card}`}
          style={{
            width: `${notecardWidth * doubleWidth}px`,
            minWidth: `${notecardWidth * doubleWidth}px`,
            maxWidth: `${notecardWidth * doubleWidth}px`
          }}
        >
          <div
            ref={blueRef}
            style={{
              opacity,
              width: `${notecardWidth}px`,
              minWidth: `${notecardWidth}px`,
              maxWidth: `${notecardWidth}px`
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
                {!workspace.readonly && (
                  <div ref={drag}>
                    <Icon
                      icon="drag-handle-vertical"
                      style={{
                        cursor: 'grab',
                        minWidth: '20px'
                      }}
                      onDoubleClick={onToggleCollapse}
                      onClick={() => {
                        if (collapsed) {
                          card.collapsed =
                            card.collapsed === undefined
                              ? false
                              : !card.collapsed;
                          forceUpdate();
                        }
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        let parent = e.target;
                        const rect = parent.getBoundingClientRect();
                        if (parent.tagName !== 'BUTTON') {
                          parent = e.target.offsetParent;
                        }
                        const boardContextMenu = React.createElement(
                          Menu,
                          {},
                          React.createElement(MenuItem, {
                            onClick: onMoveToTop,
                            icon: 'double-chevron-up',
                            text: 'Move to the top'
                          }),
                          React.createElement(MenuItem, {
                            onClick: onMoveToBottom,
                            icon: 'double-chevron-down',
                            text: 'Move to the bottom'
                          })
                        );

                        ContextMenu.show(
                          boardContextMenu,
                          {
                            left: rect.left - 5,
                            top: rect.bottom + 7
                          },
                          () => {
                            // menu was closed; callback optional
                          },
                          true
                        );
                      }}
                    />
                  </div>
                )}
                <Tooltip
                  content={card.title}
                  disabled={card.title.length <= 21}
                  position={Position.BOTTOM}
                  inheritDarkTheme
                >
                  <EditableText
                    ref={titleRef}
                    placeholder="Edit title..."
                    alwaysRenderInput={!card.spooling}
                    disabled={card.spooling || workspace.readonly}
                    onConfirm={() => {
                      titleRef.current.inputElement.blur();
                      // forceUpdate();
                    }}
                    value={card.title}
                    onChange={e => {
                      card.title = e;
                      onEditTitle(index, e);
                      forceUpdate();
                    }}
                  />
                </Tooltip>
                {card.title.length > 21 && (
                  <div style={{ marginLeft: '3px' }}>...</div>
                )}
              </h1>
              {(!collapsed || (collapsed && card.collapsed === false)) && (
                <Editor
                  doc={card.doc}
                  workspace={workspace}
                  index={index}
                  onChange={(doc, saveChanges) => {
                    onEditCard(index, doc, saveChanges);
                  }}
                  onRemoveCard={() => onRemoveCard(index)}
                  onRequestBoardsAsync={onRequestBoardsAsync}
                  onRequestBoardDataAsync={onRequestBoardDataAsync}
                  onStartSpooling={(workspaceName, boardName, cardName) => {
                    return onStartSpooling(
                      workspaceName,
                      boardName,
                      cardName,
                      index
                    );
                  }}
                  onOpenBoard={onOpenBoard}
                  onOpenImage={onOpenImage}
                  className={styles.editor}
                />
              )}
            </BlueCard>
          </div>
          {(!collapsed || (collapsed && card.collapsed === false)) &&
            card.spooling && (
              <BlueCard
                // eslint-disable-next-line react/no-array-index-key
                elevation={Elevation.TWO}
                style={{
                  marginTop: '30px',
                  minWidth: '220px',
                  width: '220px',
                  maxWidth: '220px'
                }}
              >
                <div
                  id={`subnote-${index}`}
                  className={styles.spoolingStatus}
                  style={{ position: 'sticky', top: '0', zIndex: '1' }}
                />
                <h1 className={styles.title}>
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
                  <Tooltip
                    content={cardData.title}
                    disabled={cardData.title.length <= 18}
                    position={Position.BOTTOM}
                    inheritDarkTheme
                  >
                    <EditableText
                      placeholder="Edit title..."
                      disabled
                      value={cardData.title}
                    />
                  </Tooltip>
                  {cardData.title.length > 18 && (
                    <div
                      style={{
                        marginLeft: '-19px',
                        paddingLeft: '3px',
                        paddingRight: '3px',
                        backgroundColor: '#0081C9',
                        zIndex: '2'
                      }}
                    >
                      ...
                    </div>
                  )}
                  <Button
                    icon="fullscreen"
                    minimal
                    title="Open notebook"
                    style={{
                      marginLeft: '-5px',
                      padding: '0px',
                      minWidth: '30px',
                      minHeight: '30px',
                      marginTop: '-5px',
                      backgroundColor: '#0081C9',
                      marginBottom: '-5px'
                    }}
                    onClick={() => onOpenBoard(card.spooling.boardData.path)}
                  />
                </h1>
                <Editor
                  doc={cardData.doc}
                  workspace={workspace}
                  index={index}
                  onChange={(doc, saveChanges) => {
                    onEditCard(index, doc, saveChanges, true);
                  }}
                  onRemoveCard={() => onRemoveCard(index)}
                  onRequestBoardsAsync={onRequestBoardsAsync}
                  onRequestBoardDataAsync={onRequestBoardDataAsync}
                  onStartSpooling={(workspaceName, boardName, cardName) => {
                    return onStartSpooling(
                      workspaceName,
                      boardName,
                      cardName,
                      index
                    );
                  }}
                  onOpenBoard={onOpenBoard}
                  onOpenImage={onOpenImage}
                  className={styles.editor}
                />
              </BlueCard>
            )}
        </ButtonGroup>
      </>
    );
  }
);

export default Card;
