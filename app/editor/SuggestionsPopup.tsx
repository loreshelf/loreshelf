/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React from 'react';
import { Menu, MenuItem } from '@blueprintjs/core';
import classes from './SuggestionsPopup.css';

function SuggestionsPopup(props) {
  const {
    position,
    suggestions,
    onSelectSuggestion,
    textProperty,
    suggestionIndex
  } = props;
  const topPos = position.top + 20;

  return (
    <div>
      <Menu
        style={{
          left: position.left,
          top: topPos
        }}
        className={classes.suggestions}
      >
        {suggestions.map((suggestion, id) => {
          return (
            <MenuItem
              key={id}
              active={id === suggestionIndex}
              text={suggestion[textProperty]}
              onMouseDown={e => {
                e.preventDefault();
                onSelectSuggestion(suggestion);
              }}
            />
          );
        })}
      </Menu>
    </div>
  );
}

export default SuggestionsPopup;
