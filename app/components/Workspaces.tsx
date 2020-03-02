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

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
}

function highlightText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }
  const regexp = new RegExp(words.join('|'), 'gi');
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const { length } = match[0];
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}

export const workspaceSelectProps = {
  itemPredicate: filterWorkspace,
  itemRenderer: renderWorkspace,
  items: DEFAULT_WORKSPACES
};
