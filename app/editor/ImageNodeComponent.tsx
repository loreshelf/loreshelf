/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { Icon } from '@blueprintjs/core';
import { findMarkdownIcon } from '../components/MarkdownIcons';

class ImageNodeComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      icon: props.attrs.src
    };
    this.changeToNextIcon = this.changeToNextIcon.bind(this);
  }

  changeToNextIcon() {
    const { attrs } = this.props;
    const mdi = findMarkdownIcon(attrs.src);
    attrs.src = mdi.next;
    this.setState({ icon: attrs.src });
    ipcRenderer.send('refresh-and-save');
  }

  render() {
    const { icon } = this.state;
    const mdi = findMarkdownIcon(icon);
    const intent = mdi?.intent;

    return (
      <>
        &nbsp;
        <Icon icon={icon} intent={intent} onClick={this.changeToNextIcon} />
        &nbsp;
      </>
    );
  }
}

export default ImageNodeComponent;
