/* eslint-disable no-param-reassign */
/* eslint-disable react/prop-types */
import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import DragItemTypes from '../utils/DragItemTypes';

const BoardDrop: React.FC = ({ moveCard, children }) => {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: DragItemTypes.CARD,
    drop: (props, monitor) => {
      if (!ref.current) {
        return;
      }
      const item = monitor.getItem();
      const sourceIndex = item.index;
      moveCard(sourceIndex);
    }
  });

  drop(ref);
  return (
    <div
      ref={ref}
      style={{
        paddingLeft: '30px',
        paddingRight: '67px',
        paddingBottom: '30px'
      }}
    >
      {children}
    </div>
  );
};

export default BoardDrop;
