/* eslint-disable react/prop-types */
import React from 'react';
import { MenuItem } from '@blueprintjs/core';
import { ItemRenderer } from '@blueprintjs/select';

export interface FilterOption {
  name: string;
  icon: string;
}

export const renderFilter: ItemRenderer<FilterOption> = (
  filtering,
  { handleClick, modifiers }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <span key={`${filtering.name}-${filtering.icon}`}>
      <MenuItem
        onClick={handleClick}
        icon={filtering.icon}
        text={` ${filtering.name}`}
      />
    </span>
  );
};
