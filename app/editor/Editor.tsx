/* eslint-disable react/no-array-index-key */
/* eslint-disable react/no-unused-state */
/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */
import React from 'react';
import { EditorState, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import { keymap } from 'prosemirror-keymap';
import { goToNextCell } from 'prosemirror-tables';
import style from './Editor.css';
import MenuBar from './MenuBar';
import LinkPopup from './LinkPopup';
import plugins from './plugins';
import SuggestionsPopup from './SuggestionsPopup';
import { schema } from './schema';

const MAX_SUGGESTIONS = 5;

const isNotInline = state => {
  return state.tr.selection.$cursor.parent.type !== schema.nodes.paragraph;
};

const COMMANDS = [
  {
    name: 'header',
    disabled: isNotInline,
    onSelect: (start, end, state, dispatch, cursor) => {
      const insert = schema.nodes.heading.createAndFill({ level: 2 });
      const tr = state.tr.replaceWith(start - 1, end + 1, insert);
      tr.setSelection(Selection.near(tr.doc.resolve(cursor - 1)));
      dispatch(tr);
    }
  },
  {
    name: 'today',
    onSelect: (start, end, state, dispatch, cursor) => {
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const today = new Date().toLocaleDateString(undefined, options);
      const tr = state.tr.insertText(today, start, cursor);
      tr.setSelection(TextSelection.create(tr.doc, cursor + today.length - 1));
      dispatch(tr);
    }
  },
  {
    name: 'now',
    onSelect: (start, end, state, dispatch, cursor) => {
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const today = new Date().toLocaleTimeString(undefined, options);
      const tr = state.tr.insertText(today, start, cursor);
      tr.setSelection(TextSelection.create(tr.doc, cursor + today.length - 1));
      dispatch(tr);
    }
  },
  {
    name: 'table',
    onSelect: (start, end, state, dispatch, cursor) => {
      const headerCells = [];
      const cells = [];
      const pros = schema.text('Pros');
      console.log(pros);
      const cons = schema.text('Cons');
      cells.push(schema.nodes.table_cell.createAndFill());
      cells.push(schema.nodes.table_cell.createAndFill());
      headerCells.push(schema.nodes.table_header.createChecked(null, pros));
      headerCells.push(schema.nodes.table_header.createChecked(null, cons));
      const headerRows = schema.nodes.table_row.createChecked(
        null,
        headerCells
      );
      const rows = schema.nodes.table_row.createChecked(null, cells);
      const thead = schema.nodes.table_head.createChecked(null, headerRows);
      const tbody = schema.nodes.table_body.createChecked(null, rows);
      const table = schema.nodes.table.createChecked(null, [thead, tbody]);
      // dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
      const tr = state.tr.replaceWith(start - 1, end + 1, table);
      tr.setSelection(Selection.near(tr.doc.resolve(cursor)));
      dispatch(tr);
    }
  }
];

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
    const { attributes, nodeViews, doc, onStartSpooling } = this.props;

    this.state = {
      suggestionPos: -1,
      suggestions: [],
      filteredSuggestions: [],
      suggestionPhase: 1,
      suggestionChar: undefined,
      selectedSuggestion: {},
      suggestionIndex: 0,
      cursor: undefined
    };

    plugins.unshift(
      keymap({
        Escape: () => {
          this.view.root.activeElement.blur();
        },
        ArrowUp: () => {
          const {
            suggestionPos,
            suggestionIndex,
            filteredSuggestions
          } = this.state;
          if (suggestionPos >= 0) {
            this.cancelTransaction = true;
            let selectedIndex = suggestionIndex - 1;
            if (selectedIndex < 0) {
              selectedIndex = filteredSuggestions.length - 1;
            }
            this.setState({ suggestionIndex: selectedIndex });
          }
        },
        ArrowDown: () => {
          const {
            suggestionPos,
            suggestionIndex,
            filteredSuggestions
          } = this.state;
          if (suggestionPos >= 0) {
            this.cancelTransaction = true;
            let selectedIndex = suggestionIndex + 1;
            if (selectedIndex >= filteredSuggestions.length) {
              selectedIndex = 0;
            }
            this.setState({ suggestionIndex: selectedIndex });
          }
        },
        Enter: (state, dispatch) => {
          const {
            suggestionPos,
            suggestionIndex,
            filteredSuggestions
          } = this.state;
          if (suggestionPos >= 0) {
            this.cancelTransaction = true;
            setTimeout(() => {
              this.selectSuggestion(
                filteredSuggestions[suggestionIndex],
                state,
                dispatch
              );
            }, 100);
          }
        },
        'Mod-Space': state => {
          const transaction = state.tr;
          let isSuggestion = this.isTextSuggestion(transaction, '@');
          if (isSuggestion) {
            this.requestSuggestionPhase1(transaction.selection.from);
          } else {
            isSuggestion = this.isTextSuggestion(transaction, '/');
            if (isSuggestion) {
              this.requestCommandSuggestion(state, transaction.selection.from);
            }
          }
        }
      })
    );

    this.view = new EditorView(null, {
      state: EditorState.create({
        doc,
        plugins
      }),
      dispatchTransaction: transaction => {
        if (this.cancelTransaction) {
          this.cancelTransaction = false;
          return;
        }
        const { state, transactions } = this.view.state.applyTransaction(
          transaction
        );
        const {
          suggestionPos,
          suggestions,
          selectedSuggestion,
          suggestionPhase,
          suggestionChar
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
            // Start @ card link suggestion
            onChange(state.doc);
            const isSuggestion = this.isTextSuggestion(transaction, '@');
            if (isSuggestion) {
              this.requestSuggestionPhase1(selection.from);
            }
          } else if (
            suggestionPos < 0 &&
            step.from === step.to &&
            step.slice.content.content[0].text === '/'
          ) {
            // Start @ card link suggestion
            onChange(state.doc);
            const isSuggestion = this.isTextSuggestion(transaction, '/');
            if (isSuggestion) {
              filteredSuggestions = this.requestCommandSuggestion(
                state,
                selection.from
              );
            }
          } else if (suggestionPos >= 0) {
            const { $cursor } = transaction.selection;
            const cursor = $cursor.parentOffset;
            const node = $cursor.nodeBefore;
            const paragraph = node ? node.text : '';
            const backToPhase1 =
              suggestionPhase === 2 &&
              node &&
              paragraph &&
              !paragraph.startsWith(`@${selectedSuggestion.board.name}/`); // removed / so return to phase 1

            if (node) {
              const where = this.getSuggestionCharacterPos(
                paragraph,
                cursor,
                suggestionChar
              );
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
                .filter(s => {
                  return s[this.getSuggestionProperty()].includes(filterText);
                })
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

        // Click on a card link to start spooling
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
          onStartSpooling(boardPath, cardName);
        }

        this.setState({
          cursor: currentCursor,
          filteredSuggestions
        });
      },
      attributes,
      nodeViews
    });

    this.selectSuggestion = this.selectSuggestion.bind(this);
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

  getSuggestionProperty() {
    const { suggestionPhase, suggestionChar } = this.state;
    let textProperty;
    if (suggestionChar === '@') {
      if (suggestionPhase === 1) {
        textProperty = 'name'; // boardMeta.name
      } else if (suggestionPhase === 2) {
        textProperty = 'title'; // boardData.cards.title
      }
    } else {
      // slash command
      textProperty = 'name';
    }
    return textProperty;
  }

  // eslint-disable-next-line class-methods-use-this
  getSuggestionCharacterPos(paragraph, cursor, suggestionChar) {
    let where = paragraph.lastIndexOf(` ${suggestionChar}`, cursor) + 1;
    if (where < 1) {
      where = paragraph.lastIndexOf(suggestionChar, cursor);
      if (where !== 0) {
        where = -1;
      }
    }
    return where;
  }

  isTextSuggestion(transaction, suggestionChar) {
    const { $cursor } = transaction.selection;
    const cursor = $cursor.parentOffset;
    const node = $cursor.nodeBefore;
    const paragraph = node.text;
    const where = this.getSuggestionCharacterPos(
      paragraph,
      cursor,
      suggestionChar
    );
    return where >= 0;
  }

  requestSuggestionPhase1(cursor) {
    const { onRequestBoardsAsync } = this.props;
    this.resetSuggestions(cursor);
    onRequestBoardsAsync()
      .then(newBoards => {
        this.setState({
          suggestions: newBoards,
          suggestionIndex: 0,
          suggestionChar: '@',
          filteredSuggestions: newBoards.slice(0, MAX_SUGGESTIONS)
        });
      })
      .catch(error => {
        console.log(error);
      });
  }

  requestCommandSuggestion(state, cursor) {
    this.resetSuggestions(cursor);
    const filteredSuggestions = COMMANDS.filter(
      c => !c.disabled || !c.disabled(state)
    ).slice(0, MAX_SUGGESTIONS);
    this.setState({
      suggestions: filteredSuggestions,
      suggestionIndex: 0,
      suggestionChar: '/',
      filteredSuggestions
    });
    return filteredSuggestions;
  }

  resetSuggestions(suggestionPos?) {
    this.setState({
      suggestionPos: suggestionPos || -1,
      suggestions: [],
      filteredSuggestions: [],
      suggestionPhase: 1,
      suggestionIndex: 0,
      suggestionChar: undefined,
      selectedSuggestion: {}
    });
  }

  selectSuggestion(suggestion, state?, dispatch?) {
    const {
      suggestionPhase,
      suggestionPos,
      selectedSuggestion,
      suggestionChar,
      cursor
    } = this.state;
    // const { state, dispatch } = this.view;
    if (!state) {
      // eslint-disable-next-line no-param-reassign
      state = this.view.state;
    }
    if (!dispatch) {
      // eslint-disable-next-line no-param-reassign
      dispatch = this.view.dispatch;
    }
    const { onRequestBoardDataAsync } = this.props;

    let from = cursor;
    if (!from) {
      from = state.selection.from;
    }

    if (suggestionChar === '@') {
      if (suggestionPhase === 1) {
        dispatch(
          state.tr.insertText(`${suggestion.name}/`, suggestionPos, from)
        );
        this.setState({
          suggestionPhase: 2,
          suggestions: [],
          suggestionIndex: 0,
          filteredSuggestions: [],
          selectedSuggestion: { board: suggestion }
        });
        onRequestBoardDataAsync(suggestion.path)
          .then(spoolingBoardData => {
            this.setState({
              suggestions: spoolingBoardData.cards,
              filteredSuggestions: spoolingBoardData.cards.slice(
                0,
                MAX_SUGGESTIONS
              )
            });
          })
          .catch(error => {
            console.log(error);
          });
        // ipcRenderer.send('board-spooling-load', suggestion.path);
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
              title: `Open '${cardName}' block from '${boardName}' notebook`
            })
          )
        );
      }
    } else {
      // slash command
      suggestion.onSelect(suggestionPos - 1, from, state, dispatch, from);
    }
  }

  render() {
    const { onRemoveCard } = this.props;
    const { state } = this.view;
    const { filteredSuggestions, suggestionPos, suggestionIndex } = this.state;
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
        {url && <LinkPopup url={url} view={this.view} position={position} />}
        {isSuggestion && (
          <SuggestionsPopup
            suggestions={filteredSuggestions}
            suggestionIndex={suggestionIndex}
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
