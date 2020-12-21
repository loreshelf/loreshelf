/* eslint-disable react/no-array-index-key */
/* eslint-disable react/no-unused-state */
/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */
import React from 'react';
import {
  Menu,
  MenuItem,
  ContextMenu,
  Intent,
  MenuDivider
} from '@blueprintjs/core';
import path from 'path';
import log from 'electron-log';
import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import { keymap } from 'prosemirror-keymap';
import { redo, undo } from 'prosemirror-history';
import {
  deleteRow,
  selectionCell,
  isInTable,
  nextCell
} from 'prosemirror-tables';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { ipcRenderer, clipboard, shell, nativeImage } from 'electron';
import style from './Editor.css';
import MenuBar from './MenuBar';
import plugins from './plugins';
import SuggestionsPopup from './SuggestionsPopup';
import { schema } from './schema';
import COMMANDS from './SlashCommands';
import { AppToaster } from '../components/AppToaster';
import {
  addRowAfter,
  addRowBefore,
  moveRowUp,
  moveRowDown
} from './EditorCommands';

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
      onOpenBoard,
      onOpenImage,
      workspace
    } = this.props;
    this.saveChanges = true;
    this.originalDoc = doc;

    this.suggestionPos = -1;
    this.suggestions = [];
    this.filteredSuggestions = [];
    this.suggestionPhase = 1;
    this.suggestionChar = undefined;
    this.selectedSuggestion = {};
    this.suggestionIndex = 0;
    this.cursor = undefined;

    this.state = { empty: true };

    // Keyboard plugin

    plugins.unshift(
      keymap({
        Escape: () => {
          this.view.root.activeElement.blur();
        },
        ArrowUp: (state, dispatch) => {
          if (this.suggestionPos >= 0) {
            this.cancelTransaction = true;
            let selectedIndex = this.suggestionIndex - 1;
            if (selectedIndex < 0) {
              selectedIndex = this.filteredSuggestions.length - 1;
            }
            this.suggestionIndex = selectedIndex;
            this.updateDoc();
          } else if (isInTable(state)) {
            const $cell = nextCell(selectionCell(state), 'vert', -1);
            if ($cell) {
              const newPos = $cell
                .node(0)
                .resolve($cell.pos + $cell.nodeAfter.nodeSize - 1);
              dispatch(
                state.tr.setSelection(Selection.near(newPos)).scrollIntoView()
              );
              return true;
            }
          }
          return false;
        },
        ArrowDown: (state, dispatch) => {
          if (this.suggestionPos >= 0) {
            this.cancelTransaction = true;
            let selectedIndex = this.suggestionIndex + 1;
            if (selectedIndex >= this.filteredSuggestions.length) {
              selectedIndex = 0;
            }
            this.suggestionIndex = selectedIndex;
            this.updateDoc();
          } else if (isInTable(state)) {
            const $cell = nextCell(selectionCell(state), 'vert', 1);
            if ($cell) {
              const newPos = $cell
                .node(0)
                .resolve($cell.pos + $cell.nodeAfter.nodeSize - 1);
              dispatch(
                state.tr.setSelection(Selection.near(newPos)).scrollIntoView()
              );
              return true;
            }
          }
          return false;
        },
        Enter: () => {
          if (this.suggestionPos >= 0) {
            this.cancelTransaction = true;
            setTimeout(() => {
              this.selectSuggestion(
                this.filteredSuggestions[this.suggestionIndex]
              );
            }, 100);
          }
        },
        Tab: (state, dispatch) => {
          return sinkListItem(schema.nodes.list_item)(state, dispatch);
        },
        'Shift-Tab': (state, dispatch) => {
          return liftListItem(schema.nodes.list_item)(state, dispatch);
        },
        'Mod-Space': state => {
          const transaction = state.tr;
          const { $cursor } = transaction.selection;
          const cursor = $cursor.parentOffset;
          const node = $cursor.nodeBefore;
          const paragraph = node.text;
          let where = this.getSuggestionCharacterPos(paragraph, cursor, '@');
          if (where >= 0) {
            const suggestionText =
              where >= 0 ? paragraph.substring(where + 1, cursor) : '';
            this.requestSuggestionPhase1(
              transaction.selection.from - suggestionText.length,
              suggestionText
            );
          } else {
            where = this.getSuggestionCharacterPos(paragraph, cursor, '/');
            const suggestionText =
              where >= 0 ? paragraph.substring(where + 1, cursor) : '';
            if (where >= 0) {
              this.requestCommandSuggestion(
                state,
                transaction.selection.from - suggestionText.length
              );
              this.filteredSuggestions = this.getFilteredSuggestions(
                this.selectedSuggestion,
                this.suggestions,
                suggestionText
              );
              this.updateDoc();
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
                  if (url.includes('@')) {
                    const linkNode = view.state.doc.nodeAt(pos);
                    const gatewayUrl = linkNode.marks[0].attrs.href;
                    if (gatewayUrl.startsWith('@')) {
                      const separatorIndex = gatewayUrl.indexOf('/');
                      const workspaceName =
                        separatorIndex >= 0
                          ? decodeURI(gatewayUrl.substring(1, separatorIndex))
                          : undefined;
                      const separatorIndex2 = gatewayUrl.indexOf('#');
                      const boardName = decodeURI(
                        gatewayUrl.substring(
                          separatorIndex >= 0 ? separatorIndex + 1 : 1,
                          separatorIndex2
                        )
                      );
                      const cardName = decodeURI(
                        gatewayUrl.substring(separatorIndex2 + 1)
                      );
                      view.root.activeElement.blur();
                      const started = view.onStartSpooling(
                        workspaceName,
                        boardName,
                        cardName
                      );
                      if (!started) {
                        AppToaster.show({
                          message: `Cannot find and open the notebook '${boardName}'. Make sure the workspace is loaded: '${workspaceName}'`,
                          intent: Intent.DANGER
                        });
                      }
                      return true;
                    }
                  }
                  if (url.endsWith('.md')) {
                    view.onOpenBoard(decodeURI(url.replace('file://', '')));
                    return true;
                  }
                  shell
                    .openPath(decodeURI(url))
                    .then(error => {
                      if (error !== '') {
                        AppToaster.show({
                          message: `Cannot find and open '${decodeURI(
                            url
                          )}' file`,
                          intent: Intent.DANGER
                        });
                      }
                    })
                    .catch(error => {});
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
                        clipboard.writeText(url);
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
                      disabled: workspace.readonly,
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
                if (
                  isCTRL ||
                  event.target.className === 'openUrlIcon' ||
                  event.target.className === 'cardLinkIcon'
                ) {
                  return openUrl();
                }
              }
            }
          }

          if (node.type === schema.nodes.image) {
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
                  disabled: workspace.readonly,
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
          }

          if (
            (node.type === schema.nodes.table_cell ||
              node.type === schema.nodes.table_row ||
              node.type === schema.nodes.table ||
              node.type === schema.nodes.table_header) &&
            event.which === 3
          ) {
            // Right click for context menu
            const transaction = view.state.tr;
            const { $cursor } = transaction.selection;
            const isNotTableCell =
              $cursor &&
              $cursor.parent &&
              $cursor.parent.type !== schema.nodes.table_cell;
            const menu = React.createElement(
              Menu,
              {}, // empty props
              React.createElement(MenuItem, {
                onClick: () => {
                  addRowBefore(view.state, view.dispatch);
                },
                disabled: workspace.readonly || isNotTableCell,
                text: 'Add row before'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  addRowAfter(view.state, view.dispatch);
                },
                disabled: workspace.readonly || isNotTableCell,
                text: 'Add row after'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  moveRowUp(view.state, view.dispatch, schema);
                },
                disabled: workspace.readonly || isNotTableCell,
                text: 'Move row up'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  moveRowDown(view.state, view.dispatch, schema);
                },
                disabled: workspace.readonly || isNotTableCell,
                text: 'Move row down'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  deleteRow(view.state, view.dispatch);
                },
                disabled: workspace.readonly || isNotTableCell,
                text: 'Delete row'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  view.dispatch(
                    view.state.tr.delete(
                      $cursor.path[2],
                      $cursor.path[2] + $cursor.path[3].nodeSize
                    )
                  );
                },
                intent: Intent.DANGER,
                disabled: workspace.readonly,
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

          if (event.which === 3) {
            const selectedText = view.state.selection.content();
            if (selectedText) {
              const menu = React.createElement(
                Menu,
                {}, // empty props
                React.createElement(MenuDivider, {
                  title: 'Edit'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    document.execCommand('cut');
                  },
                  disabled: selectedText.size === 0,
                  text: 'Cut',
                  label: 'Ctrl+X',
                  icon: 'cut'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    document.execCommand('copy');
                  },
                  disabled: selectedText.size === 0,
                  text: 'Copy',
                  label: 'Ctrl+C',
                  icon: 'duplicate'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    document.execCommand('paste');
                  },
                  text: 'Paste',
                  label: 'Ctrl+V',
                  icon: 'clipboard'
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

        this.view.updateState(state);

        const currentCursor = state.selection.from;
        let suggestionText = '';
        let filteredSuggestions = [];

        if (transactions.some(tr => tr.docChanged)) {
          const { onChange } = this.props;
          const { selection } = state;

          const step = transaction.steps[0];
          if (
            this.suggestionPos < 0 &&
            step.from === step.to &&
            step.slice.content.content[0].text === '@'
          ) {
            // Start @ card link suggestion
            onChange(state.doc, this.saveChanges);
            this.updateDoc();
            const isSuggestion = this.isTextSuggestion(transaction, '@');
            if (isSuggestion) {
              this.requestSuggestionPhase1(selection.from);
            }
          } else if (
            this.suggestionPos < 0 &&
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
          } else if (this.suggestionPos >= 0) {
            const diff = currentCursor - this.suggestionPos;
            if (
              diff < 0 ||
              (this.suggestionChar === '/' &&
                step.slice.content.content[0] &&
                step.slice.content.content[0].text === ' ')
            ) {
              // reset when user removes the suggestionChar
              // reset commands when user adds a space
              onChange(state.doc, this.saveChanges);
              this.updateDoc();
              this.resetSuggestions();
            } else {
              const { $cursor } = transaction.selection;
              const cursor = $cursor.parentOffset;
              const node = $cursor.nodeBefore;
              const paragraph = node ? node.text : '';
              const backToPhase1 =
                this.suggestionPhase === 2 &&
                node &&
                paragraph &&
                !paragraph.startsWith(
                  `@${this.selectedSuggestion.board.name}/`
                ); // removed / so return to phase 1
              if (paragraph && paragraph.endsWith('/ ')) {
                // Reset suggestion when user adds incorrect character after /
                this.resetSuggestions();
              } else if (paragraph && node) {
                const where = this.getSuggestionCharacterPos(
                  paragraph,
                  cursor,
                  this.suggestionChar
                );
                suggestionText =
                  where >= 0 ? paragraph.substring(where + 1, cursor) : '';
                filteredSuggestions = this.getFilteredSuggestions(
                  this.selectedSuggestion,
                  this.suggestions,
                  suggestionText
                );
              }
              onChange(state.doc, this.saveChanges);
              this.updateDoc();
              if (backToPhase1) {
                this.requestSuggestionPhase1(this.suggestionPos);
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

        if (this.suggestionPos >= 0) {
          const diff = currentCursor - this.suggestionPos;
          if (diff < 0 || diff > suggestionText.length + 1) {
            this.resetSuggestions();
          }
        }

        this.cursor = currentCursor;
        this.filteredSuggestions = filteredSuggestions;
        this.updateDoc();
      },
      editable: () => {
        return !workspace.readonly;
      },
      attributes,
      nodeViews
    });

    this.view.onStartSpooling = onStartSpooling;
    this.view.onOpenBoard = onOpenBoard;
    this.view.onOpenImage = onOpenImage;
    /** this.view.dom.onblur = () => {
     * context menu doesn't work then
      const sel = document.getSelection();
      sel.removeAllRanges();
    }; */

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
    const { doc, onStartSpooling, onOpenImage, onOpenBoard } = this.props;
    if (this.originalDoc !== doc) {
      this.view.updateState(
        EditorState.create({
          doc,
          plugins
        })
      );
      this.view.onStartSpooling = onStartSpooling;
      this.view.onOpenBoard = onOpenBoard;
      this.view.onOpenImage = onOpenImage;
      /** this.view.dom.onblur = () => {
        const sel = document.getSelection();
        sel.removeAllRanges();
      }; */
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
        const label = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
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
        ipcRenderer.sendSync('file-link', baseURI.href, [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'svg', 'gif'] }
        ])
      );
      if (filePath) {
        const insert = schema.nodes.image.create({
          src: filePath,
          alt: filePath.substring(filePath.lastIndexOf(path.sep) + 1)
        });
        const tr = state.tr.replaceSelectionWith(insert);
        dispatch(tr);
      }
    }, 200);
  }

  get content() {
    return defaultMarkdownSerializer.serialize(this.view.state.doc);
  }

  getFilteredSuggestions(selectedSuggestion, suggestions, suggestionText) {
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
    if (filterText) {
      filterText = filterText.toLowerCase();
      return suggestions
        .filter(s => {
          return s[this.getSuggestionProperty()]
            .toLowerCase()
            .includes(filterText);
        })
        .slice(0, MAX_SUGGESTIONS);
    }
    return suggestions.slice(0, MAX_SUGGESTIONS);
  }

  getSuggestionProperty() {
    let textProperty;
    if (this.suggestionChar === '@') {
      if (this.suggestionPhase === 1) {
        textProperty = 'name'; // boardMeta.name
      } else if (this.suggestionPhase === 2) {
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
    if (this.state) {
      // eslint-disable-next-line react/no-access-state-in-setstate
      this.setState({ state: this.state });
    }
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

  requestSuggestionPhase1(cursor, suggestionText?) {
    const { onRequestBoardsAsync } = this.props;
    this.resetSuggestions(cursor);
    onRequestBoardsAsync()
      .then(newBoards => {
        this.suggestions = newBoards;
        this.suggestionIndex = 0;
        this.suggestionChar = '@';
        this.filteredSuggestions = this.getFilteredSuggestions(
          this.selectedSuggestion,
          this.suggestions,
          suggestionText
        );
        this.updateDoc();
      })
      .catch(error => {
        log.error(`Requesting @mentions failed: ${error}`);
      });
  }

  requestCommandSuggestion(state, cursor) {
    this.resetSuggestions(cursor);
    const suggestions = COMMANDS.filter(c => !c.disabled || !c.disabled(state));
    const filteredSuggestions = suggestions.slice(0, MAX_SUGGESTIONS);
    this.suggestions = suggestions;
    this.suggestionIndex = 0;
    this.suggestionChar = '/';
    this.filteredSuggestions = filteredSuggestions;
    return filteredSuggestions;
  }

  resetSuggestions(suggestionPos?) {
    this.suggestionPos = suggestionPos || -1;
    this.suggestions = [];
    this.filteredSuggestions = [];
    this.suggestionPhase = 1;
    this.suggestionChar = undefined;
    this.selectedSuggestion = {};
    this.suggestionIndex = 0;
    this.cursor = undefined;
  }

  selectSuggestion(suggestion, state?, dispatch?) {
    // const { state, dispatch } = this.view;
    if (!suggestion) {
      return;
    }
    if (!state) {
      // eslint-disable-next-line no-param-reassign
      state = this.view.state;
    }
    if (!dispatch) {
      // eslint-disable-next-line no-param-reassign
      dispatch = this.view.dispatch;
    }
    const { onRequestBoardDataAsync } = this.props;

    let from = this.cursor;
    if (!from) {
      from = state.selection.from;
    }

    if (this.suggestionChar === '@') {
      if (this.suggestionPhase === 1) {
        dispatch(
          state.tr.insertText(`${suggestion.name}/`, this.suggestionPos, from)
        );
        this.suggestionPhase = 2;
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.filteredSuggestions = [];
        this.selectedSuggestion = { board: suggestion };
        onRequestBoardDataAsync(suggestion.path)
          .then(spoolingBoardData => {
            this.suggestions = spoolingBoardData.cards;
            this.filteredSuggestions = spoolingBoardData.cards.slice(
              0,
              MAX_SUGGESTIONS
            );
            this.updateDoc();
          })
          .catch(error => {
            log.error(`Requesting notecards from @mentions failed: ${error}`);
          });
        // ipcRenderer.send('board-spooling-load', suggestion.path);
      } else {
        // replace with link
        // [board.name/card](@board.name/card "board.name/card")
        const { workspace } = this.props;
        const boardName = this.selectedSuggestion.board.name;
        const boardPath = this.selectedSuggestion.board.path;
        const endWorkspaceName = boardPath.lastIndexOf(path.sep);
        const startWorkspaceName =
          boardPath.lastIndexOf(path.sep, endWorkspaceName - 1) + 1;
        const workspaceName = boardPath.substring(
          startWorkspaceName,
          endWorkspaceName
        );
        const currentWorkspaceName = workspace.name;
        const prefix =
          currentWorkspaceName === workspaceName ? '' : `${workspaceName}/`;
        const cardName = suggestion.title;
        dispatch(
          state.tr.insertText(cardName, this.suggestionPos - 1, from).addMark(
            this.suggestionPos - 1,
            this.suggestionPos + cardName.length - 1,
            schema.marks.link.create({
              href: `@${prefix}${boardName}#${cardName}`,
              title: `Open from '${boardName}'`
            })
          )
        );
      }
    } else {
      // slash command
      const pos = this.suggestionPos - 1;
      this.resetSuggestions();
      suggestion.onSelect(pos, from, state, dispatch, from);
    }
  }

  render() {
    const { onRemoveCard } = this.props;
    const { state } = this.view;

    const isSuggestion = this.suggestionPos >= 0;
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
            suggestions={this.filteredSuggestions}
            suggestionIndex={this.suggestionIndex}
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
