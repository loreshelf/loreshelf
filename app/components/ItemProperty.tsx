import React from 'react';
import PropTypes from 'prop-types';

function ItemProperty(props) {
  // eslint-disable-next-line react/prop-types
  const { children } = props;
  const text = children;
  if (text && text.startsWith('%') && text.includes('\n')) {
    const label = text.substring(1, text.indexOf('\n'));
    const content = text.substring(text.indexOf('\n'));
    return (
      <>
        <sub>
          {label}
          <br />
        </sub>
        {content}
      </>
    );
  }
  return <>{text}</>;
}

export default ItemProperty;
