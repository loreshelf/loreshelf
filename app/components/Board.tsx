/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Card, Elevation, Icon } from '@blueprintjs/core';
import CKEditor from '@ckeditor/ckeditor5-react';
import { convertFromHTML, ContentState, EditorState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import MarkdownEditor from '@ibek/ckeditor5-build-markdown';
import styles from './Board.css';

const contentBlocks = convertFromHTML(
  '<p>Lorem ipsum ' +
    'dolor sit amet, consectetur adipiscing elit. Mauris tortor felis, volutpat sit amet ' +
    'maximus nec, tempus auctor diam. Nunc odio elit,  ' +
    'commodo quis dolor in, sagittis scelerisque nibh. ' +
    'Suspendisse consequat, sapien sit amet pulvinar  ' +
    'tristique, augue ante dapibus nulla, eget gravida ' +
    'turpis est sit amet nulla. Vestibulum lacinia mollis  ' +
    'accumsan. Vivamus porta cursus libero vitae mattis. ' +
    'In gravida bibendum orci, id faucibus felis molestie ac.  ' +
    'Etiam vel elit cursus, scelerisque dui quis, auctor risus.</p>'
);

class Board extends Component {
  constructor() {
    super();
    const contentState = ContentState.createFromBlockArray(contentBlocks);
    const editorState = EditorState.createWithContent(contentState);
    this.state = {
      focusId: -1,
      editorState
    };
  }

  onEditorStateChange: Function = editorState => {
    this.setState({
      editorState
    });
  };

  render() {
    const { items, onChange, addNewItem } = this.props;
    const { focusId, editorState } = this.state;
    return (
      <div className={styles.board}>
        {items.map((item, id) => (
          <Card
            // eslint-disable-next-line react/no-array-index-key
            key={id}
            elevation={Elevation.TWO}
            className={`${styles.card} `}
          >
            <Editor
              toolbarClassName={styles.toolbarAbsolute}
              wrapperClassName={styles.wrapper}
              editorClassName={`${styles.editor} ${
                focusId === id ? styles.hasFocus : ''
              }`}
              onEditorStateChange={this.onEditorStateChange}
              defaultEditorState={editorState}
              onFocus={() => this.setState({ focusId: id })}
              onBlur={() => this.setState({ focusId: -1 })}
              toolbarOnFocus
              toolbar={{
                options: ['inline', 'blockType'],
                inline: {
                  options: ['bold', 'italic', 'underline'],
                  bold: { className: 'bordered-option-classname' },
                  italic: { className: 'bordered-option-classname' },
                  underline: { className: 'bordered-option-classname' }
                },
                blockType: {
                  className: 'bordered-option-classname'
                }
              }}
            />
          </Card>
        ))}
        <Card
          key="addNew"
          elevation={Elevation.ZERO}
          interactive
          className={styles.newCard}
          onClick={addNewItem}
        >
          <Icon icon="plus" iconSize={Icon.SIZE_LARGE} />
        </Card>
      </div>
    );
  }
}

export default Board;
