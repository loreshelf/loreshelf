/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Callout, ButtonGroup, Button } from '@blueprintjs/core';
import { clipboard, shell } from 'electron';
import { schema } from './schema';

class LinkPopup extends Component {
  constructor(props) {
    super(props);
    this.linkRef = React.createRef();
  }

  render() {
    const { view, url } = this.props;
    const { state, dispatch } = view;
    const { from, to } = state.selection;
    // These are in screen coordinates
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    // The box in which the tooltip is positioned, to use as base
    const box =
      this.linkRef.current && this.linkRef.current.offsetParent
        ? this.linkRef.current.offsetParent.getBoundingClientRect()
        : undefined;
    // Find a center-ish x position from the selection endpoints (when
    // crossing lines, end may be more to the left)
    const left = Math.max((start.left + end.left) / 2, start.left + 3);
    const leftPos = box && url ? `${left - box.left - 60}px` : '-1000px';
    const bottomPos =
      box && url ? `${box.bottom - start.top - 50}px` : '-1000px';

    return (
      <div
        ref={this.linkRef}
        style={{
          position: 'absolute',
          background: 'black',
          left: leftPos,
          bottom: bottomPos,
          maxWidth: '165px',
          minHeight: '30px',
          height: '30px',
          maxHeight: '30px',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
      >
        <Callout style={{ background: '#30404d', padding: '0px' }}>
          <ButtonGroup>
            <Button
              onMouseDown={e => {
                e.preventDefault();
                if (url.startsWith('file')) {
                  shell.openItem(url);
                } else {
                  window.open(url, '_blank');
                }
              }}
              title={url}
              icon="share"
            >
              Open
            </Button>
            <Button
              onMouseDown={e => {
                e.preventDefault();
                clipboard.writeText(url);
              }}
              title="Copy URL to clipboard"
              icon="clipboard"
            />
            <Button
              onMouseDown={e => {
                e.preventDefault();
                const { $cursor } = state.selection;
                const isLink = (child: NodeChild) =>
                  child.node &&
                  child.node.marks.find(mark => mark.type === linkMarkType);
                const childBefore = $cursor.doc.childBefore($cursor.pos);
                const childAfter = $cursor.doc.childAfter($cursor.pos);
                const link = isLink(childBefore) ? childBefore : childAfter;
                const fromLink = link.offset;
                const toLink = fromLink + link.node.nodeSize;
                dispatch(
                  state.tr.removeMark(fromLink, toLink, schema.marks.link)
                );
              }}
              icon="disable"
            />
          </ButtonGroup>
        </Callout>
      </div>
    );
  }
}

export default LinkPopup;
