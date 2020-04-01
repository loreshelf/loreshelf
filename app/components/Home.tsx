import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { Classes, NonIdealState, Button, Intent } from '@blueprintjs/core';
import Store from 'electron-store';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';
import { timeSince } from '../utils/CoreFunctions';
import { parseMarkdown, serializeMarkdown } from './Markdown';

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
  }
};

// workspaces=[path1, path2], homeWorkspace, homeBoard
const CONFIG_STORE = new Store(CONFIG_SCHEMA);

enum CONFIG {
  WORKSPACES = 'workspaces',
  HOMEWORKSPACE = 'homeWorkspace',
  HOMEBOARD = 'homeBoard'
}

class Home extends Component {
  constructor() {
    super();

    const workspace = undefined; // {selectedBoard:0, name, path, numBoards, boards:[{name1, path1}, {name2, path2}] }}
    const boardData = undefined; // {cards = [{doc, title, spooling={ boardPath, cardTitle }}], path, name, status}
    const knownWorkspaces = []; // [workspace1, workspace2]

    const homeBoard = undefined; // = boardPath

    const saveTimer = undefined;
    const spoolingTimer = undefined;

    this.menuRef = React.createRef();
    this.boardRef = React.createRef();

    this.state = {
      workspace,
      boardData,
      saveTimer,
      spoolingTimer,
      knownWorkspaces,
      homeBoard
    };
    this.newCard = this.newCard.bind(this);
    this.editTitle = this.editTitle.bind(this);
    this.editCard = this.editCard.bind(this);
    this.removeCard = this.removeCard.bind(this);
    this.reorderCards = this.reorderCards.bind(this);
    this.newBoard = this.newBoard.bind(this);
    this.duplicateBoard = this.duplicateBoard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
    this.selectBoardWithPath = this.selectBoardWithPath.bind(this);
    this.deleteBoard = this.deleteBoard.bind(this);
    this.renameBoard = this.renameBoard.bind(this);
    this.openHomeBoard = this.openHomeBoard.bind(this);
    this.setHome = this.setHome.bind(this);
    this.moveCardToBoard = this.moveCardToBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
    this.closeWorkspace = this.closeWorkspace.bind(this);
    this.boardPathToName = this.boardPathToName.bind(this);
    this.requestBoardsAsync = this.requestBoardsAsync.bind(this);
    this.stopSpooling = this.stopSpooling.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    ipcRenderer.on('workspace-add-callback', (event, workspacePath, files) => {
      self.addWorkspaceCallback(workspacePath, files);
    });

    ipcRenderer.on(
      'workspace-load-callback',
      (event, workspacePath, files, shouldSetWorkspace, openBoardPath) => {
        self.loadWorkspaceCallback(
          workspacePath,
          files,
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

    ipcRenderer.on('board-new-callback', newBoardPath => {
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
        }
      }
      if (e.code === 'Insert') {
        e.preventDefault();
        this.newCard();
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
  }

  getCurrentBoardMd(data?) {
    const { boardData } = this.state;
    const bd = data || boardData;
    const cards = bd.cards.map(
      c => `# ${c.title}\n\n${serializeMarkdown(c.doc).trim()}`
    );
    return cards.join('\n\n');
  }

  setHome() {
    const { boardData, workspace } = this.state;
    CONFIG_STORE.set(CONFIG.HOMEBOARD, boardData.path);
    CONFIG_STORE.set(CONFIG.HOMEWORKSPACE, workspace.path);
    this.setState({ homeBoard: boardData.path, homeWorkspace: workspace.path });
  }

  updateWorkspace(workspacePath, knownWorkspaces, files) {
    let numBoards = 0;
    const boards = [];
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const boardPath = `${workspacePath}/${file}`;
        boards.push({
          path: boardPath,
          name: this.boardPathToName(boardPath)
        });
        numBoards += 1;
      }
    });
    let workspace = knownWorkspaces.find(w => {
      return workspacePath === w.path;
    });
    if (!workspace) {
      const name = workspacePath.substring(workspacePath.lastIndexOf('/') + 1);
      workspace = { selectedBoard: -1, name, path: workspacePath };
      knownWorkspaces.push(workspace);
    }
    workspace.numBoards = numBoards;
    boards.sort((a, b) => {
      const aname = a.name.toUpperCase();
      const bname = b.name.toUpperCase();
      if (aname < bname) {
        return -1;
      }
      if (aname > bname) {
        return 1;
      }
      return 0;
    });
    workspace.boards = boards;
    return workspace;
  }

  // eslint-disable-next-line class-methods-use-this
  loadWorkspace(workspacePath, shouldSetWorkspace, openBoardPath?) {
    ipcRenderer.send(
      'workspace-load',
      workspacePath,
      shouldSetWorkspace,
      openBoardPath
    );
  }

  loadWorkspaceCallback(
    workspacePath,
    files,
    shouldSetWorkspace,
    openBoardPath?
  ) {
    const { knownWorkspaces } = this.state;
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files
    );
    if (shouldSetWorkspace) {
      this.setState({
        knownWorkspaces,
        workspace
      });
      if (workspace.numBoards > 0) {
        if (!openBoardPath) {
          this.selectBoard(0);
        } else {
          this.selectBoardWithPath(openBoardPath);
        }
      }
    } else {
      this.setState({
        knownWorkspaces
      });
    }
  }

  addWorkspaceCallback(workspacePath, files) {
    const { knownWorkspaces } = this.state;
    this.setState({
      boardData: undefined
    });
    const workspace = this.updateWorkspace(
      workspacePath,
      knownWorkspaces,
      files
    );
    this.setState({
      knownWorkspaces,
      workspace
    });
    this.storeConfiguration();
    if (workspace.numBoards > 0) {
      this.selectBoard(0);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  boardPathToName(boardPath) {
    return boardPath.substring(
      boardPath.lastIndexOf('/') + 1,
      boardPath.length - 3
    );
  }

  // eslint-disable-next-line class-methods-use-this
  toBoardData(boardMeta, text, stats) {
    const mdCards = text.split(/^(?=# )/gm);
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
        cards.push({ title, doc: parseMarkdown(src) });
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
    this.setState({
      boardData
    });
  }

  loadBoard(boardMetaIndex) {
    const { workspace } = this.state;
    workspace.selectedBoard = boardMetaIndex;
    const boardMeta = workspace.boards[boardMetaIndex];
    ipcRenderer.send('board-read', boardMeta);
  }

  newBoard(newBoardName, content?) {
    const { workspace } = this.state;
    // save board for unsaved changes
    this.autoSave(true);
    const newBoardPath = `${workspace.path}/${newBoardName}`;
    let addContent = content;
    if (!addContent) {
      addContent = '';
    }
    ipcRenderer.send('board-save', newBoardPath, addContent);
  }

  newBoardCallback(newBoardPath) {
    const { workspace } = this.state;
    // This part might not be need when I add workspace watching..
    workspace.numBoards += 1;
    workspace.boards.push({
      path: newBoardPath,
      name: this.boardPathToName(newBoardPath)
    });
    workspace.boards.sort((a, b) => {
      const aname = a.name.toUpperCase();
      const bname = b.name.toUpperCase();
      if (aname < bname) {
        return -1;
      }
      if (aname > bname) {
        return 1;
      }
      return 0;
    });
    const newBoardMetaIndex = workspace.boards.findIndex(board => {
      return board.path === newBoardPath;
    });
    this.setState({ workspace });
    this.selectBoard(newBoardMetaIndex);
  }

  duplicateBoard(newBoardName) {
    this.autoSave(true);
    this.newBoard(newBoardName, this.getCurrentBoardMd());
  }

  selectBoard(boardMetaIndex) {
    // save board for unsaved changes
    this.autoSave(true);
    this.loadBoard(boardMetaIndex);
  }

  selectBoardWithPath(boardPath) {
    const { workspace } = this.state;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === boardPath;
    });
    if (boardIndex >= 0) {
      this.selectBoard(boardIndex);
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
  }

  // eslint-disable-next-line class-methods-use-this
  saveBoardCallback() {
    const { boardData } = this.state;
    // eslint-disable-next-line no-param-reassign
    boardData.status = 'All changes saved';
    this.setState({ boardData });
  }

  saveBoard(backgroundBoardData?) {
    const { boardData, saveTimer } = this.state;
    let data = boardData;
    if (backgroundBoardData) {
      data = backgroundBoardData;
    }
    if (saveTimer || backgroundBoardData) {
      const boardPath = data.path;
      const boardContent = this.getCurrentBoardMd(data);
      ipcRenderer.send(
        'board-save',
        boardPath,
        boardContent,
        false,
        backgroundBoardData !== undefined
      );
      this.setState({ saveTimer: undefined });
    }
  }

  newCard() {
    const { boardData } = this.state;
    if (boardData) {
      const { cards } = boardData;
      const doc = parseMarkdown('');
      cards.push({ doc, title: 'Edit Title...' });
      this.autoSave();
      this.setState({ boardData });

      // This part very much depends on Board component structure!
      setTimeout(() => {
        this.boardRef.boardRef.current.scrollTop = this.boardRef.boardRef.current.scrollHeight;
        const n = this.boardRef.boardRef.current.childNodes;
        const title =
          n[n.length - 2].firstChild.firstChild.lastChild.firstElementChild;
        title.focus();
        title.select();
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
    this.setState({ boardData });
    this.autoSave();
  }

  moveCardToBoard(cardIndex, boardId) {
    const { workspace, boardData } = this.state;
    const card = boardData.cards[cardIndex];
    boardData.cards.splice(cardIndex, 1);
    const boardMeta = workspace.boards[boardId];
    this.setState({ boardData });
    this.autoSave();

    const cardContent = serializeMarkdown(card.doc);
    const boardPath = boardMeta.path;
    ipcRenderer.send('board-move-card', boardPath, card.title, cardContent);
  }

  editTitle(cardId, newTitle) {
    const { boardData } = this.state;
    boardData.cards[cardId].title = newTitle;
    this.autoSave();
    this.setState({ boardData });
  }

  editCard(cardId, doc) {
    const { boardData } = this.state;
    const card = boardData.cards[cardId];
    const { spooling } = card;
    if (spooling) {
      const spoolingBoardData = spooling.boardData;
      spoolingBoardData.cards[spooling.cardIndex].doc = doc;
      this.autoSaveSpooling(cardId);
    } else {
      card.doc = doc;
      this.autoSave();
    }
    this.setState({ boardData });
  }

  removeCard(cardId) {
    const { boardData } = this.state;
    boardData.cards.splice(cardId, 1);
    this.autoSave();
    this.setState({ boardData });
  }

  deleteBoard() {
    const { boardData } = this.state;
    const { path } = boardData;
    if (boardData) {
      const { saveTimer } = this.state;
      if (saveTimer) {
        clearTimeout(saveTimer);
        this.setState({ saveTimer: undefined });
      }
      ipcRenderer.send('board-delete', path);
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
      this.selectBoard(boardIndex);
    }
  }

  renameBoard(newBoardName) {
    const { boardData, workspace } = this.state;
    const oldBoardPath = boardData.path;
    const newBoardPath = `${workspace.path}/${newBoardName}`;
    ipcRenderer.send('board-rename', oldBoardPath, newBoardPath);
  }

  renameBoardCallback(oldBoardPath, newBoardPath) {
    const { boardData, workspace } = this.state;
    const boardName = this.boardPathToName(newBoardPath);
    boardData.path = newBoardPath;
    boardData.name = boardName;
    const boardIndex = workspace.boards.findIndex(board => {
      return board.path === oldBoardPath;
    });
    const boardMeta = workspace.boards[boardIndex];
    boardMeta.path = newBoardPath;
    boardMeta.name = boardName;
    workspace.boards.sort((a, b) => {
      const aname = a.name.toUpperCase();
      const bname = b.name.toUpperCase();
      if (aname < bname) {
        return -1;
      }
      if (aname > bname) {
        return 1;
      }
      return 0;
    });
    this.setState({ boardData, workspace });
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
      if (spoolingCardIndex >= 0) {
        const { boardData } = this.state;
        boardData.cards[spoolingCardIndex].spooling = {
          boardData: spoolingBoardData,
          cardIndex
        };
        this.setState({ boardData });
      }
    } else {
      // Pass spooling board to the editor
      ipcRenderer.send('board-spooling-data-callback', spoolingBoardData);
    }
  }

  requestBoardsAsync(filter?) {
    return new Promise((resolve, reject) => {
      // get boards from the current workspace
      if (!filter) {
        const { workspace } = this.state;
        resolve(workspace.boards);
      }
    });
  }

  stopSpooling(spoolingCardIndex) {
    const { boardData } = this.state;
    this.autoSaveSpooling(spoolingCardIndex, true);
    boardData.cards[spoolingCardIndex].spooling = undefined;
    this.setState({ boardData });
  }

  autoSave(immediatelyWhenNeeded?) {
    const { boardData } = this.state;
    let { saveTimer } = this.state;
    const shouldSave = immediatelyWhenNeeded && saveTimer;
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
    }
    this.setState({ boardData, saveTimer });
  }

  autoSaveSpooling(spoolingCardIndex, immediatelyWhenNeeded?) {
    const { boardData } = this.state;
    let { spoolingTimer } = this.state;
    const shouldSave = immediatelyWhenNeeded && spoolingTimer;
    if (spoolingTimer) {
      clearTimeout(spoolingTimer);
    }
    const spoolingBoardData =
      boardData.cards[spoolingCardIndex].spooling.boardData;
    if (shouldSave) {
      this.saveBoard(spoolingBoardData);
      spoolingBoardData.status = 'All changes saved';
    } else if (!immediatelyWhenNeeded) {
      spoolingBoardData.status = 'Saving...';
      spoolingTimer = setTimeout(() => {
        this.saveBoard(spoolingBoardData);
        spoolingBoardData.status = 'All changes saved';
        boardData.cards[
          spoolingCardIndex
        ].spooling.boardData = spoolingBoardData;
        this.setState({ boardData });
      }, 1000);
    }
    this.setState({ boardData, spoolingTimer });
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
    const { knownWorkspaces, workspace, boardData, homeBoard } = this.state;
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
        Create Spool
      </Button>
    );
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
              knownWorkspaces={knownWorkspaces}
              workspace={workspace}
              boardData={boardData}
              homeBoard={homeBoard}
              onNewBoard={this.newBoard}
              onDuplicateBoard={this.duplicateBoard}
              onSelectBoard={this.selectBoard}
              onDeleteBoard={this.deleteBoard}
              onRenameBoard={this.renameBoard}
              onMoveCardToBoard={this.moveCardToBoard}
              onAddWorkspace={() => ipcRenderer.send('workspace-add')}
              onCloseWorkspace={this.closeWorkspace}
              onSwitchWorkspace={this.switchWorkspace}
              onOpenHomeBoard={this.openHomeBoard}
              onSetHome={this.setHome}
            />,
            boardData ? (
              <Board
                key="board"
                // eslint-disable-next-line no-return-assign
                ref={el => {
                  this.boardRef = el;
                }}
                boardData={boardData}
                onEditTitle={this.editTitle}
                onEditCard={this.editCard}
                onNewCard={this.newCard}
                onReorderCards={this.reorderCards}
                onRemoveCard={this.removeCard}
                onRequestBoardsAsync={this.requestBoardsAsync}
                onStopSpooling={this.stopSpooling}
              />
            ) : (
              <NonIdealState
                key="empty-workspace"
                icon="grid-view"
                title="Empty Workspace"
                description="Start with creating a new spool, the place where you will capture and analyze related information. For example 'Accounts', 'Insurances', 'Investments' in 'Finance' workspace. Every spool will be stored as a standalone .md Markdown file in the current workspace."
                action={CreateBoard}
              />
            )
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
