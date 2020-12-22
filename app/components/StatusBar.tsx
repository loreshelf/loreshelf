/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  Elevation,
  InputGroup,
  Intent,
  Spinner,
  Tag
} from '@blueprintjs/core';

class StatusBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: null
    };
    window.onmouseover = e => {
      const { content } = this.state;
      const url = e.target.getAttribute('href');
      if (content !== url) {
        const newStatus = url ? decodeURI(url) : null;
        this.setState({ content: newStatus });
      }
    };
  }

  render() {
    const { content } = this.state;

    return (
      <div
        style={{
          float: 'left',
          maxWidth: '328px',
          position: 'absolute',
          bottom: '0px',
          left: '180px',
          wordWrap: 'break-word',
          zIndex: '10',
          backgroundColor: 'hsla(204, 33%, 97%, 1)',
          color: 'hsla(206, 24%, 21%, 1)',
          margin: '1px',
          padding: '3px',
          display: content ? 'block' : 'none'
        }}
      >
        {content}
      </div>
    );
  }
}

export default StatusBar;
