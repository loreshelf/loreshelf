/* eslint-disable react/prop-types */
import React from 'react';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import Home from '../components/Home';

export default function HomePage() {
  return (
    <DndProvider backend={Backend}>
      <Home />
    </DndProvider>
  );
}
