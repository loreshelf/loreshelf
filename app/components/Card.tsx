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
  EditableText
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
  data,
  title,
  dividerIndex,
  index,
  moveCard,
  hoverDivider,
  resetDivider,
  onEditCard,
  onRemoveCard,
  onEditTitle
}) => {
  const ref = useRef<BlueCard>(null);
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
            <div ref={drag}>
              <Icon icon="drag-handle-vertical" style={{ cursor: 'grab' }} />
            </div>
            <EditableText
              maxLength={23}
              placeholder="Edit title..."
              alwaysRenderInput
              value={title}
              onChange={e => onEditTitle(index, e)}
              style={{ width: '100%' }}
            />
          </h1>
          <Editor
            doc={data}
            onChange={doc => {
              onEditCard(index, doc);
            }}
            onRemoveCard={() => onRemoveCard(index)}
            className={styles.editor}
          />
        </BlueCard>
      </div>
    </>
  );
};

export default Card;
