import React from 'react';

function ItemHeader(props) {
  // eslint-disable-next-line react/prop-types
  const { children } = props;
  return (
    <h5
      style={{
        marginBlockStart: '0.5em',
        marginBlockEnd: '0.5em',
        textTransform: 'uppercase'
      }}
    >
      {children}
    </h5>
  );
}

export default ItemHeader;
