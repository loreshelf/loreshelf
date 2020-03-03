import React, { Component } from 'react';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import { Classes } from '@blueprintjs/core';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';

class Home extends Component {
  constructor() {
    super();

    const menuItems = [];
    const selectedWorkspace = undefined;
    const selectedBoard = undefined;
    const saveTimer = undefined;
    const workspaces = [];
    const boards = {}; // key: boardName, value: {items:[], path:string, modified: string}

    this.state = {
      workspaces,
      selectedWorkspace,
      selectedBoard,
      boards,
      menuItems,
      saveTimer
    };
    this.addNewItem = this.addNewItem.bind(this);
    this.handleEditCard = this.handleEditCard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
    this.changeWorkspace = this.changeWorkspace.bind(this);
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
    this.loadDirectory('/home/ibek/Boards');
    setTimeout(() => {
      this.loadDirectory('/home/ibek/Temp');
    }, 1000);
  }

  getCurrentBoardMd() {
    const { boards, selectedBoard } = this.state;
    const items = boards[selectedBoard].items.map(i => i.trim());
    return items.join('\n\n');
  }

  getWorkspaceFromPath(path) {
    const { workspaces } = this.state;
    for (let i = 0; i < workspaces.length; i += 1) {
      if (workspaces[i].path === path) {
        return workspaces[i];
      }
    }
    return undefined;
  }

  loadDirectory(directory) {
    const { workspaces } = this.state;
    this.setState({
      boards: {},
      menuItems: [],
      selectedBoard: undefined
    });
    let selectedWorkspace;
    const existingWorkspace = this.getWorkspaceFromPath(directory);
    if (existingWorkspace) {
      selectedWorkspace = existingWorkspace.name;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    fs.readdir(directory, (err, files) => {
      let firstBoardName;
      let numBoards = 0;
      files.forEach(file => {
        if (file.endsWith('.md')) {
          const boardName = self.loadBoard(`${directory}/${file}`);
          if (!firstBoardName) {
            firstBoardName = boardName;
          }
          numBoards += 1;
        }
      });
      if (!selectedWorkspace) {
        const name = directory.substring(directory.lastIndexOf('/') + 1);
        const newWorkspace = { name, path: directory, numBoards };
        workspaces.push(newWorkspace);
        selectedWorkspace = newWorkspace.name;
      } else {
        existingWorkspace.numBoards = numBoards;
      }
      self.setState({
        workspaces,
        selectedWorkspace
      });
      if (firstBoardName) {
        self.selectBoard(firstBoardName);
      }
    });
  }

  loadBoard(board) {
    const text = fs.readFileSync(board, 'utf8');
    // Workaround: single # is not working in the editor properly right now, try with newer version of ckeditor5-markdown-gfm when available
    const items = text.trim().split(/^(?=## )/gm);
    const { menuItems, boards } = this.state;
    const boardName = board.substring(
      board.lastIndexOf('/') + 1,
      board.length - 3
    );
    menuItems.push(boardName);
    const stats = fs.statSync(board);
    const modified = this.timeSince(stats.mtime);
    boards[boardName] = { path: board, items, modified };
    this.setState({
      menuItems,
      boards
    });
    return boardName;
  }

  // eslint-disable-next-line class-methods-use-this
  timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
      return `${interval} years ago`;
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
      return `${interval} months ago`;
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
      return `${interval} days ago`;
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
      return `${interval} hours ago`;
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
      return `${interval} minutes ago`;
    }
    return `${Math.floor(seconds)} seconds ago`;
  }

  selectBoard(boardName) {
    const { saveTimer } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    this.setState({
      selectedBoard: boardName
    });
  }

  changeWorkspace(workspace) {
    this.loadDirectory(workspace.path);
  }

  saveBoard() {
    const { boards, selectedBoard, saveTimer } = this.state;
    if (saveTimer) {
      const { path } = boards[selectedBoard];
      fs.writeFileSync(path, this.getCurrentBoardMd(), 'utf8');
      boards[selectedBoard].modified = 'All changes saved';
      this.setState({ boards, saveTimer: undefined });
    }
  }

  addNewItem() {
    const { boards, selectedBoard } = this.state;
    const { items } = boards[selectedBoard];
    items.push('\n\n## Edit Title...\n\n');
    this.setState({ boards });
    this.editItem(items.length - 1, items[items.length - 1]);
  }

  handleEditCard(cardId, newContent) {
    const { boards, selectedBoard } = this.state;
    boards[selectedBoard].items[cardId] = newContent;
    this.autoSave();
    this.setState({ boards });
  }

  autoSave() {
    const { boards, selectedBoard } = this.state;
    let { saveTimer } = this.state;
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    const sb = boards[selectedBoard];
    sb.modified = 'Saving...';
    saveTimer = setTimeout(() => {
      this.saveBoard(); // save board 3s after the last change
    }, 3000);
    this.setState({ boards, saveTimer });
  }

  render() {
    const {
      menuItems,
      workspaces,
      selectedWorkspace,
      boards,
      selectedBoard
    } = this.state;
    let items = [];
    let boardModified;
    if (selectedBoard) {
      const sb = boards[selectedBoard];
      items = sb.items;
      boardModified = sb.modified;
    }
    return (
      <div
        className={`${styles.container} ${Classes.DARK}`}
        data-tid="container"
      >
        <Menu
          menuItems={menuItems}
          onClick={this.selectBoard}
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          selectedBoard={selectedBoard}
          boardModified={boardModified}
          onNewWorkspace={() => ipcRenderer.send('workspace-new')}
          onWorkspaceChanged={this.changeWorkspace}
        />
        <div
          style={{
            marginLeft: '160px',
            position: 'absolute',
            left: '0px',
            top: '30px',
            width: 'calc(100% - 170px)',
            height: 'calc(100% - 30px)'
          }}
        >
          <OverlayScrollbarsComponent
            className="os-theme-light"
            style={{ maxHeight: '100%' }}
          >
            <Board
              items={items}
              onChange={this.handleEditCard}
              addNewItem={this.addNewItem}
            />
          </OverlayScrollbarsComponent>
        </div>
      </div>
    );
  }
}

export default Home;
