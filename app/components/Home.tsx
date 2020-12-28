/* eslint-disable no-param-reassign */
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
  Spinner,
  ButtonGroup
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
import { AppToaster, AppUpdateToaster } from './AppToaster';
import brandIcon from '../resources/icon.png';
import SidePanel from './SidePanel';
import StatusBar from './StatusBar';

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
  },
  rememberLastNotebook: {
    type: 'boolean'
  },
  globalAppKeyEnabled: {
    type: 'boolean'
  }
};

// workspaces=[path1, path2], workspaceOnStartup, notebookOnStartup
const CONFIG_STORE = new Store(CONFIG_SCHEMA);

enum CONFIG {
  WORKSPACES = 'workspaces',
  WORKSPACEONSTARTUP = 'workspaceOnStartup',
  NOTEBOOKONSTARTUP = 'notebookOnStartup',
  SORTBY = 'sortBy',
  FILTERBY = 'filterBy',
  UPDATELASTCHECKED = 'updateLastChecked',
  NOTECARDWIDTH = 'notecardWidth',
  REMEMBERLASTNOTEBOOK = 'rememberLastNotebook',
  GLOBALAPPKEYENABLED = 'globalAppKeyEnabled'
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
    const notecardWidth = CONFIG_STORE.get(CONFIG.NOTECARDWIDTH, 220);
    const rememberLastNotebook = CONFIG_STORE.get(CONFIG.REMEMBERLASTNOTEBOOK);
    const globalAppKeyEnabled = CONFIG_STORE.get(CONFIG.GLOBALAPPKEYENABLED);

    const updateDateStr = CONFIG_STORE.get(CONFIG.UPDATELASTCHECKED);
    const updateLastChecked = updateDateStr ? new Date(updateDateStr) : null;

    const saveTimer = undefined;
    const spoolingTimer = undefined;
    const spoolingSavingCardIndex = undefined;
    const settings = {
      sortBy,
      filterBy,
      notecardWidth,
      rememberLastNotebook,
      globalAppKeyEnabled: globalAppKeyEnabled || false
    };

    this.menuRef = React.createRef();
    this.boardRef = React.createRef();
    this.sidePanelRef = React.createRef();

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
      loading: true,
      appVersion: '?',
      updateLastChecked,
      showonly: { enabled: false, notecards: null }
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
    this.moveBoardToWorkspace = this.moveBoardToWorkspace.bind(this);
    this.openDefaultBoard = this.openDefaultBoard.bind(this);
    this.openBoard = this.openBoard.bind(this);
    this.setBoardOnStartup = this.setBoardOnStartup.bind(this);
    this.moveCardToBoard = this.moveCardToBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
    this.closeWorkspaceCallback = this.closeWorkspaceCallback.bind(this);
    this.boardPathToName = this.boardPathToName.bind(this);
    this.requestBoardsAsync = this.requestBoardsAsync.bind(this);
    this.requestBoardDataAsync = this.requestBoardDataAsync.bind(this);
    this.startSpooling = this.startSpooling.bind(this);
    this.stopSpooling = this.stopSpooling.bind(this);
    this.changeSettings = this.changeSettings.bind(this);
    this.newSecuredWorkspace = this.newSecuredWorkspace.bind(this);
    this.onStartupCallback = this.onStartupCallback.bind(this);
    this.exportToPDF = this.exportToPDF.bind(this);
    this.switchShowOnly = this.switchShowOnly.bind(this);

    window.onkeydown = e => {
      if (e.ctrlKey || e.metaKey) {
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
        appVersion,
        workspaceOnStartupExist,
        boardOnStartupExist,
        existingWorkspaces,
        loreshelfDocsWorkspacePath
      ) => {
        self.setState({ appVersion });
        self.onStartupCallback(
          workspaceOnStartupExist,
          boardOnStartupExist,
          existingWorkspaces,
          loreshelfDocsWorkspacePath
        );
      }
    );

    ipcRenderer.on(
      'workspace-add-callback',
      (event, workspacePath, files, stats, readonly) => {
        self.addWorkspaceCallback(workspacePath, files, stats, readonly);
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
        openBoardPath,
        readonly
      ) => {
        self.loadWorkspaceCallback(
          workspacePath,
          files,
          stats,
          shouldSetWorkspace,
          openBoardPath,
          readonly
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

    ipcRenderer.on('board-save-callback', (event, stats?, error?) => {
      if (error) {
        AppToaster.show({
          message: `Error when saving the notebook. Please check your permissions.`,
          intent: Intent.DANGER
        });
      } else {
        self.saveBoardCallback(stats);
      }
    });

    ipcRenderer.on('board-new-callback', (event, newBoardPath, error?) => {
      if (error) {
        AppToaster.show({
          message: `Error when creating new notebook. Please check your permissions.`,
          intent: Intent.DANGER
        });
      } else {
        self.newBoardCallback(newBoardPath);
      }
    });

    ipcRenderer.on(
      'board-rename-callback',
      (event, oldBoardPath, newBoardPath) => {
        self.renameBoardCallback(oldBoardPath, newBoardPath);
      }
    );

    ipcRenderer.on(
      'board-move-to-workspace-callback',
      (event, boardPath?, newBoardPath?, targetWorkspacePath?) => {
        self.moveBoardToWorkspaceCallback(
          boardPath,
          newBoardPath,
          targetWorkspacePath
        );
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

    ipcRenderer.on('event-workspace-removed', (event, removedWorkspacePath) => {
      self.closeWorkspaceCallback(removedWorkspacePath);
    });

    ipcRenderer.on('workspace-close-callback', (event, closedWorkspacePath) => {
      self.closeWorkspaceCallback(closedWorkspacePath);
    });

    ipcRenderer.on('event-board-added', (event, boardPath) => {
      const { knownWorkspaces, ignoreRenameEvent } = self.state;
      if (
        ignoreRenameEvent &&
        ignoreRenameEvent.length === 2 &&
        ignoreRenameEvent[1] === boardPath
      ) {
        ignoreRenameEvent.splice(0, ignoreRenameEvent.length);
        return;
      }
      const workspacePath = boardPath.substring(
        0,
        boardPath.lastIndexOf(nodePath.sep)
      );
      const workspaceIndex = knownWorkspaces.findIndex(w => {
        return w.path === workspacePath;
      });
      const workspace = knownWorkspaces[workspaceIndex];
      const boardIndex = workspace.boards.findIndex(board => {
        return board.path === boardPath;
      });
      if (boardIndex < 0) {
        self.newBoardInWorkspaceCallback(
          knownWorkspaces[workspaceIndex],
          boardPath
        );
        if (self.menuRef.current) {
          self.menuRef.current.forceUpdate();
        }
      }
    });

    ipcRenderer.on('event-board-modified', (event, boardPath, stats) => {
      const { boardData } = self.state;
      if (stats.mtimeMs !== boardData.modified) {
        self.loadBoardWithPath(boardPath);
      }
    });

    ipcRenderer.on('event-board-removed', (event, removedBoardPath) => {
      const { ignoreRenameEvent } = self.state;
      if (
        ignoreRenameEvent &&
        ignoreRenameEvent.length === 2 &&
        ignoreRenameEvent[0] === removedBoardPath
      ) {
        return;
      }
      self.deleteBoardCallback(removedBoardPath);
    });

    ipcRenderer.on('update-check-callback', (event, version, auto) => {
      const { appVersion } = self.state;
      if (version && appVersion !== version) {
        AppUpdateToaster.show({
          message: `New version ${version} available.`,
          intent: Intent.SUCCESS,
          action: {
            onClick: () => {
              self.setState({ updateDownloading: true });
              ipcRenderer.send('update-download');
            },
            text: 'Download'
          },
          timeout: 60000
        });
      } else if (!auto) {
        AppUpdateToaster.show({
          message: `No updates available.`,
          intent: Intent.PRIMARY,
          timeout: 3000
        });
      }
      const newVersion = version == null ? appVersion : version;
      self.setState({ updateLastChecked: Date.now(), newVersion });
      CONFIG_STORE.set(CONFIG.UPDATELASTCHECKED, updateLastChecked);
    });

    ipcRenderer.on('update-download-callback', () => {
      const { newVersion } = self.state;
      self.setState({ updateDownloading: false, appVersion: newVersion });
      AppUpdateToaster.show({
        message: `To install the update, the app must be restarted.`,
        intent: Intent.SUCCESS,
        action: {
          onClick: () => ipcRenderer.send('update-install'),
          text: 'Install and restart'
        },
        timeout: 360000
      });
    });

    ipcRenderer.on('remember-last-notebook', () => {
      const { rememberLastNotebook } = self.state.settings;
      if (rememberLastNotebook) {
        self.setBoardOnStartup();
      }
    });

    ipcRenderer.on('refresh-and-save-callback', () => {
      self.autoSave();
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
    const workspaceOnStartup = CONFIG_STORE.get(CONFIG.WORKSPACEONSTARTUP);
    const boardOnStartup = CONFIG_STORE.get(CONFIG.NOTEBOOKONSTARTUP);
    ipcRenderer.send(
      'places-exist',
      workspaceOnStartup,
      boardOnStartup,
      workspaces
    );
    setTimeout(() => {
      const { loading, updateLastChecked } = this.state;
      if (loading) {
        this.setState({ loading: false });
      }
      if (!updateLastChecked) {
        ipcRenderer.send('update-check', true);
      } else {
        const diff = Date.now() - updateLastChecked.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        if (diff >= oneDay) {
          ipcRenderer.send('update-check', true);
        }
      }
    }, 1000);
  }

  onStartupCallback(
    workspaceOnStartup,
    boardOnStartup,
    existingWorkspaces,
    loreshelfDocsWorkspacePath
  ) {
    const { settings } = this.state;
    if (settings.globalAppKeyEnabled) {
      ipcRenderer.send('toggle-global-app-key', true);
    }
    this.setState({ loreshelfDocsWorkspacePath });
    const configWorkspaces = CONFIG_STORE.get(CONFIG.WORKSPACES);
    const configBoardOnStartup = CONFIG_STORE.get(CONFIG.NOTEBOOKONSTARTUP);
    const isSecured = workspaceOnStartup && workspaceOnStartup.endsWith('.zip');
    if (!isSecured && !boardOnStartup && configBoardOnStartup) {
      CONFIG_STORE.delete(CONFIG.WORKSPACEONSTARTUP);
      CONFIG_STORE.delete(CONFIG.NOTEBOOKONSTARTUP);
    }
    if (!boardOnStartup) {
      // remember last notebook by default when no notebook is set to open on startup
      this.setRememberLastNotebook(true);
    }
    if (
      !configWorkspaces ||
      configWorkspaces.length !== existingWorkspaces.length
    ) {
      CONFIG_STORE.set(CONFIG.WORKSPACES, existingWorkspaces);
    }
    if (workspaceOnStartup && boardOnStartup) {
      this.loadWorkspace(workspaceOnStartup, true, boardOnStartup);
      this.setState({ workspaceOnStartup, boardOnStartup });
    }
    if (existingWorkspaces) {
      let shouldSetFirst =
        !isSecured && !(workspaceOnStartup && boardOnStartup);
      existingWorkspaces.forEach(workspacePath => {
        if (isSecured && workspacePath === workspaceOnStartup) {
          this.loadWorkspace(workspacePath, true);
        } else {
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
    if (boardData) {
      CONFIG_STORE.set(CONFIG.NOTEBOOKONSTARTUP, boardData.path);
      CONFIG_STORE.set(CONFIG.WORKSPACEONSTARTUP, workspace.path);
      this.setState({
        boardOnStartup: boardData.path,
        workspaceOnStartup: workspace.path
      });
    }
  }

  setRememberLastNotebook(val) {
    CONFIG_STORE.set(CONFIG.REMEMBERLASTNOTEBOOK, val);
    const { settings } = this.state;
    settings.rememberLastNotebook = val;
    this.setState({ settings });
  }

  updateWorkspace(
    workspacePath,
    knownWorkspaces,
    files,
    stats,
    readonly? = false
  ) {
    const { settings, loreshelfDocsWorkspacePath } = this.state;
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
    workspace.readonly =
      readonly || workspace.path === loreshelfDocsWorkspacePath;
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
    openBoardPath?,
    readonly
  ) {
    const { knownWorkspaces } = this.state;
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files,
      stats,
      readonly
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
        if (this.menuRef.current) {
          this.menuRef.current.forceUpdate();
        }
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
          zipFiles.forEach(zo => {
            if (zo.name.endsWith('.md')) {
              files.push(zo.name);
              stats.push({
                mtimeMs: new Date(new Date(zo.date).getTime())
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
                const workspaceOnStartup = CONFIG_STORE.get(
                  CONFIG.WORKSPACEONSTARTUP
                );
                const boardOnStartup = CONFIG_STORE.get(
                  CONFIG.NOTEBOOKONSTARTUP
                );
                if (workspaceOnStartup === workspace.path) {
                  this.loadBoardWithPath(boardOnStartup);
                }
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
      if (this.menuRef.current) {
        this.menuRef.current.forceUpdate();
      }
    } else {
      this.setState({
        knownWorkspaces
      });
    }
  }

  addWorkspaceCallback(workspacePath, files, stats, readonly) {
    const { knownWorkspaces } = this.state;
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files,
      stats,
      readonly
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
      if (this.menuRef.current) {
        this.menuRef.current.forceUpdate();
      }
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
        if (this.menuRef.current) {
          this.menuRef.current.forceUpdate();
        }
        if (this.boardRef) {
          this.boardRef.forceUpdate();
        }
        return 0;
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
        const nodes = parseMarkdown(src);
        cards.push({ title, doc: nodes });
      }
    });
    const status = timeSince(stats.mtimeMs);
    const modified = stats.mtimeMs;
    const boardData = {
      path: boardMeta.path,
      cards,
      status,
      modified,
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

  loadBoard(boardMetaIndex, searchResult?) {
    const { workspace, showonly } = this.state;
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
    if (searchResult) {
      showonly.enabled = true;
      showonly.searchResult = searchResult;
      this.setState({ showonly });
      this.boardRef.forceUpdate();
    } else {
      showonly.enabled = false;
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

  newBoardInWorkspaceCallback(workspace, newBoardPath) {
    const { settings } = this.state;
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
  }

  newBoardCallback(newBoardPath) {
    const { workspace } = this.state;
    this.newBoardInWorkspaceCallback(workspace, newBoardPath);
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

  loadBoardWithPath(boardPath, searchResult?) {
    const { workspace } = this.state;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardPath;
    });
    if (boardIndex >= 0) {
      this.loadBoard(boardIndex, searchResult);
    }
  }

  switchWorkspace(workspace) {
    this.loadWorkspace(workspace.path, true);
  }

  closeWorkspaceCallback(workspacePath) {
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
        this.storeConfiguration();
        return;
      }
    }
    this.setState({ knownWorkspaces });
    if (workspace.path === workspacePath) {
      this.switchWorkspace(knownWorkspaces[newWorkspaceIndex]);
    }
    this.storeConfiguration();
    if (this.menuRef.current) {
      this.menuRef.current.forceUpdate();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  saveBoardCallback(stats?) {
    const { boardData, workspace, settings } = this.state;
    const { sortBy } = settings;
    // eslint-disable-next-line no-param-reassign
    boardData.status = 'All changes saved';
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardData.path;
    });
    if (stats) {
      workspace.boards[boardIndex].modified = stats.mtimeMs;
      boardData.modified = stats.mtimeMs;
    } else if (workspace.zip) {
      const zipFiles = Object.values(workspace.zip.files);
      const zipFile = zipFiles.find(zo => {
        const boardPath = nodePath.join(workspace.path, zo.name);
        return boardPath === boardData.path;
      });
      const modifiedTime = new Date(new Date(zipFile.date).getTime());
      workspace.boards[boardIndex].modified = modifiedTime;
      boardData.modified = modifiedTime;
    }
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
        const n = this.boardRef.boardRef.current.firstChild.childNodes;
        const title =
          n[n.length - 1].firstChild.firstChild.firstChild.firstChild.lastChild
            .firstChild.firstChild.firstChild.firstElementChild;
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
      const board = workspace.boards.find(b => {
        return b.path === boardData.path;
      });
      if (board.content) {
        this.sidePanelRef.current.removeBoardFromIndex(board);
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
    const { workspace, knownWorkspaces, boardData } = this.state;
    let boardIndex = workspace.boards.findIndex(board => {
      return board.path === removedBoardPath;
    });
    workspace.boards.splice(boardIndex, 1);
    const workspaceIndex = knownWorkspaces.findIndex(w => {
      return w.path === workspace.path;
    });
    knownWorkspaces[workspaceIndex].numBoards -= 1;
    if (removedBoardPath === boardData.path) {
      if (boardIndex >= workspace.boards.length) {
        if (workspace.boards.length > 0) {
          boardIndex = 0;
        } else {
          boardIndex = -1;
        }
      }
      this.setState({ workspace, knownWorkspaces, boardData: undefined });
    } else {
      boardIndex = -1;
    }
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
    this.setState({
      boardData,
      workspace,
      // eslint-disable-next-line react/no-unused-state
      ignoreRenameEvent: [oldBoardPath, newBoardPath]
    });
    this.menuRef.current.forceUpdate();
  }

  openDefaultBoard() {
    const { workspaceOnStartup, boardOnStartup } = this.state;
    this.loadWorkspace(workspaceOnStartup, true, boardOnStartup);
  }

  moveBoardToWorkspace(workspace) {
    const { boardData } = this.state;
    ipcRenderer.send(
      'board-move-to-workspace',
      boardData.name,
      boardData.path,
      workspace.path
    );
  }

  moveBoardToWorkspaceCallback(
    boardPath?,
    newBoardPath?,
    targetWorkspacePath?
  ) {
    const { boardData, workspace, knownWorkspaces, settings } = this.state;
    const { sortBy } = settings;
    if (newBoardPath == null) {
      AppToaster.show({
        message: `Cannot move notebook '${boardData.name}' to '${targetWorkspacePath}' because a file with that name already exists.`,
        intent: Intent.DANGER
      });
    } else {
      boardData.path = newBoardPath;
      workspace.numBoards -= 1;
      const boardIndex = workspace.boards.findIndex(board => {
        return board.path === boardPath;
      });
      workspace.boards.splice(boardIndex, 1);
      const workspaceIndex = knownWorkspaces.findIndex(w => {
        return w.path === targetWorkspacePath;
      });
      const targetWorkspace = knownWorkspaces[workspaceIndex];
      targetWorkspace.numBoards += 1;
      targetWorkspace.boards.push({
        path: newBoardPath,
        name: this.boardPathToName(newBoardPath)
      });
      targetWorkspace.boards.sort((a, b) => {
        return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
      });
      this.setState({ boardData, workspace: targetWorkspace });
      this.menuRef.current.forceUpdate();
    }
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
    if (spoolingCardIndex !== undefined) {
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
    const {
      sortBy,
      filterBy,
      notecardWidth,
      rememberLastNotebook,
      globalAppKeyEnabled
    } = settings;
    if (newSettings.sortBy !== sortBy) {
      sortBy.method = newSettings.sortBy.name;
      sortBy.asc = newSettings.sortBy.asc;
      sortBy.icon = newSettings.sortBy.icon;
      workspace.boards.sort((a, b) => {
        return SORTING_METHODS[sortBy.method](a, b, sortBy.asc);
      });
      CONFIG_STORE.set(CONFIG.SORTBY, sortBy);
    }
    if (newSettings.filterBy !== filterBy) {
      filterBy.name = newSettings.filterBy.name;
      filterBy.icon = newSettings.filterBy.icon;
      CONFIG_STORE.set(CONFIG.FILTERBY, filterBy);
    }
    if (newSettings.rememberLastNotebook !== rememberLastNotebook) {
      this.setRememberLastNotebook(newSettings.rememberLastNotebook);
      if (!newSettings.rememberLastNotebook) {
        // remove the last onstartup values
        CONFIG_STORE.delete(CONFIG.WORKSPACEONSTARTUP);
        CONFIG_STORE.delete(CONFIG.NOTEBOOKONSTARTUP);
      }
    }
    if (newSettings.globalAppKeyEnabled !== globalAppKeyEnabled) {
      settings.globalAppKeyEnabled = newSettings.globalAppKeyEnabled;
      CONFIG_STORE.set(
        CONFIG.GLOBALAPPKEYENABLED,
        settings.globalAppKeyEnabled
      );
      ipcRenderer.send('toggle-global-app-key', settings.globalAppKeyEnabled);
    }
    let updateBoard = false;
    if (newSettings.notecardWidth !== notecardWidth) {
      updateBoard = true;
      settings.notecardWidth = newSettings.notecardWidth;
      CONFIG_STORE.set(CONFIG.NOTECARDWIDTH, newSettings.notecardWidth);
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
    const { boardData } = this.state;
    md2html(this.getCurrentBoardMd())
      .then(htmlSource => {
        ipcRenderer.send('export-pdf', boardData.name, htmlSource);
        return 1;
      })
      .catch(error => {});
  }

  switchShowOnly() {
    const { showonly } = this.state;
    showonly.enabled = !showonly.enabled;
    this.setState({ showonly });
    this.boardRef.forceUpdate();
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
      if (boardData.path === spoolingBoardData.path) {
        // Update the same card in the notebook
        const editedCardIndex = boardData.cards[cardIndex].spooling.cardIndex;
        this.editCard(
          editedCardIndex,
          boardData.cards[cardIndex].spooling.boardData.cards[editedCardIndex]
            .doc
        );
        this.boardRef.forceUpdate();
      }
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
    const {
      knownWorkspaces,
      updateLastChecked,
      loreshelfDocsWorkspacePath
    } = this.state;
    const workspaces = [];
    knownWorkspaces.forEach(workspace => {
      if (workspace.path !== loreshelfDocsWorkspacePath) {
        workspaces.push(workspace.path);
      }
    });
    const workspaceOnStartup = CONFIG_STORE.get(CONFIG.WORKSPACEONSTARTUP);
    if (!workspaces.includes(workspaceOnStartup)) {
      CONFIG_STORE.delete(CONFIG.WORKSPACEONSTARTUP);
      CONFIG_STORE.delete(CONFIG.NOTEBOOKONSTARTUP);
    }
    CONFIG_STORE.set(CONFIG.WORKSPACES, workspaces);
    CONFIG_STORE.set(CONFIG.UPDATELASTCHECKED, updateLastChecked);
  }

  render() {
    const {
      appVersion,
      knownWorkspaces,
      workspace,
      boardData,
      settings,
      showPassword,
      loading,
      loreshelfDocsWorkspacePath,
      updateDownloading,
      newVersion,
      showonly
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

    const { menuRef, sidePanelRef } = this;
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
    const boardPath = boardData && boardData.path ? boardData.path : '';

    const unlockWorkspace = () => {
      const password = this.pwdInput.value;
      workspace.password = password;
      this.loadSecuredWorkspaceCallback(
        workspace.path,
        workspace.zipdata,
        true
      );
    };

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
            showonly={showonly}
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
            onSwitchShowOnly={this.switchShowOnly}
          />
        );
      } else if (
        workspace.zipdata &&
        (!workspace.password || workspace.wrongPassword)
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
              onKeyPress={e => {
                if (e.which === 13) {
                  // Enter
                  unlockWorkspace();
                }
              }}
              intent={workspace.wrongPassword ? Intent.DANGER : Intent.NONE}
              placeholder="Enter password..."
              inputRef={(pwdInput: HTMLInputElement) => {
                this.pwdInput = pwdInput;
              }}
            />
            <Button intent={Intent.PRIMARY} onClick={unlockWorkspace}>
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
              appVersion={appVersion}
              boardData={boardData}
              boardStatus={boardStatus}
              knownWorkspaces={knownWorkspaces}
              workspace={workspace}
              settings={settings}
              updateDownloading={updateDownloading}
              newVersion={newVersion}
              onSelectBoard={this.selectBoard}
              onDeleteBoard={this.deleteBoard}
              onMoveCardToBoard={this.moveCardToBoard}
              onCloseWorkspace={workspacePath => {
                ipcRenderer.send('workspace-close', workspacePath);
              }}
              onSwitchWorkspace={this.switchWorkspace}
              onSetBoardOnStartup={() => {
                this.setBoardOnStartup();
                this.setRememberLastNotebook(false);
              }}
              onSettingsChange={this.changeSettings}
              onNewCard={this.newCard}
              onNewSecuredWorkspace={this.newSecuredWorkspace}
              onExportToPDF={this.exportToPDF}
              onNewBoard={this.newBoard}
              onDuplicateBoard={this.duplicateBoard}
              onRenameBoard={this.renameBoard}
              onMoveBoardToWorkspace={this.moveBoardToWorkspace}
              onOpenDocs={() => {
                this.loadWorkspace(loreshelfDocsWorkspacePath, true);
              }}
            />,
            mainContent,
            <SidePanel
              key="sidePanel"
              ref={sidePanelRef}
              workspace={workspace}
              knownWorkspaces={knownWorkspaces}
              boardPath={boardPath}
              showonly={showonly}
              openBoard={this.loadBoardWithPath}
              onSwitchShowOnly={this.switchShowOnly}
            />,
            <StatusBar key="statusBar" />
          ]
        ) : (
          <NonIdealState>
            <ButtonGroup vertical>
              <img
                src={brandIcon}
                alt="Logo"
                style={{ width: '150px', margin: '0 auto' }}
              />
              <div
                style={{
                  margin: '20px',
                  marginBottom: '5px',
                  fontSize: '25px',
                  userSelect: 'none'
                }}
              >
                Welcome to Loreshelf
              </div>
              <div
                style={{
                  margin: '5px',
                  marginBottom: '15px',
                  userSelect: 'none'
                }}
              >
                {`Version ${appVersion}`}
              </div>
              <ButtonGroup vertical style={{ margin: '0 auto' }}>
                <Button
                  intent={Intent.PRIMARY}
                  style={{ margin: '5px', width: '150px' }}
                  onClick={() => {
                    this.loadWorkspace(loreshelfDocsWorkspacePath, false);
                    ipcRenderer.send('get-started');
                  }}
                >
                  Get started tutorial
                </Button>
                <Button
                  style={{ margin: '5px', width: '150px' }}
                  onClick={() => {
                    this.loadWorkspace(loreshelfDocsWorkspacePath, false);
                    ipcRenderer.send('workspace-add');
                  }}
                >
                  Open workspace
                </Button>
              </ButtonGroup>
              <div
                style={{ margin: '20px', fontSize: '12px', userSelect: 'none' }}
              >
                Made by Ivo Bek
              </div>
            </ButtonGroup>
          </NonIdealState>
        )}
      </div>
    );
  }
}

export default Home;
