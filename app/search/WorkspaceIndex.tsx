/* eslint-disable no-param-reassign */
import FlexSearch from 'flexsearch';
import MarkdownIt from 'markdown-it';
import moment from 'moment';
import { ipcRenderer } from 'electron';
import { plainTextPlugin } from '../components/Markdown';

class WorkspaceIndex {
  constructor(workspace) {
    const md = new MarkdownIt();
    md.use(plainTextPlugin);
    this.md = md;
    this.workspace = workspace;
    this.createIndex = this.createIndex.bind(this);
    this.addBoard = this.addBoard.bind(this);
    this.updateIndex = this.updateIndex.bind(this);
    this.search = this.search.bind(this);
    this.refreshIndex = this.refreshIndex.bind(this);
    const removeDialects = str => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    FlexSearch.registerEncoder('Lextra', str => {
      str = removeDialects(str); // custom
      str = FlexSearch.encode('extra', str); // built-in
      return str;
    });
    FlexSearch.registerEncoder('Licase', str => {
      str = removeDialects(str); // custom
      str = FlexSearch.encode('icase', str); // built-in
      return str;
    });

    // callback when content ready for indexing and search
    ipcRenderer.on('board-content-callback', (e, path, content) => {
      console.log(this.workspace.boards);
      const boardIndex = this.workspace.boards.findIndex(board => {
        return board.path === path;
      });
      this.workspace.boards[boardIndex].content = content;
      const undefinedBoard = this.workspace.boards.findIndex(b => {
        return b && b.content === undefined;
      });
      if (undefinedBoard < 0) {
        this.refreshIndex();
      }
    });
  }

  createIndex(workspace, callback) {
    this.index = new FlexSearch('balance', {
      filter(value) {
        return value.length > 1;
      },
      doc: {
        id: 'id',
        field: {
          title: {
            encode: 'Lextra',
            tokenize: 'forward',
            threshold: 1,
            boost: 2
          },
          path: {
            encode: false
          },
          content: {
            encode: 'Licase'
          }
        }
      }
    });
    this.id = 1;
    this.workspace = workspace;
    // old index cache
    localStorage.removeItem(workspace.path);
    this.indexedBoards = localStorage.getItem(workspace.path); // string to object =>
    if (this.indexedBoards) {
      this.indexedBoards = JSON.parse(this.indexedBoards);
      console.log(this.indexedBoards);
      const outOfDate = this.indexedBoards.boards.findIndex(board => {
        const boardIndex = this.workspace.boards.findIndex(b => {
          return b.path === board.path && b.modified === board.modified;
        });
        return boardIndex < 0;
      });
      if (outOfDate < 0) {
        // up to date
        this.index.import(this.indexedBoards.index, {
          index: true,
          doc: true
        });
        console.log(this.index.info());
        let maxId = 0;
        this.indexedBoards.boards.forEach(board => {
          const boardIndex = this.workspace.boards.findIndex(b => {
            return b && b.path === board.path;
          });
          this.workspace.boards[boardIndex].indexmtime = this.workspace.boards[
            boardIndex
          ].modified;
          this.workspace.boards[boardIndex].ids = board.ids;
          const m = Math.max(...board.ids);
          if (m > maxId) {
            maxId = m;
          }
        });
        this.id = maxId + 1;
      } else {
        localStorage.removeItem(workspace.path);
        this.indexBoards = null;
      }
    }
    this.updateIndex(callback);
  }

  addBoard(board, content) {
    const mdCards = content.split(/^(?=# )/gm);
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
        this.md.render(src);
        this.index.add([
          {
            id: this.id,
            content: this.md.plainText,
            title,
            path: board.path
          }
        ]);
        board.ids.push(this.id);
        this.id += 1;
      }
    });
  }

  updateIndex(callback) {
    let allSet = true;
    this.callback = callback;
    this.workspace.boards.forEach(board => {
      if (
        board &&
        (board.content === undefined ||
          (board.indexmtime && board.modified !== board.indexmtime))
      ) {
        allSet = false;
        ipcRenderer.send('board-content', board.path);
      }
    });
    if (allSet) {
      this.refreshIndex();
    }
  }

  refreshIndex() {
    if (!this.indexedBoards) {
      this.indexedBoards = { boards: [] };
      this.workspace.boards.forEach(board => {
        const isOld = moment(board.modified).isBefore(
          moment()
            .subtract(7, 'days')
            .startOf('day')
        );
        if (isOld) {
          board.ids = [];
          board.indexmtime = board.modified;
          this.addBoard(board, board.content);
          this.indexedBoards.boards.push({
            path: board.path,
            modified: board.modified,
            ids: board.ids
          });
        }
      });
      if (this.indexedBoards.boards.length === 0) {
        this.indexedBoards = null;
      } else {
        this.indexedBoards.index = this.index.export({
          index: true,
          doc: true
        });
        console.log('export');
        console.log(this.indexedBoards);
        localStorage.setItem(
          this.workspace.path,
          JSON.stringify(this.indexedBoards)
        );
      }
    }
    this.workspace.boards.forEach(board => {
      if (board.modified !== board.indexmtime) {
        if (board.ids) {
          board.ids.forEach(id => {
            this.index.remove({ id });
          });
        }
        board.ids = [];
        board.indexmtime = board.modified;
        this.addBoard(board, board.content);
      }
    });
    this.callback();
  }

  search(text, callback) {
    this.index.search({ query: text, fieldlimit: 10, page: true, callback });
  }

  sameWorkspace(workspace) {
    return this.workspace === workspace;
  }
}

export default WorkspaceIndex;
