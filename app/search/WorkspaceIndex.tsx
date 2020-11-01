/* eslint-disable no-param-reassign */
import FlexSearch from 'flexsearch';
import MarkdownIt from 'markdown-it';
import { plainTextPlugin } from '../components/Markdown';

class WorkspaceIndex {
  constructor(workspace) {
    const md = new MarkdownIt();
    md.use(plainTextPlugin);
    this.md = md;
    this.createIndex = this.createIndex.bind(this);
    this.addBoard = this.addBoard.bind(this);
    this.updateIndex = this.updateIndex.bind(this);
    this.search = this.search.bind(this);
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

    this.createIndex(workspace);
  }

  createIndex(workspace) {
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
    this.updateIndex();
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

  updateIndex() {
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
  }

  search(text, callback) {
    this.index.search(text, { limit: 10, page: true }, callback);
  }
}

export default WorkspaceIndex;
