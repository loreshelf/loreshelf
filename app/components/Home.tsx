import React, { Component } from 'react';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import { Classes } from '@blueprintjs/core';
import {
  MarkdownParser,
  defaultMarkdownSerializer
} from 'prosemirror-markdown';
import markdownit from 'markdown-it';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Menu from './Menu';
import Board from './Board';
import { schema } from '../editor/schema';

function timeSince(date) {
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

const markdownParser = new MarkdownParser(
  schema,
  markdownit('commonmark', { html: false }),
  {
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    list_item: { block: 'list_item' },
    bullet_list: { block: 'bullet_list' },
    ordered_list: {
      block: 'ordered_list',
      getAttrs: tok => ({ order: +tok.attrGet('start') || 1 })
    },
    heading: {
      block: 'heading',
      getAttrs: tok => ({ level: +tok.tag.slice(1) })
    },
    code_block: { block: 'code_block' },
    fence: {
      block: 'code_block',
      getAttrs: tok => ({ params: tok.info || '' })
    },
    hr: { node: 'horizontal_rule' },
    image: {
      node: 'image',
      getAttrs: tok => ({
        src: tok.attrGet('src'),
        title: tok.attrGet('title') || null,
        alt: (tok.children[0] && tok.children[0].content) || null
      })
    },
    hardbreak: { node: 'hard_break' },

    em: { mark: 'em' },
    strong: { mark: 'strong' },
    link: {
      mark: 'link',
      getAttrs: tok => ({
        href: tok.attrGet('href'),
        title: tok.attrGet('title') || null
      })
    },
    code_inline: { mark: 'code' }
  }
);

function parseMarkdown(markdownContent) {
  return markdownParser.parse(markdownContent);
}

class Home extends Component {
  constructor() {
    super();

    const workspace = undefined; // {selectedBoard:0, name, path, numBoards, boards:[{name1, path1}, {name2, path2}] }}
    const boardData = undefined; // {items, path, name, status}
    const saveTimer = undefined;
    const knownWorkspaces = []; // [{name, path, numBoards, boards:[path1, path2] }]

    this.state = {
      workspace,
      boardData,
      saveTimer,
      knownWorkspaces
    };
    this.addNewItem = this.addNewItem.bind(this);
    this.handleEditCard = this.handleEditCard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
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
    this.loadDirectory('/home/ibek/Temp');
    // this.loadDirectory('/home/ibek/Boards');
    /** setTimeout(() => {
      this.loadDirectory('/home/ibek/Temp');
    }, 1000); */
  }

  getCurrentBoardMd() {
    const { boardData } = this.state;
    const items = boardData.items.map(i =>
      defaultMarkdownSerializer.serialize(i).trim()
    );
    return items.join('\n\n');
  }

  getWorkspaceFromPath(path) {
    const { knownWorkspaces } = this.state;
    for (let i = 0; i < knownWorkspaces.length; i += 1) {
      if (knownWorkspaces[i].path === path) {
        return knownWorkspaces[i];
      }
    }
    return undefined;
  }

  loadDirectory(directory) {
    const { knownWorkspaces } = this.state;
    this.setState({
      boardData: undefined
    });
    let workspace = this.getWorkspaceFromPath(directory);
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
      if (numBoards > 0) {
        workspace.selectedBoard = 0;
        self.selectBoard(boards[0]);
      }
      self.setState({
        knownWorkspaces,
        workspace
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  boardPathToName(boardPath) {
    return boardPath.substring(
      boardPath.lastIndexOf('/') + 1,
      boardPath.length - 3
    );
  }

  loadBoard(boardMeta) {
    const text = fs.readFileSync(boardMeta.path, 'utf8');
    const mdItems = text.trim().split(/^(?=# )/gm);
    const items = [];
    mdItems.forEach(md => {
      items.push(parseMarkdown(md));
    });
    const stats = fs.statSync(boardMeta.path);
    const status = timeSince(stats.mtime);
    const boardData = {
      path: boardMeta.path,
      items,
      status,
      name: boardMeta.name
    };
    console.log(boardData);
    this.setState({
      boardData
    });
  }

  selectBoard(boardMeta) {
    const { saveTimer } = this.state;
    if (saveTimer) {
      // save board for unsaved changes
      this.saveBoard();
    }
    this.loadBoard(boardMeta);
  }

  switchWorkspace(workspace) {
    this.loadDirectory(workspace.path);
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

  addNewItem() {
    const { boardData } = this.state;
    const { items } = boardData;
    const doc = parseMarkdown('\n\n# Edit Title...\n\n');
    items.push(doc);
    this.setState({ boardData });
    // this.editItem(items.length - 1, items[items.length - 1]);
  }

  handleEditCard(cardId, doc) {
    const { boardData } = this.state;
    boardData.items[cardId] = doc;
    this.autoSave();
    this.setState({ boardData });
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
    return (
      <div
        className={`${styles.container} ${Classes.DARK}`}
        data-tid="container"
      >
        <Menu
          knownWorkspaces={knownWorkspaces}
          workspace={workspace}
          boardData={boardData}
          onSelectBoard={this.selectBoard}
          onLoadWorkspace={() => ipcRenderer.send('workspace-new')}
          onSwitchWorkspace={this.switchWorkspace}
        />
        <div
          style={{
            marginLeft: '160px',
            position: 'absolute',
            left: '0px',
            width: 'calc(100% - 170px)',
            height: 'calc(100%)'
          }}
        >
          <OverlayScrollbarsComponent
            className="os-theme-light"
            style={{ maxHeight: '100%' }}
          >
            <Board
              boardData={boardData}
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
