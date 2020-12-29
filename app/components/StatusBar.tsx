/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { clipboard } from 'electron';
import { Button } from '@blueprintjs/core';

class StatusBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: null,
      imgSrc: null,
      codeSrc: null
    };
    const { onOpenImage } = props;
    window.onmouseover = e => {
      const { content, imgSrc, codeSrc } = this.state;
      const url = e.target.getAttribute('href');
      if (content !== url) {
        const newStatus = url ? decodeURI(url) : null;
        this.setState({ content: newStatus });
      }
      const { className, nodeName } = e.target;
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
      // Copy button in code block
      if (
        (!codeSrc &&
          nodeName === 'CODE' &&
          e.target.parentNode.nodeName === 'PRE') ||
        nodeName === 'PRE'
      ) {
        const newButton = React.createElement(Button, {
          icon: 'duplicate',
          small: true,
          onClick: () => {
            // eslint-disable-next-line react/destructuring-assignment
            const src = this.state.codeSrc;
            clipboard.writeText(src);
          }
        });
        const exists = document.getElementById('overlayCopyButton');
        if (exists) {
          exists.remove();
        }
        const buttonContainer = document.createElement('div');
        buttonContainer.setAttribute('id', 'overlayCopyButton');
        buttonContainer.style.float = 'right';
        buttonContainer.style.height = '0px';
        let newCodeSrc;
        if (nodeName === 'PRE') {
          newCodeSrc = e.target.firstChild.textContent;
          e.target.prepend(buttonContainer);
        } else {
          newCodeSrc = e.target.textContent;
          e.target.parentNode.prepend(buttonContainer);
        }
        ReactDOM.render(newButton, buttonContainer);
        this.setState({ codeSrc: newCodeSrc });
      } else if (
        codeSrc &&
        nodeName !== 'CODE' &&
        nodeName !== 'PRE' &&
        e.target.parentNode.id !== 'overlayCopyButton' &&
        e.target.parentNode.parentNode.id !== 'overlayCopyButton' &&
        e.target.parentNode.parentNode.parentNode.id !== 'overlayCopyButton' &&
        e.target.parentNode.parentNode.parentNode.parentNode.id !==
          'overlayCopyButton'
      ) {
        document.getElementById('overlayCopyButton').remove();
        this.setState({ codeSrc: null });
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
