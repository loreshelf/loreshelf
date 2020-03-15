/* eslint-disable react/prop-types */
import React from 'react';
import { MenuItem } from '@blueprintjs/core';
import { ItemPredicate, ItemRenderer } from '@blueprintjs/select';

export interface Workspace {
  name: string;
  path: string;
  numBoards: number;
}

export const DEFAULT_WORKSPACES: Workspace[] = [
  { name: 'Boards', path: '/home/ibek/Boards', numBoards: 2 }
];

export const renderWorkspace: ItemRenderer<Workspace> = (
  workspace,
  { handleClick, modifiers }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      key={workspace.path}
      onClick={handleClick}
      text={workspace.name}
      label={workspace.numBoards.toString()}
    />
  );
};

export const filterWorkspace: ItemPredicate<Workspace> = (
  query,
  workspace,
  _index,
  exactMatch
) => {
  const normalizedTitle = workspace.name.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  }
  return `${workspace.name}: ${workspace.path}`.indexOf(normalizedQuery) >= 0;
};

export const workspaceSelectProps = {
  itemPredicate: filterWorkspace,
  itemRenderer: renderWorkspace,
  items: DEFAULT_WORKSPACES
};
