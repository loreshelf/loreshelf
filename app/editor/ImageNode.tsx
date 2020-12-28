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
      <Icon icon={attrs.src} intent={intent} style={{ padding: '0px 5px' }} />
    );
  }
  return <img src={src} title={title} alt={alt} className="nodeImg" />;
}

export default ImageNode;
