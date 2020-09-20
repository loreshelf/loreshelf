/* eslint-disable react/prop-types */
import React from 'react';
import { MenuItem, Button } from '@blueprintjs/core';
import { ItemPredicate, ItemRenderer } from '@blueprintjs/select';

export interface Workspace {
  name: string;
  path: string;
  numBoards: number;
}

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
  // eslint-disable-next-line no-constant-condition
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
    tokens.push(match[0]);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(<strong key={lastIndex}>{rest}</strong>);
  }
  return tokens;
}

export const renderWorkspace: ItemRenderer<Workspace> = (
  workspace,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <span key={workspace.path}>
      <Button
        icon="small-cross"
        onClick={e => {
          handleClick({ action: 'close', workspacePath: workspace.path });
        }}
        minimal
        style={{ float: 'left' }}
      />
      <MenuItem
        onClick={handleClick}
        text={highlightText(workspace.name, query)}
        label={workspace.numBoards.toString()}
      />
    </span>
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
  return normalizedTitle.indexOf(normalizedQuery) >= 0;
};

export const workspaceSelectProps = {
  itemPredicate: filterWorkspace,
  itemRenderer: renderWorkspace
};
