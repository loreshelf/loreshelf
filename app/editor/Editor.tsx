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

    /** const a = markdownit('default', { html: false }).parse(
      `
Markdown | Less | Pretty
--- | --- | ---
Still | renders | nicely
      `,
      {}
    );
    console.log(a); */

    this.editorRef = React.createRef();
    this.linkRef = React.createRef();
    const { attributes, nodeViews, doc } = this.props;

    this.state = { activeSuggestion: false, suggestionPos: -1 };

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
        const { activeSuggestion, suggestionPos } = this.state;

        this.view.updateState(state);

        const currentCursor = state.selection.from;
        let suggestionText = '';
        console.log(`current: ${currentCursor}`);
        console.log(`suggestion: ${suggestionPos}`);

        if (transactions.some(tr => tr.docChanged)) {
          const { onChange } = this.props;
          const { selection } = state;

          const step = transaction.steps[0];
          if (
            !activeSuggestion &&
            step.from === step.to &&
            step.slice.content.content[0].text === '@'
          ) {
            onChange(state.doc);
            const isSuggestion = this.isTextSuggestion(transaction);
            if (isSuggestion) {
              this.setState({
                activeSuggestion: true,
                suggestionPos: selection.from
              });
            }
          } else if (activeSuggestion) {
            const cursor = transaction.curSelection.$anchor.parentOffset;
            const paragraph =
              transaction.curSelection.$anchor.path[3].content.content[0].text;
            let where = paragraph.lastIndexOf(' @', cursor) + 1;
            if (where < 1) {
              where = paragraph.lastIndexOf('@', cursor);
              if (where !== 0) {
                where = -1;
              }
            }
            suggestionText =
              where >= 0 ? paragraph.substring(where, cursor) : '';
            console.log(paragraph);
            console.log(suggestionText);
            onChange(state.doc);
          } else {
            onChange(state.doc);
          }
        }

        if (activeSuggestion) {
          const diff = currentCursor - suggestionPos;
          console.log(`diff: ${diff}`);
          if (diff < 0 || diff > suggestionText.length) {
            this.setState({
              activeSuggestion: false,
              suggestionPos: -1
            });
          }
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

  // eslint-disable-next-line class-methods-use-this
  isTextSuggestion(transaction) {
    const cursor = transaction.curSelection.$anchor.parentOffset;
    const paragraph =
      transaction.curSelection.$anchor.path[3].content.content[0].text;
    let where = paragraph.lastIndexOf(' @', cursor) + 1;
    const onlyTheFirst = paragraph.lastIndexOf('@', cursor);
    if (where < 1) {
      where = onlyTheFirst;
      if (where !== 0) {
        where = -1;
      }
    }
    return where >= 0 && where === onlyTheFirst;
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
