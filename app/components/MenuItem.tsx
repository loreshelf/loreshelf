/* eslint-disable no-param-reassign */
/* eslint-disable react/prop-types */
import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Button } from '@blueprintjs/core';
import DragItemTypes from '../utils/DragItemTypes';

const Card: React.FC = ({ disabled, onClick, moveCard, children }) => {
  const ref = useRef<Button>(null);
  const [{ isOver }, drop] = useDrop({
    accept: DragItemTypes.CARD,
    drop: (props, monitor) => {
      if (!ref.current) {
        return;
      }
      const item = monitor.getItem();
      const sourceIndex = item.index;
      moveCard(sourceIndex);
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  });

  drop(ref);
  const active = isOver && !disabled;
  return (
    <div ref={ref}>
      <Button active={active} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </div>
  );
};

export default Card;
