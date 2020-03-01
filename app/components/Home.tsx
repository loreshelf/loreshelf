import React, { Component } from 'react';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import { Classes } from '@blueprintjs/core';
import SplitPane from 'react-split-pane';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Editor from './Editor';
import Board from './Board';

class Home extends Component {
  constructor() {
    super();

    const items = [];
    const board = undefined;

    this.state = {
      board,
      items,
      editId: -1,
      editSrc: '',
      editTitle: ''
    };
    this.addNewItem = this.addNewItem.bind(this);
    this.editItem = this.editItem.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleTitleEdit = this.handleTitleEdit.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    ipcRenderer.on('board-load', (event, boardPath) => {
      self.loadBoard(boardPath);
    });
    ipcRenderer.on('board-save', event => {
      self.saveBoard();
    });
  }

  getCurrentBoardMd() {
    const { items } = this.state;
    return items.join();
  }

  loadBoard(board) {
    const text = fs.readFileSync(board, 'utf8');
    const items = text.trim().split(/(?=# )/g);
    this.setState({
      board,
      items
    });
  }

  saveBoard() {
    const { board } = this.state;
    fs.writeFileSync(board, this.getCurrentBoardMd(), 'utf8');
  }

  addNewItem() {
    const { items } = this.state;
    items.push('# \n\n');
    this.setState({ items });
  }

  editItem(id, item) {
    let title = item.match(/# (.*)\n/);
    if (title) {
      // eslint-disable-next-line prefer-destructuring
      title = title[1];
    } else {
      title = '';
    }
    let src = '';
    const notEmpty = item.indexOf('\n\n');
    if (notEmpty) {
      src = item.substring(notEmpty + 2);
    }
    this.setState({ editId: id, editSrc: src, editTitle: title });
  }

  handleEdit(e) {
    const { items, editId, editTitle } = this.state;
    items[editId] = `# ${editTitle}\n\n${e.target.value}`;
    this.setState({ editSrc: e.target.value });
  }

  handleTitleEdit(e) {
    const { items, editId, editSrc } = this.state;
    items[editId] = `# ${e}\n\n${editSrc}`;
    this.setState({ editTitle: e });
  }

  render() {
    const { items, editSrc, editTitle } = this.state;
    return (
      <div
        className={`${styles.container} ${Classes.DARK}`}
        data-tid="container"
      >
        <SplitPane
          split="vertical"
          style={{ height: '100%' }}
          defaultSize="50%"
        >
          <OverlayScrollbarsComponent
            className="os-theme-light"
            style={{ maxHeight: '100%' }}
          >
            <Board
              items={items}
              onEdit={this.editItem}
              addNewItem={this.addNewItem}
            />
          </OverlayScrollbarsComponent>
          <div className={styles.editor}>
            <Editor
              content={editSrc}
              title={editTitle}
              onChange={this.handleEdit}
              onTitleChange={this.handleTitleEdit}
            />
          </div>
        </SplitPane>
      </div>
    );
  }
}

export default Home;
