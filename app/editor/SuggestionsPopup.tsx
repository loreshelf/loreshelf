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
  const height = suggestions.length * 30;
  let topPos = position.top + 20;
  const maxTopPos = window.innerHeight - height;
  let adjustLeftPos = 0;
  if (topPos > maxTopPos) {
    topPos = maxTopPos;
    adjustLeftPos = 10;
  }

  return (
    <div>
      <Menu
        style={{
          left: position.left + adjustLeftPos,
          top: topPos
        }}
        className={classes.suggestions}
      >
        {suggestions.map((suggestion, id) => {
          let title = null;
          if (suggestion.path) {
            const lastSlash = suggestion.path.lastIndexOf('/');
            const previousSlash = suggestion.path.lastIndexOf(
              '/',
              lastSlash - 1
            );
            title = "from '";
            title += suggestion.path.substring(previousSlash + 1, lastSlash);
            title += "' notebook";
          }
          return (
            <MenuItem
              key={id}
              active={id === suggestionIndex}
              text={suggestion[textProperty]}
              title={title}
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
