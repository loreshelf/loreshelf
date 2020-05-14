/* eslint-disable react/prop-types */
import React from 'react';
import { Icon } from '@blueprintjs/core';
import { findMarkdownIcon } from '../components/MarkdownIcons';

function ImageNode(props) {
  const { src, title, alt } = props;
  if (alt === 'Icon') {
    const mdi = findMarkdownIcon(src);
    const intent = mdi?.intent;
    return (
      <>
        &nbsp;
        <Icon icon={src} intent={intent} />
        &nbsp;
      </>
    );
  }
  return (
    <img
      src={src}
      title={title}
      alt={alt}
      style={{ width: 'calc(100% + 10px)', margin: '-5px' }}
    />
  );
}

export default ImageNode;
