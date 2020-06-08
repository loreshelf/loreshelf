import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import nodePath from 'path';
import {
  Classes,
  NonIdealState,
  Button,
  Intent,
  InputGroup
} from '@blueprintjs/core';
import Store from 'electron-store';
import SHA512 from 'crypto-js/sha512';
import JSZip from '../utils/jszip';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';
import { timeSince } from '../utils/CoreFunctions';
import { parseMarkdown, serializeMarkdown } from './Markdown';
import MarkdownIcons from './MarkdownIcons';
import AppToaster from './AppToaster';
import Metadata from '../editor/Metadata';

const CONFIG_SCHEMA = {
  workspaces: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  homeWorkspace: {
    type: 'string'
  },
  homeBoard: {
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

// workspaces=[path1, path2], homeWorkspace, homeBoard
const CONFIG_STORE = new Store(CONFIG_SCHEMA);

enum CONFIG {
  WORKSPACES = 'workspaces',
  HOMEWORKSPACE = 'homeWorkspace',
  HOMEBOARD = 'homeBoard',
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

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

class Home extends Component {
  constructor() {
    super();

    const workspace = undefined; // {selectedBoard:0, name, path, numBoards, boards:[{name1, path1, modified1}, {name2, path2}], zip }}
    const boardData = undefined; // {cards = [{doc, title, spooling={ boardPath, cardTitle }}], path, name, status, modified}
    const knownWorkspaces = []; // [workspace1, workspace2]

    const homeBoard = undefined; // = boardPath
    const deviceId = undefined;

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

    this.menuRef = React.createRef();
    this.boardRef = React.createRef();

    this.state = {
      workspace,
      boardData,
      saveTimer,
      spoolingTimer,
      spoolingSavingCardIndex,
      knownWorkspaces,
      homeBoard,
      sortBy,
      filterBy,
      deviceId
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
    this.openHomeBoard = this.openHomeBoard.bind(this);
    this.openBoard = this.openBoard.bind(this);
    this.setHome = this.setHome.bind(this);
    this.moveCardToBoard = this.moveCardToBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
    this.closeWorkspace = this.closeWorkspace.bind(this);
    this.boardPathToName = this.boardPathToName.bind(this);
    this.requestBoardsAsync = this.requestBoardsAsync.bind(this);
    this.requestBoardDataAsync = this.requestBoardDataAsync.bind(this);
    this.startSpooling = this.startSpooling.bind(this);
    this.stopSpooling = this.stopSpooling.bind(this);
    this.selectSort = this.selectSort.bind(this);
    this.selectFilter = this.selectFilter.bind(this);
    this.licenseActivated = this.licenseActivated.bind(this);
    this.newSecuredWorkspace = this.newSecuredWorkspace.bind(this);

    window.onkeydown = e => {
      if (e.ctrlKey) {
        document.body.className = 'ctrl';
      } else if (document.body.className === 'ctrl') {
        document.body.className = '';
      }
    };
    window.onkeyup = e => {
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

    ipcRenderer.on('deviceId-callback', (event, deviceId) => {
      self.checkLicense(deviceId);
    });

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
    const homeWorkspace = CONFIG_STORE.get(CONFIG.HOMEWORKSPACE);
    const homeBoard = CONFIG_STORE.get(CONFIG.HOMEBOARD);
    if (homeWorkspace && homeBoard) {
      this.loadWorkspace(homeWorkspace, true, homeBoard);
    }
    if (workspaces) {
      let shouldSetFirst = !homeWorkspace;
      workspaces.forEach(workspacePath => {
        if (workspacePath !== homeWorkspace) {
          this.loadWorkspace(workspacePath, shouldSetFirst);
          shouldSetFirst = false;
        }
      });
    }
    this.setState({ homeWorkspace, homeBoard });
    ipcRenderer.send('deviceId');
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

  setHome() {
    const { boardData, workspace } = this.state;
    CONFIG_STORE.set(CONFIG.HOMEBOARD, boardData.path);
    CONFIG_STORE.set(CONFIG.HOMEWORKSPACE, workspace.path);
    this.setState({ homeBoard: boardData.path, homeWorkspace: workspace.path });
  }

  checkLicense(deviceId) {
    const SLV_STORE = new Store({
      name: 'slv',
      encryptionKey: deviceId
    });
    const email = SLV_STORE.get('email');
    const licenseKey = SLV_STORE.get('licenseKey');
    const hash = SHA512(`${email}-${licenseKey}+${deviceId}`);
    const hashString = hash.toString();
    const originalHash = SLV_STORE.get('hash');
    if (hashString === originalHash) {
      this.setState({ pro: true, deviceId });
    } else {
      this.setState({ pro: false, deviceId });
      /** setTimeout(() => {
        if (this.menuRef.current) {
          this.menuRef.current.licensePopupOpen();
        }
      }, 2000); */
    }
  }

  updateWorkspace(workspacePath, knownWorkspaces, files, stats) {
    const { sortBy } = this.state;
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
          console.error(error);
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
        console.error(error);
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
    MarkdownIcons.forEach(mdi => {
      const regExp = new RegExp(escapeRegExp(mdi.code), 'g');
      newText = newText.replace(regExp, `![Icon](${mdi.icon})`);
    });
    const metaData = new RegExp('^```metadata\\n(((?!```).)*)\\n```$', 'msg');
    let found = metaData.exec(newText);
    while (found) {
      newText = newText.replace(
        found[0],
        Metadata.getInstance().transformToTable(found[1])
      );
      found = metaData.exec(newText);
    }
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

  // eslint-disable-next-line class-methods-use-this
  loadBoardCallback(boardMeta, boardContent, stats) {
    const boardData = this.toBoardData(boardMeta, boardContent, stats);
    const baseURI = document.getElementById('baseURI');
    baseURI.href = nodePath.join(
      'file:///',
      boardData.path.substring(0, boardData.path.lastIndexOf(nodePath.sep) + 1)
    );
    this.setState({
      boardData
    });
    this.menuRef.current.forceUpdate();
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
          console.log(error);
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
    const { workspace, sortBy } = this.state;
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
    const { boardData, workspace, sortBy } = this.state;
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
        console.error(error);
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
        this.boardRef.boardRef.current.scrollTop = this.boardRef.boardRef.current.scrollHeight;
        const n = this.boardRef.boardRef.current.childNodes;
        const title =
          n[n.length - 1].firstChild.firstChild.lastChild.firstChild.firstChild
            .firstElementChild;
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
    const { boardData, workspace, sortBy } = this.state;
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

  openHomeBoard() {
    const { homeWorkspace, homeBoard } = this.state;
    this.loadWorkspace(homeWorkspace, true, homeBoard);
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
    const promiseResponse = (resolve, reject) => {
      this.spoolingBoardDataResolve = resolve;
      ipcRenderer.send('board-spooling-load', boardPath);
    };
    return new Promise(promiseResponse);
  }

  requestBoardsAsync() {
    return new Promise((resolve, reject) => {
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

  selectSort(sortName, sortAsc, sortIcon) {
    const { sortBy, workspace } = this.state;
    sortBy.method = sortName;
    sortBy.asc = sortAsc;
    sortBy.icon = sortIcon;
    workspace.boards.sort((a, b) => {
      return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
    });
    this.setState({ sortBy, workspace });
    CONFIG_STORE.set(CONFIG.SORTBY, sortBy);
  }

  selectFilter(filterName, filterIcon) {
    const { filterBy } = this.state;
    filterBy.name = filterName;
    filterBy.icon = filterIcon;
    this.setState({ filterBy });
    CONFIG_STORE.set(CONFIG.FILTERBY, filterBy);
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

  // eslint-disable-next-line class-methods-use-this
  licenseActivated(email, licenseKey, deviceId, hash) {
    const SLV_STORE = new Store({
      name: 'slv',
      encryptionKey: deviceId
    });
    const hashCheck = SHA512(`${email}-${licenseKey}+${deviceId}`);
    const hashString = hashCheck.toString();
    if (hashString === hash) {
      SLV_STORE.set('email', email);
      SLV_STORE.set('licenseKey', licenseKey);
      SLV_STORE.set('hash', hash);
    }
    this.checkLicense(deviceId);
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
      homeBoard,
      sortBy,
      filterBy,
      deviceId,
      pro
    } = this.state;
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
              type="password"
              leftIcon="key"
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
              homeBoard={homeBoard}
              sortBy={sortBy}
              filterBy={filterBy}
              pro={pro}
              deviceId={deviceId}
              onNewBoard={this.newBoard}
              onDuplicateBoard={this.duplicateBoard}
              onSelectBoard={this.selectBoard}
              onDeleteBoard={this.deleteBoard}
              onRenameBoard={this.renameBoard}
              onMoveCardToBoard={this.moveCardToBoard}
              onCloseWorkspace={this.closeWorkspace}
              onSwitchWorkspace={this.switchWorkspace}
              onOpenHomeBoard={this.openHomeBoard}
              onSetHome={this.setHome}
              onSortSelect={this.selectSort}
              onFilterSelect={this.selectFilter}
              onNewCard={this.newCard}
              onLicenseActivated={this.licenseActivated}
              onNewSecuredWorkspace={this.newSecuredWorkspace}
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
