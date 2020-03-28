/* eslint-disable react/no-array-index-key */
/* eslint-disable react/no-unused-state */
/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */
import React from 'react';
import { Menu, MenuItem } from '@blueprintjs/core';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import { keymap } from 'prosemirror-keymap';
import style from './Editor.css';
import MenuBar from './MenuBar';
import LinkPopup from './LinkPopup';
import plugins from './plugins';
import SuggestionsPopup from './SuggestionsPopup';
import { schema } from './schema';

const MAX_SUGGESTIONS = 5;

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
    const {
      attributes,
      nodeViews,
      doc,
      onRequestBoardsAsync,
      onStartSpooling
    } = this.props;

    this.state = {
      suggestionPos: -1,
      suggestions: [],
      filteredSuggestions: [],
      suggestionPhase: 1,
      selectedSuggestion: {},
      cursor: undefined
    };

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
        const {
          suggestionPos,
          suggestions,
          selectedSuggestion,
          suggestionPhase
        } = this.state;

        this.view.updateState(state);

        const currentCursor = state.selection.from;
        let suggestionText = '';
        let filteredSuggestions = [];

        if (transactions.some(tr => tr.docChanged)) {
          const { onChange } = this.props;
          const { selection } = state;

          const step = transaction.steps[0];
          if (
            suggestionPos < 0 &&
            step.from === step.to &&
            step.slice.content.content[0].text === '@'
          ) {
            onChange(state.doc);
            const isSuggestion = this.isTextSuggestion(transaction);
            if (isSuggestion) {
              this.requestSuggestionPhase1(selection.from);
            }
          } else if (suggestionPos >= 0) {
            const { $anchor } = transaction.curSelection;
            const cursor = $anchor.parentOffset;
            const content = $anchor.path[3].content.content[0];
            const backToPhase1 =
              suggestionPhase === 2 &&
              content &&
              content.text &&
              !content.text.startsWith(`@${selectedSuggestion.board.name}/`); // removed / so return to phase 1

            if (content) {
              const paragraph = content.text;
              let where = paragraph.lastIndexOf(' @', cursor) + 1;
              if (where < 1) {
                where = paragraph.lastIndexOf('@', cursor);
                if (where !== 0) {
                  where = -1;
                }
              }
              suggestionText =
                where >= 0 ? paragraph.substring(where + 1, cursor) : '';
              let filterText;
              if (selectedSuggestion.board) {
                // phase 2
                filterText = suggestionText.substring(
                  selectedSuggestion.board.name.length + 1
                );
              } else {
                // phase 1
                filterText = suggestionText;
              }
              filteredSuggestions = suggestions
                .filter(s =>
                  s[this.getSuggestionProperty()].includes(filterText)
                )
                .slice(0, MAX_SUGGESTIONS);
            }
            onChange(state.doc);
            if (backToPhase1) {
              this.requestSuggestionPhase1(suggestionPos);
            }
          } else {
            onChange(state.doc);
          }
        }

        if (suggestionPos >= 0) {
          const diff = currentCursor - suggestionPos;
          if (diff < 0 || diff > suggestionText.length + 1) {
            this.resetSuggestions();
          }
        }

        const linkElement = this.view.domAtPos(currentCursor).node
          .parentElement;
        if (linkElement.classList.contains('cardLink')) {
          const url = linkElement.href;
          const separatorSpooling = url.lastIndexOf('@');
          const separatorIndex = url.lastIndexOf('/');
          const boardPath = decodeURI(
            url.substring(separatorSpooling + 1, separatorIndex)
          );
          const cardName = decodeURI(url.substring(separatorIndex + 1));
          console.log(boardPath);
          onStartSpooling(boardPath, cardName);
        }

        // this.forceUpdate();
        this.setState({
          cursor: currentCursor,
          filteredSuggestions
        });
      },
      attributes,
      nodeViews
    });

    this.setLink = this.setLink.bind(this);
    this.selectSuggestion = this.selectSuggestion.bind(this);

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

  getSuggestionProperty() {
    const { suggestionPhase } = this.state;
    let textProperty;
    if (suggestionPhase === 1) {
      textProperty = 'name'; // boardMeta.name
    } else if (suggestionPhase === 2) {
      textProperty = 'title'; // boardData.cards.title
    }
    return textProperty;
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

  requestSuggestionPhase1(cursor) {
    const { onRequestBoardsAsync } = this.props;
    this.resetSuggestions(cursor);
    onRequestBoardsAsync()
      .then(newBoards => {
        this.setState({
          suggestions: newBoards,
          filteredSuggestions: newBoards.slice(0, MAX_SUGGESTIONS)
        });
      })
      .catch(error => {
        console.log(error);
      });
  }

  resetSuggestions(suggestionPos?) {
    this.setState({
      suggestionPos: suggestionPos || -1,
      suggestions: [],
      filteredSuggestions: [],
      suggestionPhase: 1,
      selectedSuggestion: {}
    });
  }

  selectSuggestion(suggestion) {
    const {
      suggestionPhase,
      suggestionPos,
      selectedSuggestion,
      cursor
    } = this.state;
    const { onRequestBoardDataAsync } = this.props;
    const { state, dispatch } = this.view;

    let from = cursor;
    if (!from) {
      from = state.selection.from;
    }

    if (suggestionPhase === 1) {
      dispatch(state.tr.insertText(`${suggestion.name}/`, suggestionPos, from));
      this.setState({
        suggestionPhase: 2,
        suggestions: [],
        filteredSuggestions: [],
        selectedSuggestion: { board: suggestion }
      });
      onRequestBoardDataAsync(suggestion)
        .then(boardData => {
          this.setState({
            suggestions: boardData.cards,
            filteredSuggestions: boardData.cards.slice(0, MAX_SUGGESTIONS)
          });
        })
        .catch(error => {
          console.log(error);
        });
    } else {
      // replace with link
      // [board.name/card](@board.name/card "board.name/card")
      const boardName = selectedSuggestion.board.name;
      const boardPath = selectedSuggestion.board.path;
      const cardName = suggestion.title;
      const linkName = `${boardName}/${cardName}`;
      dispatch(
        state.tr.insertText(linkName, suggestionPos - 1, from).addMark(
          suggestionPos - 1,
          suggestionPos + linkName.length,
          schema.marks.link.create({
            href: `@${boardPath}/${cardName}`,
            title: `Open '${cardName}' knot from '${boardName}' spool`
          })
        )
      );
    }
  }

  render() {
    const { onRemoveCard } = this.props;
    const { state } = this.view;
    const { filteredSuggestions, suggestionPos } = this.state;
    // TODO: improve performance?
    const { from } = state.selection;
    const linkElement = this.view.domAtPos(from).node.parentElement;
    const url = linkElement.href;

    const isSuggestion = suggestionPos >= 0;
    let position;
    if (url || isSuggestion) {
      position = this.view.coordsAtPos(from);
    }
    let textProperty;
    if (isSuggestion) {
      textProperty = this.getSuggestionProperty();
    }

    return (
      <div ref={this.editorRef} className={style.editor}>
        <MenuBar view={this.view} onRemoveCard={onRemoveCard} />
        {url && (
          <LinkPopup
            ref={this.linkRef}
            url={url}
            view={this.view}
            position={position}
          />
        )}
        {isSuggestion && (
          <SuggestionsPopup
            suggestions={filteredSuggestions}
            position={position}
            textProperty={textProperty}
            onSelectSuggestion={this.selectSuggestion}
          />
        )}
      </div>
    );
  }
}

export default Editor;
