/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@blueprintjs/core';

class StatusBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: null,
      imgSrc: null
    };
    const { onOpenImage } = props;
    window.onmouseover = e => {
      const { content, imgSrc } = this.state;
      const url = e.target.getAttribute('href');
      if (content !== url) {
        const newStatus = url ? decodeURI(url) : null;
        this.setState({ content: newStatus });
      }
      const { className } = e.target;
      if (!imgSrc) {
        if (className === 'nodeImg') {
          const newButton = React.createElement(Button, {
            icon: 'zoom-in',
            small: true,
            onClick: () => {
              // eslint-disable-next-line react/destructuring-assignment
              const src = this.state.imgSrc;
              onOpenImage(src);
            }
          });
          const exists = document.getElementById('overlayOpenButton');
          if (exists) {
            exists.remove();
          }
          const buttonContainer = document.createElement('div');
          buttonContainer.setAttribute('id', 'overlayOpenButton');
          buttonContainer.style.float = 'right';
          buttonContainer.style.height = '0px';
          e.target.parentNode.prepend(buttonContainer);
          ReactDOM.render(newButton, buttonContainer);
          this.setState({ imgSrc: e.target.src });
        }
      } else if (
        imgSrc &&
        className !== 'nodeImg' &&
        e.target.parentNode.id !== 'overlayOpenButton' &&
        e.target.parentNode.parentNode.id !== 'overlayOpenButton' &&
        e.target.parentNode.parentNode.parentNode.id !== 'overlayOpenButton' &&
        e.target.parentNode.parentNode.parentNode.parentNode.id !==
          'overlayOpenButton'
      ) {
        document.getElementById('overlayOpenButton').remove();
        this.setState({ imgSrc: null });
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
