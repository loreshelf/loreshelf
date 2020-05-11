/* eslint-disable react/no-array-index-key */
/* eslint-disable react/no-unused-state */
/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */
import React from 'react';
import { Menu, MenuItem, ContextMenu, Intent } from '@blueprintjs/core';
import path from 'path';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import { keymap } from 'prosemirror-keymap';
import { redo, undo } from 'prosemirror-history';
import {
  selectedRect,
  addRow,
  addRowAfter,
  addColumnAfter,
  deleteRow,
  isInTable,
  selectionCell,
  findNextCell,
  deleteColumn
} from 'prosemirror-tables';
import { ipcRenderer, clipboard, shell, nativeImage } from 'electron';
import style from './Editor.css';
import MenuBar from './MenuBar';
import plugins from './plugins';
import SuggestionsPopup from './SuggestionsPopup';
import { schema } from './schema';
import COMMANDS from './SlashCommands';

const MAX_SUGGESTIONS = 7;

/**
 * Converts an image to a base-64 encoded string.
 *
 * @param  {String} url           The image URL
 * @param  {Function} callback    A callback that will be invoked with the result
 * @param  {String} outputFormat  The image format to use, defaults to 'image/png'
 */
function convertImageToBase64(url, callback, outputFormat = 'image/png') {
  let canvas = document.createElement('CANVAS');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);

    const dataURL = canvas.toDataURL(outputFormat);
    canvas = null;
    callback(dataURL);
  };

  img.src = url;
}

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
    const {
      attributes,
      nodeViews,
      doc,
      onStartSpooling,
      onOpenImage
    } = this.props;
    this.saveChanges = true;
    this.originalDoc = doc;

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

    // Keyboard plugin

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

    // Mouse plugin

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const clickMousePlugin = new Plugin({
      props: {
        handleClickOn(view, pos, node, nodePos, event) {
          const isCTRL = /Mac/.test(navigator.platform)
            ? event.metaKey
            : event.ctrlKey;
          if (
            node.type === schema.nodes.paragraph ||
            node.type === schema.nodes.table_cell
          ) {
            const dom = view.domAtPos(pos);
            const parent = dom.node.parentNode;
            if (parent && parent.href) {
              const url = parent.href;
              if (url) {
                const openUrl = () => {
                  if (url.startsWith('http') || url.startsWith('www.')) {
                    window.open(url, '_blank');
                    return true;
                  }
                  if (url.startsWith('@')) {
                    const separatorIndex = url.lastIndexOf(path.sep);
                    const boardPath = decodeURI(
                      url.substring(1, separatorIndex)
                    );
                    const cardName = decodeURI(
                      url.substring(separatorIndex + 1)
                    );
                    view.onStartSpooling(boardPath, cardName);
                    return true;
                  }
                  shell.openItem(url);
                  return true;
                };
                if (event.which === 3) {
                  // Right click for context menu
                  const menu = React.createElement(
                    Menu,
                    {}, // empty props
                    React.createElement(MenuItem, {
                      onClick: openUrl,
                      text: 'Open'
                    }),
                    React.createElement(MenuItem, {
                      onClick: () => {
                        if (url.startsWith('file')) {
                          const { baseURI } = dom.node;
                          clipboard.writeText(
                            path.normalize(path.join(baseURI, url))
                          );
                        } else {
                          clipboard.writeText(url);
                        }
                      },
                      text: 'Copy to clipboard'
                    }),
                    React.createElement(MenuItem, {
                      onClick: () => {
                        const linkNode = view.state.doc.nodeAt(pos);
                        const len = node.content.content.length;
                        let startPos = nodePos + 1;
                        for (let i = 0; i < len; i += 1) {
                          const child = node.content.content[i];
                          if (child === linkNode) {
                            break;
                          }
                          startPos += child.nodeSize;
                        }
                        view.dispatch(
                          view.state.tr.delete(
                            startPos,
                            startPos + linkNode.nodeSize
                          )
                        );
                      },
                      intent: Intent.DANGER,
                      text: 'Remove link'
                    })
                  );

                  // mouse position is available on event
                  ContextMenu.show(
                    menu,
                    { left: event.clientX, top: event.clientY },
                    () => {
                      // menu was closed; callback optional
                    },
                    true
                  );
                  return true;
                }
                if (isCTRL) {
                  return openUrl();
                }
              }
            }
          } else if (node.type === schema.nodes.image) {
            const openImage = () => {
              view.onOpenImage(node.attrs.src);
              return true;
            };
            if (event.which === 3) {
              // Right click for context menu
              const menu = React.createElement(
                Menu,
                {}, // empty props
                React.createElement(MenuItem, {
                  onClick: openImage,
                  text: 'Open'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    clipboard.writeText(node.attrs.src);
                  },
                  text: 'Copy image url'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    convertImageToBase64(node.attrs.src, dataURL =>
                      clipboard.writeImage(
                        nativeImage.createFromDataURL(dataURL)
                      )
                    );
                  },
                  text: 'Copy image'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    view.dispatch(
                      view.state.tr.delete(nodePos, nodePos + node.nodeSize)
                    );
                  },
                  intent: Intent.DANGER,
                  text: 'Remove image'
                })
              );

              // mouse position is available on event
              ContextMenu.show(
                menu,
                { left: event.clientX, top: event.clientY },
                () => {
                  // menu was closed; callback optional
                },
                true
              );
              return true;
            }
            if (isCTRL) {
              openImage();
            }
          } else if (node.type === schema.nodes.table && event.which === 3) {
            // Right click for context menu
            const menu = React.createElement(
              Menu,
              {}, // empty props
              React.createElement(MenuItem, {
                onClick: () => {
                  addRowAfter(view.state, view.dispatch);
                },
                text: 'Add row after'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  deleteRow(view.state, view.dispatch);
                },
                text: 'Delete row'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  view.dispatch(
                    view.state.tr.delete(nodePos, nodePos + node.nodeSize)
                  );
                },
                intent: Intent.DANGER,
                text: 'Remove table'
              })
            );

            // mouse position is available on event
            ContextMenu.show(
              menu,
              { left: event.clientX, top: event.clientY },
              () => {
                // menu was closed; callback optional
              },
              true
            );
            return true;
          }
          return isCTRL;
        }
      }
    });
    plugins.unshift(clickMousePlugin);

    // Create view

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
          const { onChange, license } = this.props;
          const { selection } = state;

          const step = transaction.steps[0];
          if (
            suggestionPos < 0 &&
            step.from === step.to &&
            step.slice.content.content[0].text === '@' &&
            license === 'PREMIUM'
          ) {
            // Start @ card link suggestion
            onChange(state.doc, this.saveChanges);
            this.updateDoc();
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
            onChange(state.doc, this.saveChanges);
            this.updateDoc();
            const isSuggestion = this.isTextSuggestion(transaction, '/');
            if (isSuggestion) {
              filteredSuggestions = this.requestCommandSuggestion(
                state,
                selection.from
              );
            }
          } else if (suggestionPos >= 0) {
            const diff = currentCursor - suggestionPos;
            if (
              diff < 0 ||
              (suggestionChar === '/' &&
                step.slice.content.content[0].text === ' ')
            ) {
              // reset when user removes the suggestionChar
              // reset commands when user adds a space
              onChange(state.doc, this.saveChanges);
              this.updateDoc();
            } else {
              const { $cursor } = transaction.selection;
              const cursor = $cursor.parentOffset;
              const node = $cursor.nodeBefore;
              const paragraph = node ? node.text : '';
              const backToPhase1 =
                suggestionPhase === 2 &&
                node &&
                paragraph &&
                !paragraph.startsWith(`@${selectedSuggestion.board.name}/`); // removed / so return to phase 1
              if (paragraph.endsWith('/ ')) {
                // Reset suggestion when user adds incorrect character after /
                this.resetSuggestions();
              } else if (node) {
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
                filterText = filterText.toLowerCase();
                filteredSuggestions = suggestions
                  .filter(s => {
                    return s[this.getSuggestionProperty()]
                      .toLowerCase()
                      .includes(filterText);
                  })
                  .slice(0, MAX_SUGGESTIONS);
              }
              onChange(state.doc, this.saveChanges);
              this.updateDoc();
              if (backToPhase1) {
                this.requestSuggestionPhase1(suggestionPos);
              }
            }
          } else {
            onChange(state.doc, this.saveChanges);
            this.updateDoc();
          }

          if (!this.saveChanges) {
            this.saveChanges = true;
          }
        }

        if (suggestionPos >= 0) {
          const diff = currentCursor - suggestionPos;
          if (diff < 0 || diff > suggestionText.length + 1) {
            this.resetSuggestions();
          }
        }

        this.setState({
          cursor: currentCursor,
          filteredSuggestions
        });
      },
      attributes,
      nodeViews
    });

    this.view.onStartSpooling = onStartSpooling;
    this.view.onOpenImage = onOpenImage;

    this.selectSuggestion = this.selectSuggestion.bind(this);
    this.onUndo = this.onUndo.bind(this);
    this.onRedo = this.onRedo.bind(this);
    this.onAddLink = this.onAddLink.bind(this);
    this.onAddImage = this.onAddImage.bind(this);
    this.updateDoc = this.updateDoc.bind(this);
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
    const { doc, onStartSpooling, onOpenImage } = this.props;
    if (this.originalDoc !== doc) {
      this.view.updateState(
        EditorState.create({
          doc,
          plugins
        })
      );
      this.view.onStartSpooling = onStartSpooling;
      this.view.onOpenImage = onOpenImage;
      this.originalDoc = doc;
    }
  }

  onUndo() {
    const { state, dispatch } = this.view;
    undo(state, dispatch);
  }

  onRedo() {
    const { state, dispatch } = this.view;
    redo(state, dispatch);
  }

  onAddLink() {
    setTimeout(() => {
      const { state, dispatch } = this.view;
      const baseURI = document.getElementById('baseURI');
      const filePath = path.normalize(
        ipcRenderer.sendSync('file-link', baseURI.href)
      );
      if (filePath) {
        const label = filePath.substring(filePath.lastIndexOf('/') + 1);
        const cursorPos = state.selection.from;
        let tr = state.tr.insertText(label);
        tr = tr.addMark(
          cursorPos,
          cursorPos + label.length + 1,
          schema.marks.link.create({ href: filePath })
        );
        dispatch(tr);
      }
    }, 200);
  }

  onAddImage() {
    setTimeout(() => {
      const { state, dispatch } = this.view;
      const baseURI = document.getElementById('baseURI');
      const filePath = path.normalize(
        ipcRenderer.sendSync('file-link', baseURI.href)
      );
      if (filePath) {
        const insert = schema.nodes.image.create({
          src: filePath,
          title: filePath,
          alt: filePath
        });
        const tr = state.tr.replaceSelectionWith(insert);
        dispatch(tr);
      }
    }, 200);
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

  updateDoc() {
    // eslint-disable-next-line react/no-access-state-in-setstate
    this.setState({ state: this.state });
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
    const { onRequestBoardsAsync, license } = this.props;
    if (license === 'PREMIUM') {
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
    } else {
      this.resetSuggestions();
    }
  }

  requestCommandSuggestion(state, cursor) {
    this.resetSuggestions(cursor);
    const suggestions = COMMANDS.filter(c => !c.disabled || !c.disabled(state));
    const filteredSuggestions = suggestions.slice(0, MAX_SUGGESTIONS);
    this.setState({
      suggestions,
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
        dispatch(
          state.tr.insertText(cardName, suggestionPos - 1, from).addMark(
            suggestionPos - 1,
            suggestionPos + cardName.length,
            schema.marks.link.create({
              href: `@${boardPath}/${cardName}`,
              title: `Open '${cardName}' notecard from '${boardName}' notebook`
            })
          )
        );
      }
    } else {
      // slash command
      this.resetSuggestions();
      suggestion.onSelect(suggestionPos - 1, from, state, dispatch, from);
    }
  }

  highlightSearchedLines(searchText) {
    this.saveChanges = false; // don't automatically save notebook
    let pos = 0;
    let transaction = this.view.state.tr;
    this.view.state.doc.content.content.forEach(element => {
      if (
        !searchText ||
        element.textContent.toLowerCase().includes(searchText)
      ) {
        const { attrs } = element;
        if (!searchText) {
          transaction = transaction.setNodeMarkup(pos, undefined, {
            class: attrs.class
              ? attrs.class.replace(' searchLine', '')
              : undefined,
            level: attrs.level,
            order: attrs.order
          });
        } else if (
          attrs &&
          (!attrs.class || !attrs.class.includes('searchLine'))
        ) {
          transaction = transaction.setNodeMarkup(pos, undefined, {
            class: `${attrs.class} searchLine`,
            level: attrs.level,
            order: attrs.order
          });
        }
      }
      pos += element.nodeSize;
    });
    transaction = transaction.setMeta('addToHistory', false);
    this.view.dispatch(transaction);
  }

  render() {
    const { onRemoveCard } = this.props;
    const { state } = this.view;
    const { filteredSuggestions, suggestionPos, suggestionIndex } = this.state;

    const isSuggestion = suggestionPos >= 0;
    let position;
    let textProperty;
    if (isSuggestion) {
      const { from } = state.selection;
      position = this.view.coordsAtPos(from);
      textProperty = this.getSuggestionProperty();
    }

    return (
      <div ref={this.editorRef} className={style.editor}>
        <MenuBar
          undoDisabled={!undo(state)}
          redoDisabled={!redo(state)}
          onRemoveCard={onRemoveCard}
          onUndo={this.onUndo}
          onRedo={this.onRedo}
          onAddLink={this.onAddLink}
          onAddImage={this.onAddImage}
        />
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
