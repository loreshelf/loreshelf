/* eslint-disable react/prop-types */
import React from 'react';
import { DndProvider } from 'react-dnd';
import DragAndDropBackend from './DragAndDropBackend';
import Home from '../components/Home';

export default function HomePage() {
  return (
    <DndProvider backend={DragAndDropBackend}>
      <Home />
    </DndProvider>
  );
}
