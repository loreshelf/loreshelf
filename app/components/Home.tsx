import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import nodePath from 'path';
import {
  Classes,
  NonIdealState,
  Button,
  Intent,
  InputGroup,
  Tooltip,
  Spinner
} from '@blueprintjs/core';
import Store from 'electron-store';
import log from 'electron-log';
import JSZip from '../utils/jszip';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';
import { timeSince } from '../utils/CoreFunctions';
import {
  parseMarkdown,
  serializeMarkdown,
  md2html,
  metadata2table,
  icons2links
} from './Markdown';
import MarkdownIcons from './MarkdownIcons';
import AppToaster from './AppToaster';

const CONFIG_SCHEMA = {
  workspaces: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  workspaceOnStartup: {
    type: 'string'
  },
  notebookOnStartup: {
    type: 'string'
  },
  sortBy: {
    method: 'string',
    asc: 'boolean',
    icon: 'string'
  },
  filterBy: {
    name: 'string',
    icon: 'string'
  }
};

// workspaces=[path1, path2], workspaceOnStartup, notebookOnStartup
const CONFIG_STORE = new Store(CONFIG_SCHEMA);

enum CONFIG {
  WORKSPACES = 'workspaces',
  WORKSPACEONSTARTUP = 'workspaceOnStartup',
  NOTEBOOKONSTARTUP = 'notebookOnStartup',
  SORTBY = 'sortBy',
  FILTERBY = 'filterBy'
}

const SORTING_METHODS = {
  NAME: (a, b, asc) => {
    const aname = a.name;
    const bname = b.name;
    if (aname > bname) {
      return asc ? 1 : -1;
    }
    if (aname < bname) {
      return asc ? -1 : 1;
    }
    return 0;
  },
  'LAST UPDATED': (a, b, asc) => {
    const amodified = a.modified;
    const bmodified = b.modified;
    if (amodified > bmodified) {
      return asc ? -1 : 1;
    }
    if (amodified < bmodified) {
      return asc ? 1 : -1;
    }
    return 0;
  }
};

class Home extends Component {
  constructor() {
    super();

    const workspace = undefined; // {selectedBoard:0, name, path, numBoards, boards:[{name1, path1, modified1}, {name2, path2}], zip }}
    const boardData = undefined; // {cards = [{doc, title, spooling={ boardPath, cardTitle }}], path, name, status, modified}
    const knownWorkspaces = []; // [workspace1, workspace2]

    const boardOnStartup = undefined; // = boardPath

    const sortBy = CONFIG_STORE.get(CONFIG.SORTBY, {
      method: 'NAME',
      asc: true,
      icon: 'sort-alphabetical'
    });
    const filterBy = CONFIG_STORE.get(CONFIG.FILTERBY, {
      name: 'All',
      icon: 'calendar'
    });

    const saveTimer = undefined;
    const spoolingTimer = undefined;
    const spoolingSavingCardIndex = undefined;
    const settings = {
      sortBy,
      filterBy,
      notecardWidth: 220
    };

    this.menuRef = React.createRef();
    this.boardRef = React.createRef();

    this.state = {
      workspace,
      boardData,
      saveTimer,
      spoolingTimer,
      spoolingSavingCardIndex,
      knownWorkspaces,
      boardOnStartup,
      settings,
      showPassword: false,
      loading: true
    };
    this.newCard = this.newCard.bind(this);
    this.editTitle = this.editTitle.bind(this);
    this.editCard = this.editCard.bind(this);
    this.removeCard = this.removeCard.bind(this);
    this.reorderCards = this.reorderCards.bind(this);
    this.newBoard = this.newBoard.bind(this);
    this.duplicateBoard = this.duplicateBoard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
    this.loadBoardWithPath = this.loadBoardWithPath.bind(this);
    this.deleteBoard = this.deleteBoard.bind(this);
    this.renameBoard = this.renameBoard.bind(this);
    this.openDefaultBoard = this.openDefaultBoard.bind(this);
    this.openBoard = this.openBoard.bind(this);
    this.setBoardOnStartup = this.setBoardOnStartup.bind(this);
    this.moveCardToBoard = this.moveCardToBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
    this.closeWorkspace = this.closeWorkspace.bind(this);
    this.boardPathToName = this.boardPathToName.bind(this);
    this.requestBoardsAsync = this.requestBoardsAsync.bind(this);
    this.requestBoardDataAsync = this.requestBoardDataAsync.bind(this);
    this.startSpooling = this.startSpooling.bind(this);
    this.stopSpooling = this.stopSpooling.bind(this);
    this.changeSettings = this.changeSettings.bind(this);
    this.newSecuredWorkspace = this.newSecuredWorkspace.bind(this);
    this.onStartupCallback = this.onStartupCallback.bind(this);
    this.exportToPDF = this.exportToPDF.bind(this);

    window.onkeydown = e => {
      if (e.ctrlKey) {
        document.body.className = 'ctrl';
      } else if (document.body.className === 'ctrl') {
        document.body.className = '';
      }
    };
    window.onkeyup = () => {
      if (document.body.className === 'ctrl') {
        document.body.className = '';
      }
    };
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    ipcRenderer.on('start', (event, boardPath) => {
      const workspacePath = boardPath.substring(
        0,
        boardPath.lastIndexOf(nodePath.sep)
      );
      self.loadWorkspace(workspacePath, true, boardPath);
    });

    ipcRenderer.on(
      'places-exist-callback',
      (
        event,
        workspaceOnStartupExist,
        boardOnStartupExist,
        existingWorkspaces
      ) => {
        self.onStartupCallback(
          workspaceOnStartupExist,
          boardOnStartupExist,
          existingWorkspaces
        );
      }
    );

    ipcRenderer.on(
      'workspace-add-callback',
      (event, workspacePath, files, stats) => {
        self.addWorkspaceCallback(workspacePath, files, stats);
      }
    );

    ipcRenderer.on(
      'workspace-add-zip-callback',
      (event, workspacePath, zipdata) => {
        self.addSecuredWorkspaceCallback(workspacePath, zipdata);
      }
    );

    ipcRenderer.on(
      'workspace-load-callback',
      (
        event,
        workspacePath,
        files,
        stats,
        shouldSetWorkspace,
        openBoardPath
      ) => {
        self.loadWorkspaceCallback(
          workspacePath,
          files,
          stats,
          shouldSetWorkspace,
          openBoardPath
        );
      }
    );

    ipcRenderer.on(
      'workspace-secured-load-callback',
      (event, workspacePath, zipdata, shouldSetWorkspace, openBoardPath) => {
        self.loadSecuredWorkspaceCallback(
          workspacePath,
          zipdata,
          shouldSetWorkspace,
          openBoardPath
        );
      }
    );

    ipcRenderer.on('board-read-callback', (event, boardMeta, text, stats) => {
      self.loadBoardCallback(boardMeta, text, stats);
    });

    ipcRenderer.on('board-save-callback', () => {
      self.saveBoardCallback();
    });

    ipcRenderer.on('board-new-callback', (event, newBoardPath) => {
      self.newBoardCallback(newBoardPath);
    });

    ipcRenderer.on('board-delete-callback', (event, removedBoardPath) => {
      self.deleteBoardCallback(removedBoardPath);
    });

    ipcRenderer.on(
      'board-rename-callback',
      (event, oldBoardPath, newBoardPath) => {
        self.renameBoardCallback(oldBoardPath, newBoardPath);
      }
    );

    ipcRenderer.on(
      'board-spooling-data',
      (event, boardPath, boardContent, stats, spoolingCardIndex, cardName) => {
        self.processSpoolingData(
          boardPath,
          boardContent,
          stats,
          spoolingCardIndex,
          cardName
        );
      }
    );

    document.addEventListener('keyup', e => {
      if (e.ctrlKey || e.metaKey) {
        // eslint-disable-next-line default-case
        switch (String.fromCharCode(e.which).toLowerCase()) {
          // CTRL + S
          case 's':
            e.preventDefault();
            this.autoSave(true);
            break;
          case 't':
            e.preventDefault();
            this.newCard();
            break;
          case 'n':
            e.preventDefault();
            this.menuRef.current.newBoardOpen();
            break;
        }
      }
    });
    const workspaces = CONFIG_STORE.get(CONFIG.WORKSPACES);
    const workspaceOnStartup = CONFIG_STORE.get(CONFIG.WORKSPACEONSTARTUP);
    const boardOnStartup = CONFIG_STORE.get(CONFIG.NOTEBOOKONSTARTUP);
    ipcRenderer.send(
      'places-exist',
      workspaceOnStartup,
      boardOnStartup,
      workspaces
    );
    setTimeout(() => {
      const { loading } = this.state;
      if (loading) {
        this.setState({ loading: false });
      }
    }, 1000);
  }

  onStartupCallback(workspaceOnStartup, boardOnStartup, existingWorkspaces) {
    const configWorkspaces = CONFIG_STORE.get(CONFIG.WORKSPACES);
    const configBoardOnStartup = CONFIG_STORE.get(CONFIG.NOTEBOOKONSTARTUP);
    if (!boardOnStartup && configBoardOnStartup) {
      CONFIG_STORE.delete(CONFIG.WORKSPACEONSTARTUP);
      CONFIG_STORE.delete(CONFIG.NOTEBOOKONSTARTUP);
    }
    if (configWorkspaces.length !== existingWorkspaces.length) {
      CONFIG_STORE.set(CONFIG.WORKSPACES, existingWorkspaces);
    }
    if (workspaceOnStartup && boardOnStartup) {
      this.loadWorkspace(workspaceOnStartup, true, boardOnStartup);
      this.setState({ workspaceOnStartup, boardOnStartup });
    }
    if (existingWorkspaces) {
      let shouldSetFirst = !(workspaceOnStartup && boardOnStartup);
      existingWorkspaces.forEach(workspacePath => {
        if (workspacePath !== workspaceOnStartup) {
          this.loadWorkspace(workspacePath, shouldSetFirst);
          shouldSetFirst = false;
        }
      });
    }
  }

  getCurrentBoardMd(data?) {
    const { boardData } = this.state;
    const bd = data || boardData;
    const cards = bd.cards.map(
      c => `# ${c.title}\n\n${serializeMarkdown(c.doc).trim()}`
    );
    let boardMd = cards.join('\n\n');
    MarkdownIcons.forEach(mdi => {
      const regExp = new RegExp(`\\!\\[Icon\\]\\(${mdi.icon}\\)`, 'g');
      boardMd = boardMd.replace(regExp, mdi.code);
    });
    return boardMd;
  }

  setBoardOnStartup() {
    const { boardData, workspace } = this.state;
    CONFIG_STORE.set(CONFIG.NOTEBOOKONSTARTUP, boardData.path);
    CONFIG_STORE.set(CONFIG.WORKSPACEONSTARTUP, workspace.path);
    this.setState({
      boardOnStartup: boardData.path,
      workspaceOnStartup: workspace.path
    });
  }

  updateWorkspace(workspacePath, knownWorkspaces, files, stats) {
    const { settings } = this.state;
    const { sortBy } = settings;
    let numBoards = 0;
    const boards = [];
    files.forEach((file, id) => {
      if (file.endsWith('.md')) {
        const boardPath = nodePath.join(workspacePath, file);
        boards.push({
          path: boardPath,
          name: this.boardPathToName(boardPath),
          modified: stats[id].mtimeMs
        });
        numBoards += 1;
      }
    });
    let workspace = knownWorkspaces.find(w => {
      return workspacePath === w.path;
    });
    if (!workspace) {
      const name = workspacePath.substring(
        workspacePath.lastIndexOf(nodePath.sep) + 1
      );
      workspace = { selectedBoard: -1, name, path: workspacePath };
      knownWorkspaces.push(workspace);
      knownWorkspaces.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
    }
    workspace.numBoards = numBoards;
    boards.sort((a, b) => {
      return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
    });
    workspace.boards = boards;
    return workspace;
  }

  // eslint-disable-next-line class-methods-use-this
  loadWorkspace(workspacePath, shouldSetWorkspace, openBoardPath?) {
    if (workspacePath.endsWith('.zip')) {
      const { knownWorkspaces } = this.state;
      const newWorkspace = knownWorkspaces.find(
        ws => ws.path === workspacePath
      );
      if (newWorkspace) {
        // ! We keep the zip state for the whole app life
        this.loadSecuredWorkspaceCallback(
          newWorkspace.path,
          newWorkspace.zipdata,
          shouldSetWorkspace,
          openBoardPath
        );
      } else {
        ipcRenderer.send(
          'workspace-secured-load',
          workspacePath,
          shouldSetWorkspace,
          openBoardPath
        );
      }
    } else {
      ipcRenderer.send(
        'workspace-load',
        workspacePath,
        shouldSetWorkspace,
        openBoardPath
      );
    }
  }

  loadWorkspaceCallback(
    workspacePath,
    files,
    stats,
    shouldSetWorkspace,
    openBoardPath?
  ) {
    const { knownWorkspaces } = this.state;
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files,
      stats
    );
    if (shouldSetWorkspace) {
      this.setState({
        knownWorkspaces,
        workspace
      });
      if (workspace.numBoards > 0) {
        if (!openBoardPath) {
          this.loadBoard(0);
        } else {
          this.loadBoardWithPath(openBoardPath);
        }
      } else {
        this.setState({
          boardData: undefined
        });
        this.menuRef.current.forceUpdate();
      }
    } else {
      this.setState({
        knownWorkspaces
      });
    }
  }

  loadSecuredWorkspaceCallback(
    workspacePath,
    zipdata,
    shouldSetWorkspace,
    openBoardPath?
  ) {
    const { knownWorkspaces } = this.state;
    let workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      [],
      []
    );
    workspace.zipdata = zipdata;
    if (workspace.password) {
      JSZip.loadAsync(zipdata, { password: workspace.password })
        .then(zip => {
          const files = [];
          const stats = [];
          const zipFiles = Object.values(zip.files);
          workspace.zip = zip;
          const currDate = new Date();
          zipFiles.forEach(zo => {
            if (zo.name.endsWith('.md')) {
              files.push(zo.name);
              stats.push({
                mtimeMs: new Date(
                  new Date(zo.date).getTime() +
                    currDate.getTimezoneOffset() * 60000
                )
              });
            }
          });
          workspace = this.updateWorkspace(
            workspacePath,
            knownWorkspaces,
            files,
            stats
          );
          if (shouldSetWorkspace) {
            if (workspace.numBoards > 0) {
              if (!openBoardPath) {
                this.loadBoard(0);
              } else {
                this.loadBoardWithPath(openBoardPath);
              }
            }
          }
          return true;
        })
        .catch(error => {
          log.error(`Loading secured workspace failed: ${error}`);
        });
    }
    if (shouldSetWorkspace) {
      this.setState({
        knownWorkspaces,
        workspace
      });
      this.setState({
        boardData: undefined
      });
      this.menuRef.current.forceUpdate();
    } else {
      this.setState({
        knownWorkspaces
      });
    }
  }

  addWorkspaceCallback(workspacePath, files, stats) {
    const { knownWorkspaces } = this.state;
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files,
      stats
    );
    this.setState({
      knownWorkspaces,
      workspace
    });
    this.storeConfiguration();
    if (workspace.numBoards > 0) {
      this.loadBoard(0);
    } else {
      this.setState({
        boardData: undefined
      });
      this.menuRef.current.forceUpdate();
    }
    return workspace;
  }

  addSecuredWorkspaceCallback(workspacePath, zipdata) {
    const workspace = this.addWorkspaceCallback(workspacePath, [], []);
    workspace.zipdata = zipdata;
    this.setState({ workspace });
    return workspace;
  }

  // eslint-disable-next-line class-methods-use-this
  newSecuredWorkspace(workspacePath, password) {
    const zip = new JSZip();
    zip
      .generateAsync({
        type: 'arraybuffer',
        password,
        encryptStrength: 3
      })
      // eslint-disable-next-line promise/always-return
      .then(zipFile => {
        const data = Buffer.from(zipFile);
        const workspace = this.addSecuredWorkspaceCallback(workspacePath, data);
        workspace.password = password;
        workspace.zip = zip;
        workspace.zipdata = data;
        this.setState({ workspace });
      })
      .catch(error => {
        log.error(`Creating new secured workspace failed: ${error}`);
      });
  }

  // eslint-disable-next-line class-methods-use-this
  boardPathToName(boardPath) {
    return boardPath.substring(
      boardPath.lastIndexOf(nodePath.sep) + 1,
      boardPath.length - 3
    );
  }

  // eslint-disable-next-line class-methods-use-this
  toBoardData(boardMeta, text, stats) {
    let newText = text;
    newText = icons2links(newText);
    newText = metadata2table(newText);
    const mdCards = newText.split(/^(?=# )/gm);
    const cards = [];
    mdCards.forEach(md => {
      let title = md.match(/# (.*)\n/);
      if (title) {
        // eslint-disable-next-line prefer-destructuring
        title = title[1];
        let src = '';
        const notEmpty = md.indexOf('\n\n');
        if (notEmpty) {
          src = md.substring(notEmpty + 2);
        }
        cards.push({ title, doc: parseMarkdown(`${src}\n\n&nbsp;`) });
      }
    });
    const status = timeSince(stats.mtimeMs);
    const boardData = {
      path: boardMeta.path,
      cards,
      status,
      name: boardMeta.name
    };
    return boardData;
  }

  loadBoardCallback(boardMeta, boardContent, stats) {
    const { loading } = this.state;
    const boardData = this.toBoardData(boardMeta, boardContent, stats);
    const baseURI = document.getElementById('baseURI');
    baseURI.href = nodePath.join(
      'file:///',
      boardData.path.substring(0, boardData.path.lastIndexOf(nodePath.sep) + 1)
    );
    let newLoading = loading;
    if (loading) {
      newLoading = false;
    }
    this.setState({
      boardData,
      loading: newLoading
    });
    if (this.menuRef.current) {
      this.menuRef.current.forceUpdate();
    }
  }

  loadBoard(boardMetaIndex) {
    const { workspace } = this.state;
    workspace.selectedBoard = boardMetaIndex;
    const boardMeta = workspace.boards[boardMetaIndex];
    if (workspace.zip) {
      const zipObject = workspace.zip.file(`${boardMeta.name}.md`);
      // eslint-disable-next-line promise/catch-or-return
      zipObject
        .async('string')
        .then(content => {
          workspace.wrongPassword = false;
          this.loadBoardCallback(boardMeta, content, {
            mtimeMs: boardMeta.modified || new Date()
          });
          return true;
        })
        .catch(error => {
          log.error(`Loading secured workspace (wrong password): ${error}`);
          workspace.password = null;
          workspace.wrongPassword = true;
          this.setState({ workspace });
        });
    } else {
      ipcRenderer.send('board-read', boardMeta);
    }
  }

  newBoard(newBoardName, content?) {
    const { workspace } = this.state;
    // save board for unsaved changes
    this.autoSave(true);
    const newBoardPath = `${workspace.path}${nodePath.sep}${newBoardName}`;
    let addContent = content;
    if (!addContent) {
      addContent = '';
    }
    if (workspace.zipdata) {
      const { zip } = workspace;
      zip.file(newBoardName, addContent);
      const bp = nodePath.join(workspace.path, newBoardName);
      this.saveSecuredBoard(bp, true, false);
    } else {
      ipcRenderer.send('board-save', newBoardPath, addContent, true);
    }
  }

  newBoardCallback(newBoardPath) {
    const { workspace, settings } = this.state;
    const { sortBy } = settings;
    // This part might not be need when I add workspace watching..
    workspace.numBoards += 1;
    workspace.boards.push({
      path: newBoardPath,
      name: this.boardPathToName(newBoardPath)
    });
    workspace.boards.sort((a, b) => {
      return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
    });
    const newBoardMetaIndex = workspace.boards.findIndex(board => {
      return board.path === newBoardPath;
    });
    this.setState({ workspace });
    this.loadBoard(newBoardMetaIndex);
  }

  duplicateBoard(newBoardName) {
    this.autoSave(true);
    this.newBoard(newBoardName, this.getCurrentBoardMd());
  }

  selectBoard(boardPath) {
    // save board for unsaved changes
    this.autoSave(true);
    this.loadBoardWithPath(boardPath);
  }

  loadBoardWithPath(boardPath) {
    const { workspace } = this.state;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardPath;
    });
    if (boardIndex >= 0) {
      this.loadBoard(boardIndex);
    }
  }

  switchWorkspace(workspace) {
    this.loadWorkspace(workspace.path, true);
  }

  closeWorkspace(workspacePath) {
    const { knownWorkspaces, workspace } = this.state;
    // save board for unsaved changes
    this.autoSave(true);
    const workspaceIndex = knownWorkspaces.findIndex(w => {
      return w.path === workspacePath;
    });
    knownWorkspaces.splice(workspaceIndex, 1);
    let newWorkspaceIndex = workspaceIndex;
    if (workspaceIndex >= knownWorkspaces.length) {
      if (knownWorkspaces.length > 0) {
        newWorkspaceIndex = 0;
      } else if (knownWorkspaces.length === 0) {
        newWorkspaceIndex = -1;
        this.setState({
          knownWorkspaces,
          workspace: undefined,
          boardData: undefined
        });
        return;
      }
    }
    this.setState({ knownWorkspaces });
    if (workspace.path === workspacePath) {
      this.switchWorkspace(knownWorkspaces[newWorkspaceIndex]);
    }
    this.storeConfiguration();
    this.menuRef.current.forceUpdate();
  }

  // eslint-disable-next-line class-methods-use-this
  saveBoardCallback() {
    const { boardData, workspace, settings } = this.state;
    const { sortBy } = settings;
    // eslint-disable-next-line no-param-reassign
    boardData.status = 'All changes saved';
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardData.path;
    });
    workspace.boards[boardIndex].modified = Date.now();
    workspace.boards.sort((a, b) => {
      return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
    });
    this.setState({ boardData, workspace });
    this.menuRef.current.forceUpdate();
  }

  saveBoard(backgroundBoardData?) {
    const { workspace, boardData, saveTimer } = this.state;
    let data = boardData;
    if (backgroundBoardData) {
      data = backgroundBoardData;
    }
    if (saveTimer || backgroundBoardData) {
      const boardPath = data.path;
      const boardContent = this.getCurrentBoardMd(data);
      if (workspace.zipdata) {
        const { zip } = workspace;
        const fileName = `${boardData.name}.md`;
        zip.file(fileName, boardContent);
        const bp = nodePath.join(workspace.path, fileName);
        this.saveSecuredBoard(bp, false, backgroundBoardData !== undefined);
      } else {
        ipcRenderer.send(
          'board-save',
          boardPath,
          boardContent,
          false,
          backgroundBoardData !== undefined
        );
      }
      this.setState({ saveTimer: undefined });
    }
  }

  saveSecuredBoard(boardPath?, isNew?, inBackground?, deleted?) {
    const { workspace } = this.state;
    const { zip } = workspace;
    zip
      .generateAsync({
        type: 'arraybuffer',
        password: workspace.password,
        encryptStrength: 3
      })
      // eslint-disable-next-line promise/always-return
      .then(zipFile => {
        const zipdata = Buffer.from(zipFile);
        workspace.zipdata = zipdata;
        ipcRenderer.send(
          'board-secured-save',
          workspace.path,
          boardPath,
          zipdata,
          isNew,
          inBackground,
          deleted
        );
      })
      .catch(error => {
        log.error(`Saving secured workspace failed: ${error}`);
      });
  }

  newCard() {
    const { boardData } = this.state;
    if (boardData) {
      const { cards } = boardData;
      const doc = parseMarkdown('');
      cards.push({ doc, title: '' });
      this.autoSave();
      this.boardRef.forceUpdate();

      // This part very much depends on Board component structure!
      setTimeout(() => {
        // this.boardRef.boardRef.current.scrollTop = this.boardRef.boardRef.current.scrollHeight;
        const n = this.boardRef.boardRef.current.childNodes;
        const title =
          n[n.length - 1].firstChild.firstChild.firstChild.lastChild.firstChild
            .firstChild.firstElementChild;
        title.focus();
      }, 100);
    }
  }

  reorderCards(from, to) {
    const { boardData } = this.state;
    const { cards } = boardData;
    if (to >= cards.length) {
      let k = to - cards.length + 1;
      // eslint-disable-next-line no-plusplus
      while (k--) {
        cards.push(undefined);
      }
    }
    cards.splice(to, 0, cards.splice(from, 1)[0]);
    this.boardRef.forceUpdate();
    this.autoSave();
  }

  moveCardToBoard(cardIndex, boardPath) {
    const { workspace, boardData } = this.state;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardPath;
    });
    if (boardIndex >= 0) {
      const card = boardData.cards[cardIndex];
      boardData.cards.splice(cardIndex, 1);
      const boardMeta = workspace.boards[boardIndex];
      boardMeta.modified = Date.now();
      this.autoSave();
      const cardContent = serializeMarkdown(card.doc);
      if (workspace.zipdata) {
        const { zip } = workspace;
        const fileName = `${boardMeta.name}.md`;
        const zipObject = zip.file(fileName);
        // eslint-disable-next-line promise/catch-or-return
        zipObject.async('string').then(content => {
          const newContent = `${content}\n\n# ${
            card.title
          }\n\n${cardContent.trim()}`;
          zip.file(fileName, newContent);
          this.saveSecuredBoard(boardPath, false, true, false);
          return true;
        });
      } else {
        ipcRenderer.send('board-move-card', boardPath, card.title, cardContent);
      }
    }
  }

  editTitle(cardId, newTitle) {
    const { boardData } = this.state;
    boardData.cards[cardId].title = newTitle;
    this.autoSave();
  }

  editCard(cardId, doc, saveChanges, spoolingDoc?) {
    const { boardData } = this.state;
    const card = boardData.cards[cardId];
    const { spooling } = card;
    if (spoolingDoc) {
      const spoolingBoardData = spooling.boardData;
      spoolingBoardData.cards[spooling.cardIndex].doc = doc;
      if (saveChanges) {
        this.autoSaveSpooling(cardId);
      }
    } else {
      card.doc = doc;
      if (saveChanges) {
        this.autoSave();
      }
    }
  }

  removeCard(cardId) {
    const { boardData } = this.state;
    boardData.cards.splice(cardId, 1);
    this.autoSave();
    this.boardRef.forceUpdate();
  }

  deleteBoard() {
    const { workspace, boardData } = this.state;
    const { path } = boardData;
    if (boardData) {
      const { saveTimer } = this.state;
      if (saveTimer) {
        clearTimeout(saveTimer);
        this.setState({ saveTimer: undefined });
      }
      if (workspace.zipdata) {
        const { zip } = workspace;
        zip.remove(`${boardData.name}.md`);
        this.saveSecuredBoard(path, false, false, true);
      } else {
        ipcRenderer.send('board-delete', path);
      }
    }
  }

  deleteBoardCallback(removedBoardPath) {
    const { workspace, knownWorkspaces } = this.state;
    let boardIndex = workspace.boards.findIndex(board => {
      return board.path === removedBoardPath;
    });
    workspace.boards.splice(boardIndex, 1);
    const workspaceIndex = knownWorkspaces.findIndex(w => {
      return w.path === workspace.path;
    });
    knownWorkspaces[workspaceIndex].numBoards -= 1;
    if (boardIndex >= workspace.boards.length) {
      if (workspace.boards.length > 0) {
        boardIndex = 0;
      } else {
        boardIndex = -1;
      }
    }
    this.setState({ workspace, knownWorkspaces, boardData: undefined });
    // select next board
    if (boardIndex >= 0) {
      this.loadBoard(boardIndex);
    } else {
      this.menuRef.current.forceUpdate();
    }
  }

  renameBoard(newBoardName) {
    const { boardData, workspace } = this.state;
    const oldBoardPath = boardData.path;
    const newBoardPath = `${workspace.path}${nodePath.sep}${newBoardName}`;
    if (workspace.zipdata) {
      const { zip } = workspace;
      const mdFile = `${boardData.name}.md`;
      zip.remove(mdFile);
      zip.file(newBoardName, this.getCurrentBoardMd());
      this.saveSecuredBoard(oldBoardPath, false, true, false);
      this.renameBoardCallback(oldBoardPath, newBoardPath);
    } else {
      ipcRenderer.send('board-rename', oldBoardPath, newBoardPath);
    }
  }

  renameBoardCallback(oldBoardPath, newBoardPath) {
    const { boardData, workspace, settings } = this.state;
    const { sortBy } = settings;
    const boardName = this.boardPathToName(newBoardPath);
    boardData.path = newBoardPath;
    boardData.name = boardName;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === oldBoardPath;
    });
    const boardMeta = workspace.boards[boardIndex];
    boardMeta.path = newBoardPath;
    boardMeta.name = boardName;
    boardMeta.modified = Date.now();
    workspace.boards.sort((a, b) => {
      return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
    });
    this.setState({ boardData, workspace });
    this.menuRef.current.forceUpdate();
  }

  openDefaultBoard() {
    const { workspaceOnStartup, boardOnStartup } = this.state;
    this.loadWorkspace(workspaceOnStartup, true, boardOnStartup);
  }

  processSpoolingData(
    boardPath,
    boardContent,
    stats,
    spoolingCardIndex?,
    cardName?
  ) {
    if (boardContent === null) {
      // spooling board file does not exist
      AppToaster.show({
        message: `Cannot find and open '${decodeURI(boardPath)}' notebook`,
        intent: Intent.DANGER
      });
      return;
    }
    const { spoolingSavingCardIndex } = this.state;
    if (spoolingSavingCardIndex) {
      this.autoSaveSpooling(spoolingSavingCardIndex, true);
    }
    const spoolingBoardMeta = {
      path: boardPath,
      name: this.boardPathToName(boardPath)
    };
    const spoolingBoardData = this.toBoardData(
      spoolingBoardMeta,
      boardContent,
      stats
    );
    if (spoolingCardIndex !== null) {
      // Start spooling
      const cardIndex = spoolingBoardData.cards.findIndex(card => {
        return card.title === cardName;
      });
      if (cardIndex < 0) {
        AppToaster.show({
          message: `Cannot find and open '${cardName}' cardnote in '${boardPath}' notebook`,
          intent: Intent.DANGER
        });
        return;
      }
      if (spoolingCardIndex >= 0) {
        const { boardData } = this.state;
        boardData.cards[spoolingCardIndex].spooling = {
          boardData: spoolingBoardData,
          cardIndex
        };
        this.boardRef.forceUpdate();
      }
    } else if (this.spoolingBoardDataResolve) {
      // Pass spooling board to the editor
      this.spoolingBoardDataResolve(spoolingBoardData);
      this.spoolingBoardDataResolve = undefined;
    }
  }

  requestBoardDataAsync(boardPath) {
    const promiseResponse = resolve => {
      this.spoolingBoardDataResolve = resolve;
      ipcRenderer.send('board-spooling-load', boardPath);
    };
    return new Promise(promiseResponse);
  }

  requestBoardsAsync() {
    return new Promise(resolve => {
      const { workspace, knownWorkspaces } = this.state;
      // get boards from the current workspace
      let allBoards = [];
      allBoards = allBoards.concat(workspace.boards);
      knownWorkspaces.forEach(w => {
        if (workspace.path !== w.path) {
          allBoards = allBoards.concat(w.boards);
        }
      });
      resolve(allBoards);
    });
  }

  changeSettings(newSettings) {
    const { settings, workspace } = this.state;
    const { sortBy, filterBy, notecardWidth } = settings;
    if (newSettings.sortBy !== sortBy) {
      sortBy.method = newSettings.sortBy.sortName;
      sortBy.asc = newSettings.sortBy.sortAsc;
      sortBy.icon = newSettings.sortBy.sortIcon;
      workspace.boards.sort((a, b) => {
        return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
      });
      CONFIG_STORE.set(CONFIG.SORTBY, sortBy);
    }
    if (newSettings.filterBy !== filterBy) {
      filterBy.name = newSettings.filterBy.filterName;
      filterBy.icon = newSettings.filterBy.filterIcon;
      CONFIG_STORE.set(CONFIG.FILTERBY, filterBy);
    }
    let updateBoard = false;
    if (newSettings.notecardWidth !== notecardWidth) {
      updateBoard = true;
      settings.notecardWidth = newSettings.notecardWidth;
    }
    this.setState({ settings });
    if (updateBoard) {
      this.boardRef.forceUpdate();
    }
  }

  startSpooling(workspaceName, boardName, cardName, cardIndex) {
    const { knownWorkspaces, workspace } = this.state;
    const spoolingWorkspace = workspaceName
      ? knownWorkspaces.find(w => w.name === workspaceName)
      : workspace;
    const boardMeta = spoolingWorkspace.boards.find(b => b.name === boardName);
    if (boardMeta) {
      ipcRenderer.send(
        'board-spooling-load',
        boardMeta.path,
        cardIndex,
        cardName
      );
      return true;
    }
    return false;
  }

  stopSpooling(spoolingCardIndex) {
    const { boardData } = this.state;
    this.autoSaveSpooling(spoolingCardIndex, true);
    boardData.cards[spoolingCardIndex].spooling = undefined;
    this.boardRef.forceUpdate();
  }

  openBoard(boardPath) {
    const workspacePath = boardPath.substring(
      0,
      boardPath.lastIndexOf(nodePath.sep)
    );
    this.loadWorkspace(workspacePath, true, boardPath);
  }

  exportToPDF() {
    const htmlSource = md2html(this.getCurrentBoardMd());
    ipcRenderer.send('export-pdf', htmlSource);
  }

  autoSave(immediatelyWhenNeeded?) {
    const { boardData } = this.state;
    let { saveTimer } = this.state;
    const shouldSave =
      immediatelyWhenNeeded !== undefined &&
      immediatelyWhenNeeded &&
      saveTimer !== undefined;
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    if (shouldSave) {
      this.saveBoard();
    } else if (!immediatelyWhenNeeded) {
      boardData.status = 'Saving...';
      saveTimer = setTimeout(() => {
        this.saveBoard(); // save board 3s after the last change
      }, 3000);
      this.setState({ saveTimer });
    }
  }

  autoSaveSpooling(spoolingCardIndex, immediatelyWhenNeeded?) {
    const { boardData } = this.state;
    const { spoolingTimer, spoolingSavingCardIndex } = this.state;
    const shouldSave =
      immediatelyWhenNeeded !== undefined &&
      immediatelyWhenNeeded &&
      spoolingSavingCardIndex !== undefined;
    const saveSpoolingBoard = cardIndex => {
      const spoolingBoardData = boardData.cards[cardIndex].spooling.boardData;
      this.saveBoard(spoolingBoardData);
      spoolingBoardData.status = 'All changes saved';
      const status = document.getElementById(`subnote-${spoolingCardIndex}`);
      status.classList.remove('subnote-active');
      this.setState({ spoolingSavingCardIndex: undefined });
    };
    if (
      spoolingSavingCardIndex &&
      spoolingSavingCardIndex !== spoolingCardIndex
    ) {
      clearTimeout(spoolingTimer);
      saveSpoolingBoard(spoolingSavingCardIndex);
    } else if (spoolingTimer) {
      clearTimeout(spoolingTimer);
    }
    if (shouldSave) {
      saveSpoolingBoard(spoolingCardIndex);
    } else if (!immediatelyWhenNeeded) {
      const newSpoolingTimer = setTimeout(() => {
        saveSpoolingBoard(spoolingCardIndex);
      }, 3000);
      const spoolingBoardData =
        boardData.cards[spoolingCardIndex].spooling.boardData;
      if (spoolingBoardData.status !== 'Saving...') {
        spoolingBoardData.status = 'Saving...';
        const status = document.getElementById(`subnote-${spoolingCardIndex}`);
        status.classList.add('subnote-active');
      }
      this.setState({
        spoolingTimer: newSpoolingTimer,
        spoolingSavingCardIndex: spoolingCardIndex
      });
    }
  }

  storeConfiguration() {
    const { knownWorkspaces } = this.state;
    const workspaces = [];
    knownWorkspaces.forEach(workspace => {
      workspaces.push(workspace.path);
    });
    CONFIG_STORE.set(CONFIG.WORKSPACES, workspaces);
  }

  render() {
    const {
      knownWorkspaces,
      workspace,
      boardData,
      settings,
      showPassword,
      loading
    } = this.state;

    if (loading) {
      return (
        <div style={{ height: '100%' }}>
          <Spinner
            intent={Intent.PRIMARY}
            size={80}
            className={styles.loading}
          />
        </div>
      );
    }

    const OpenWorkspace = (
      <Button
        intent={Intent.PRIMARY}
        onClick={() => ipcRenderer.send('workspace-add')}
      >
        Open Workspace
      </Button>
    );
    const { menuRef } = this;
    const CreateBoard = (
      <Button
        intent={Intent.PRIMARY}
        onClick={() => menuRef.current.newBoardOpen()}
      >
        Create Notebook
      </Button>
    );

    const lockButton = (
      <Tooltip content={`${showPassword ? 'Hide' : 'Show'} Password`}>
        <Button
          icon={showPassword ? 'unlock' : 'lock'}
          intent={Intent.WARNING}
          minimal
          onClick={() => {
            this.setState({ showPassword: !showPassword });
          }}
        />
      </Tooltip>
    );

    const boardStatus = boardData && boardData.status ? boardData.status : '';

    let mainContent;

    if (workspace) {
      if (boardData) {
        mainContent = (
          <Board
            key="board"
            // eslint-disable-next-line no-return-assign
            ref={el => {
              this.boardRef = el;
            }}
            boardData={boardData}
            workspace={workspace}
            settings={settings}
            onEditTitle={this.editTitle}
            onEditCard={this.editCard}
            onNewCard={this.newCard}
            onReorderCards={this.reorderCards}
            onRemoveCard={this.removeCard}
            onRequestBoardsAsync={this.requestBoardsAsync}
            onRequestBoardDataAsync={this.requestBoardDataAsync}
            onStartSpooling={this.startSpooling}
            onStopSpooling={this.stopSpooling}
            onOpenBoard={this.openBoard}
          />
        );
      } else if (
        workspace.zipdata &&
        (!workspace.password || workspace.wrongPassword !== false)
      ) {
        // secured workspace without password
        mainContent = (
          <NonIdealState
            key="locked-workspace"
            icon="lock"
            title="Locked Workspace"
            description="This secured workspace is currently locked. Enter the password and load its notebooks."
          >
            <InputGroup
              type={showPassword ? 'text' : 'password'}
              rightElement={lockButton}
              autoFocus
              intent={workspace.wrongPassword ? Intent.DANGER : Intent.NONE}
              placeholder="Enter password..."
              inputRef={(pwdInput: HTMLInputElement) => {
                this.pwdInput = pwdInput;
              }}
            />
            <Button
              intent={Intent.PRIMARY}
              onClick={() => {
                const password = this.pwdInput.value;
                workspace.password = password;
                this.loadSecuredWorkspaceCallback(
                  workspace.path,
                  workspace.zipdata,
                  true
                );
              }}
            >
              Unlock Workspace
            </Button>
          </NonIdealState>
        );
      } else {
        mainContent = (
          <NonIdealState
            key="empty-workspace"
            icon="grid-view"
            title="Empty Workspace"
            description="Start with creating a new notebook, the place where you will capture and analyze related information. For example 'Accounts', 'Insurances', 'Investments' in 'Finance' workspace. Every notebook will be stored as a standalone .md Markdown file in the current workspace."
            action={CreateBoard}
          />
        );
      }
    }

    return (
      <div
        className={`${styles.container} ${Classes.DARK}`}
        data-tid="container"
      >
        {workspace ? (
          [
            <Menu
              key="menu"
              ref={menuRef}
              boardData={boardData}
              boardStatus={boardStatus}
              knownWorkspaces={knownWorkspaces}
              workspace={workspace}
              settings={settings}
              onSelectBoard={this.selectBoard}
              onDeleteBoard={this.deleteBoard}
              onMoveCardToBoard={this.moveCardToBoard}
              onCloseWorkspace={this.closeWorkspace}
              onSwitchWorkspace={this.switchWorkspace}
              onSetBoardOnStartup={this.setBoardOnStartup}
              onSettingsChange={this.changeSettings}
              onNewCard={this.newCard}
              onNewSecuredWorkspace={this.newSecuredWorkspace}
              onExportToPDF={this.exportToPDF}
              onNewBoard={this.newBoard}
              onDuplicateBoard={this.duplicateBoard}
              onRenameBoard={this.renameBoard}
            />,
            mainContent
          ]
        ) : (
          <NonIdealState
            icon="folder-open"
            title="No Workspace"
            description="Start with opening or creating a new folder as your first workspace context. Name it according to where and when you may need to work with the stored information. For example 'Family', 'Job', 'Finance', 'Civil', 'Hobbies', 'Shopping', 'House Keeping', 'Ideas', 'Past'."
            action={OpenWorkspace}
          />
        )}
      </div>
    );
  }
}

export default Home;
