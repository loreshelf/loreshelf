/* eslint-disable react/prop-types */
import React from 'react';
import map from 'lodash/map';
import classnames from 'classnames';
import classes from './MenuBar.css';

const Button = ({ state, dispatch }) => (item, key) => (
  <button
    key={key}
    type="button"
    className={classnames({
      [classes.button]: true,
      [classes.active]: item.active && item.active(state)
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

const MenuBar = ({ menu, children, view, top }) => {
  return (
    <div className={classes.bar} style={{ top }}>
      {children && <span className={classes.group}>{children}</span>}

      {map(menu, (item, key) => (
        <span key={key} className={classes.group}>
          {map(item, Button(view))}
        </span>
      ))}
    </div>
  );
};

export default MenuBar;
