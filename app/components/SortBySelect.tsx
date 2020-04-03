/* eslint-disable react/prop-types */
import React from 'react';
import { MenuItem } from '@blueprintjs/core';
import { ItemRenderer } from '@blueprintjs/select';

export interface SortOption {
  name: string;
  asc: boolean;
}

export const renderSort: ItemRenderer<SortOption> = (
  sorting,
  { handleClick, modifiers }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const icon = sorting.asc ? 'sort-asc' : 'sort-desc';
  return (
    <span key={`${sorting.name}-${icon}`}>
      <MenuItem
        onClick={handleClick}
        icon={icon}
        text={` Sort by ${sorting.name}`}
      />
    </span>
  );
};
