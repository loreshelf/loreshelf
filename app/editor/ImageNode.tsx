/* eslint-disable react/prop-types */
import React from 'react';
import { Icon } from '@blueprintjs/core';
import { findMarkdownIcon } from '../components/MarkdownIcons';
import ImageNodeComponent from './ImageNodeComponent';

function ImageNode(props) {
  const { src, title, alt, attrs } = props;
  if (alt === 'Icon') {
    const mdi = findMarkdownIcon(attrs.src);
    const intent = mdi?.intent;
    if (mdi.next) {
      return <ImageNodeComponent attrs={attrs} />;
    }
    return (
      <>
        &nbsp;
        <Icon icon={attrs.src} intent={intent} />
        &nbsp;
      </>
    );
  }
  return <img src={src} title={title} alt={alt} />;
}

export default ImageNode;
