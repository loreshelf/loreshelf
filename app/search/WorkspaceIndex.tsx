/* eslint-disable no-param-reassign */
import MiniSearch from 'minisearch';
import MarkdownIt from 'markdown-it';
import moment from 'moment';
import { ipcRenderer } from 'electron';
import LZString from 'lz-string';
import { plainTextPlugin } from '../components/Markdown';
import stopWords from './StopWords';

function checkIndexUsage(knownWorkspaces) {
  let k = 0;
  while (k < localStorage.length) {
    const key = localStorage.key(k);
    if (key?.startsWith('index:')) {
      const path = key.substring(6);
      const i = knownWorkspaces.findIndex(workspace => {
        return workspace.path === path;
      });
      if (i < 0) {
        localStorage.removeItem(`index:${path}`);
      }
    }
    k += 1;
  }
}

class WorkspaceIndex {
  constructor(workspace, knownWorkspaces) {
    checkIndexUsage(knownWorkspaces);
    const md = new MarkdownIt();
    md.use(plainTextPlugin);
    this.md = md;
    this.workspace = workspace;
    this.createIndex = this.createIndex.bind(this);
    this.addBoard = this.addBoard.bind(this);
    this.updateIndex = this.updateIndex.bind(this);
    this.search = this.search.bind(this);
    this.refreshIndex = this.refreshIndex.bind(this);

    // callback when content ready for indexing and search
    ipcRenderer.on('board-content-callback', (e, path, content) => {
      const boardIndex = this.workspace.boards.findIndex(board => {
        return board.path === path;
      });
      this.workspace.boards[boardIndex].content = content;
      const undefinedBoard = this.workspace.boards.findIndex(b => {
        return b && b.content === undefined && b.modified !== b.indexmtime;
      });
      if (undefinedBoard < 0) {
        this.refreshIndex();
      }
    });
  }

  removeIndex(workspacePath) {
    localStorage.removeItem(`index:${workspacePath}`);
    this.indexedBoards = null;
    if (this.workspace && this.workspace.boards) {
      this.workspace.boards.forEach(board => {
        board.ids = [];
      });
    }
  }

  createIndex(workspace, callback) {
    this.id = 1;
    this.workspace = workspace;
    const removeDialects = str => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    // old index cache
    // localStorage.removeItem(`index:${path}`);
    this.indexedBoards = localStorage.getItem(`index:${this.workspace.path}`); // string to object =>
    let init = true;
    if (this.indexedBoards) {
      this.indexedBoards = JSON.parse(
        LZString.decompressFromBase64(this.indexedBoards)
      );
      if (this.indexedBoards === null) {
        // error, remove and reindex
        this.removeIndex(workspace.path);
      } else {
        const outOfDate = this.indexedBoards.boards.findIndex(board => {
          const boardIndex = this.workspace.boards.findIndex(b => {
            return b.path === board.path && b.modified === board.modified;
          });
          return boardIndex < 0;
        });
        if (outOfDate < 0) {
          // up to date
          this.index = MiniSearch.loadJSON(this.indexedBoards.index, {
            fields: ['title', 'content'],
            storeFields: ['title', 'path'],
            processTerm: (term, _fieldName) =>
              stopWords.has(term) ? null : removeDialects(term.toLowerCase())
          });
          init = false;
          let maxId = 0;
          this.indexedBoards.boards.forEach(board => {
            const boardIndex = this.workspace.boards.findIndex(b => {
              return b && b.path === board.path;
            });
            this.workspace.boards[
              boardIndex
            ].indexmtime = this.workspace.boards[boardIndex].modified;
            this.workspace.boards[boardIndex].ids = board.ids;
            const m = Math.max(...board.ids);
            if (m > maxId) {
              maxId = m;
            }
          });
          this.id = maxId + 1;
        } else {
          this.removeIndex(workspace.path);
        }
      }
    }
    if (init) {
      this.index = new MiniSearch({
        fields: ['title', 'content'],
        storeFields: ['title', 'path'],
        processTerm: (term, _fieldName) =>
          stopWords.has(term) ? null : removeDialects(term.toLowerCase())
      });
    }
    this.updateIndex(callback);
  }

  getNotecardDocs(content, path) {
    const docs = [];
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
        docs.push({
          content: this.md.plainText,
          title,
          path
        });
      }
    });
    return docs;
  }

  addBoard(board) {
    const docs = this.getNotecardDocs(board.content, board.path);
    docs.forEach(doc => {
      doc.id = this.id;
      board.ids.push(this.id);
      this.id += 1;
    });
    this.index.addAll(docs);
  }

  updateIndex(callback) {
    let allSet = true;
    this.callback = callback;
    if (this.indexedBoards) {
      const outOfDate = this.indexedBoards.boards.findIndex(board => {
        const boardIndex = this.workspace.boards.findIndex(b => {
          return b.path === board.path && b.modified === board.modified;
        });
        return boardIndex < 0;
      });
      if (outOfDate >= 0) {
        this.removeIndex(workspace.path);
      }
    }
    this.workspace.boards.forEach(board => {
      if (
        board &&
        (board.content === undefined ||
          (board.indexmtime && board.modified !== board.indexmtime))
      ) {
        if (board.content && board.ids && board.ids.length > 0) {
          const docs = this.getNotecardDocs(board.content, board.path);
          let i = 0;
          docs.forEach(doc => {
            doc.id = board.ids[i];
            i += 1;
          });
          this.index.removeAll(docs);
          board.ids = [];
        }
        if (!board.ids || board.ids.length === 0) {
          allSet = false;
          ipcRenderer.send('board-content', board.path);
        }
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
        this.indexedBoards.index = JSON.stringify(this.index);
        const compressed = LZString.compressToBase64(
          JSON.stringify(this.indexedBoards)
        );
        localStorage.setItem(`index:${this.workspace.path}`, compressed);
      }
    }
    this.workspace.boards.forEach(board => {
      if (board.modified !== board.indexmtime) {
        board.ids = [];
        board.indexmtime = board.modified;
        this.addBoard(board);
      }
    });
    this.callback();
  }

  search(text, callback) {
    const result = this.index.search(text, {
      boost: { title: 2 },
      prefix: term => term.length > 2,
      fuzzy: term => (term.length > 3 ? 0.2 : null)
    });
    callback({ result });
  }

  sameWorkspace(workspace) {
    return this.workspace === workspace;
  }
}

export default WorkspaceIndex;
