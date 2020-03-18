import React, { Component } from 'react';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import { Classes, NonIdealState, Button, Intent } from '@blueprintjs/core';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';
import { timeSince } from '../utils/CoreFunctions';
import { parseMarkdown, serializeMarkdown } from './Markdown';

class Home extends Component {
  constructor() {
    super();

    const workspace = undefined; // {selectedBoard:0, name, path, numBoards, boards:[{name1, path1}, {name2, path2}] }}
    const boardData = undefined; // {items, titles, path, name, status}
    const saveTimer = undefined;
    const knownWorkspaces = []; // [{selectedBoard: -1, name, path: directory }]

    this.menuRef = React.createRef();

    this.state = {
      workspace,
      boardData,
      saveTimer,
      knownWorkspaces
    };
    this.newCard = this.newCard.bind(this);
    this.editTitle = this.editTitle.bind(this);
    this.editCard = this.editCard.bind(this);
    this.removeCard = this.removeCard.bind(this);
    this.newBoard = this.newBoard.bind(this);
    this.duplicateBoard = this.duplicateBoard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
    this.deleteBoard = this.deleteBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
    this.closeWorkspace = this.closeWorkspace.bind(this);
    this.boardPathToName = this.boardPathToName.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    ipcRenderer.on('board-load', (event, boardPath) => {
      self.loadBoard(boardPath);
    });
    ipcRenderer.on('board-save', () => {
      self.saveBoard();
    });
    ipcRenderer.on('workspace-load', (event, workspacePath) => {
      self.loadDirectory(workspacePath);
    });
    // this.loadDirectory('/home/ibek/Temp');
    // this.loadDirectory('/home/ibek/Boards');
    /** setTimeout(() => {
      this.loadDirectory('/home/ibek/Temp');
    }, 1000); */
  }

  getCurrentBoardMd() {
    const { boardData } = this.state;
    const items = boardData.items.map(
      (i, k) => `# ${boardData.titles[k]}\n\n${serializeMarkdown(i).trim()}`
    );
    return items.join('\n\n');
  }

  loadDirectory(directory) {
    const { knownWorkspaces } = this.state;
    this.setState({
      boardData: undefined
    });
    let workspace = knownWorkspaces.find(w => {
      return directory === w.path;
    });
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    fs.readdir(directory, (err, files) => {
      let numBoards = 0;
      const boards = [];
      files.forEach(file => {
        if (file.endsWith('.md')) {
          const boardPath = `${directory}/${file}`;
          boards.push({
            path: boardPath,
            name: self.boardPathToName(boardPath)
          });
          numBoards += 1;
        }
      });
      if (!workspace) {
        const name = directory.substring(directory.lastIndexOf('/') + 1);
        workspace = { selectedBoard: -1, name, path: directory };
        knownWorkspaces.push(workspace);
      }
      workspace.numBoards = numBoards;
      workspace.boards = boards;
      this.setState({
        knownWorkspaces,
        workspace
      });
      if (numBoards > 0) {
        this.selectBoard(0);
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  boardPathToName(boardPath) {
    return boardPath.substring(
      boardPath.lastIndexOf('/') + 1,
      boardPath.length - 3
    );
  }

  loadBoard(boardMetaIndex) {
    const { workspace } = this.state;
    workspace.selectedBoard = boardMetaIndex;
    const boardMeta = workspace.boards[boardMetaIndex];
    const text = fs.readFileSync(boardMeta.path, 'utf8');
    const mdItems = text.split(/^(?=# )/gm);
    const items = [];
    const titles = [];
    mdItems.forEach(md => {
      let title = md.match(/# (.*)\n/);
      if (title) {
        // eslint-disable-next-line prefer-destructuring
        title = title[1];
        titles.push(title);
        let src = '';
        const notEmpty = md.indexOf('\n\n');
        if (notEmpty) {
          src = md.substring(notEmpty + 2);
        }
        items.push(parseMarkdown(src));
      }
    });
    const stats = fs.statSync(boardMeta.path);
    const status = timeSince(stats.mtime);
    const boardData = {
      path: boardMeta.path,
      items,
      titles,
      status,
      name: boardMeta.name
    };
    this.setState({
      boardData,
      workspace
    });
  }

  newBoard(newBoardName, content?) {
    const { saveTimer, workspace } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    const newBoardPath = `${workspace.path}/${newBoardName}`;
    let addContent = content;
    if (!addContent) {
      addContent = '';
    }
    fs.writeFileSync(newBoardPath, addContent);
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
    const { saveTimer } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    this.newBoard(newBoardName, this.getCurrentBoardMd());
  }

  selectBoard(boardMetaIndex) {
    const { saveTimer } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    this.loadBoard(boardMetaIndex);
  }

  switchWorkspace(workspace) {
    this.loadDirectory(workspace.path);
  }

  closeWorkspace() {
    const { saveTimer, knownWorkspaces, workspace } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    const workspaceIndex = knownWorkspaces.findIndex(w => {
      return w.path === workspace.path;
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
    this.switchWorkspace(knownWorkspaces[newWorkspaceIndex]);
  }

  saveBoard() {
    const { boardData, saveTimer } = this.state;
    if (saveTimer) {
      const { path } = boardData;
      fs.writeFileSync(path, this.getCurrentBoardMd(), 'utf8');
      boardData.status = 'All changes saved';
      this.setState({ boardData, saveTimer: undefined });
    }
  }

  newCard() {
    const { boardData } = this.state;
    const { items, titles } = boardData;
    const doc = parseMarkdown('');
    items.push(doc);
    titles.push('Edit Title...');
    this.autoSave();
    this.setState({ boardData });
  }

  editTitle(cardId, newTitle) {
    const { boardData } = this.state;
    boardData.titles[cardId] = newTitle;
    this.autoSave();
    this.setState({ boardData });
  }

  editCard(cardId, doc) {
    const { boardData } = this.state;
    boardData.items[cardId] = doc;
    this.autoSave();
    this.setState({ boardData });
  }

  removeCard(cardId) {
    const { boardData } = this.state;
    boardData.items.splice(cardId, 1);
    boardData.titles.splice(cardId, 1);
    this.autoSave();
    this.setState({ boardData });
  }

  deleteBoard() {
    const { boardData, workspace, knownWorkspaces } = this.state;
    const { path } = boardData;
    if (boardData) {
      const { saveTimer } = this.state;
      if (saveTimer) {
        clearTimeout(saveTimer);
        this.setState({ saveTimer: undefined });
      }
      let boardIndex = workspace.boards.findIndex(board => {
        return board.path === boardData.path;
      });
      workspace.boards.splice(boardIndex, 1);
      const workspaceIndex = knownWorkspaces.findIndex(w => {
        return w.path === workspace.path;
      });
      knownWorkspaces[workspaceIndex].numBoards -= 1;
      fs.unlinkSync(path);
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
  }

  autoSave() {
    const { boardData } = this.state;
    let { saveTimer } = this.state;
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    boardData.status = 'Saving...';
    saveTimer = setTimeout(() => {
      this.saveBoard(); // save board 3s after the last change
    }, 3000);
    this.setState({ boardData, saveTimer });
  }

  render() {
    const { knownWorkspaces, workspace, boardData } = this.state;
    const OpenWorkspace = (
      <Button
        intent={Intent.PRIMARY}
        onClick={() => ipcRenderer.send('workspace-new')}
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
        Create Board
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
              onNewBoard={this.newBoard}
              onDuplicateBoard={this.duplicateBoard}
              onSelectBoard={this.selectBoard}
              onDeleteBoard={this.deleteBoard}
              onLoadWorkspace={() => ipcRenderer.send('workspace-new')}
              onCloseWorkspace={this.closeWorkspace}
              onSwitchWorkspace={this.switchWorkspace}
            />,
            boardData ? (
              <>
                <OverlayScrollbarsComponent
                  className="os-theme-light"
                  style={{ width: 'auto' }}
                >
                  <Board
                    boardData={boardData}
                    onEditTitle={this.editTitle}
                    onEditCard={this.editCard}
                    onNewCard={this.newCard}
                    onRemoveCard={this.removeCard}
                  />
                </OverlayScrollbarsComponent>
              </>
            ) : (
              <NonIdealState
                key="empty-workspace"
                icon="grid-view"
                title="Empty Workspace"
                description="Start with creating a new board as a .md Markdown file."
                action={CreateBoard}
              />
            )
          ]
        ) : (
          <NonIdealState
            icon="folder-open"
            title="No Workspace"
            description="Start with opening a folder as your first workspace. The workspace will be used to store boards as .md Markdown files."
            action={OpenWorkspace}
          />
        )}
      </div>
    );
  }
}

export default Home;
