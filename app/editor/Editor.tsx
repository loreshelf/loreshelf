/* eslint-disable react/prop-types */
import React from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import { keymap } from 'prosemirror-keymap';
import style from './Editor.css';
import MenuBar from './MenuBar';
import LinkPopup from './LinkPopup';
import plugins from './plugins';

class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.editorRef = React.createRef();
    this.linkRef = React.createRef();
    const { attributes, nodeViews, doc } = this.props;

    plugins.push(
      keymap({
        Escape: () => {
          this.view.root.activeElement.blur();
        }
      })
    );

    this.view = new EditorView(null, {
      state: EditorState.create({
        doc,
        plugins
      }),
      dispatchTransaction: transaction => {
        const { state, transactions } = this.view.state.applyTransaction(
          transaction
        );

        this.view.updateState(state);

        if (transactions.some(tr => tr.docChanged)) {
          const { onChange } = this.props;
          onChange(state.doc);
        }

        this.forceUpdate();
      },
      attributes,
      nodeViews
    });

    this.setLink = this.setLink.bind(this);

    // console.log(this.view.state.doc);
  }

  componentDidMount() {
    this.editorRef.current.insertBefore(
      this.view.dom,
      this.editorRef.current.firstChild
    );
    const { autoFocus } = this.props;

    if (autoFocus) {
      this.view.focus();
    }
  }

  componentDidUpdate() {
    const { doc } = this.props;
    if (this.view.state.doc !== doc) {
      this.view.updateState(
        EditorState.create({
          doc,
          plugins
        })
      );
      this.forceUpdate();
    }
  }

  get content() {
    return defaultMarkdownSerializer.serialize(this.view.state.doc);
  }

  setLink() {
    this.linkRef.current.setLink();
  }

  render() {
    const { onRemoveCard } = this.props;
    const { state } = this.view;
    const { from } = state.selection;
    // TODO: improve performance?
    const url = this.view.domAtPos(from).node.parentElement.href;
    return (
      <div ref={this.editorRef} className={style.editor}>
        <MenuBar
          view={this.view}
          onRemoveCard={onRemoveCard}
          onSetLink={this.setLink}
        />
        <LinkPopup ref={this.linkRef} url={url} view={this.view} />
      </div>
    );
  }
}

export default Editor;
