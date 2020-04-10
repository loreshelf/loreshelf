/* eslint-disable react/prop-types */
import React from 'react';
import { MenuItem } from '@blueprintjs/core';
import { ItemRenderer } from '@blueprintjs/select';

export interface SortOption {
  name: string;
  asc: boolean;
  icon: string;
}

export const renderSort: ItemRenderer<SortOption> = (
  sorting,
  { handleClick, modifiers }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <span key={`${sorting.name}-${sorting.icon}`}>
      <MenuItem
        onClick={handleClick}
        icon={sorting.icon}
        text={` Sort by ${sorting.name}`}
      />
    </span>
  );
};
