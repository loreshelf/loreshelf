/* eslint-disable react/prop-types */
import React from 'react';
import { Icon } from '@blueprintjs/core';
import map from 'lodash/map';
import classnames from 'classnames';
import classes from './MenuBar.css';
import icons from './icons';

const Button = ({ state, dispatch }) => (item, key) => (
  <button
    key={key}
    type="button"
    className={classnames({
      [classes.button]: true,
      [classes.active]: item.active && item.active(state),
      [classes.right]: item.right
    })}
    title={item.title}
    disabled={item.enable && !item.enable(state)}
    onMouseDown={e => {
      e.preventDefault();
      item.run(state, dispatch);
    }}
  >
    {item.content}
  </button>
);

const MenuBar = ({ menu, view, onRemoveCard, top }) => {
  const menuItems = menu;
  menuItems.marks.remove = {
    title: 'Remove Card',
    content: icons.remove,
    right: true,
    run: onRemoveCard
  };
  return (
    <div className={classes.bar} style={{ top }}>
      {map(menuItems, (item, key) => (
        <div key={key} className={classes.group}>
          {map(item, Button(view))}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
