import FlexSearch from 'flexsearch';

class WorkspaceIndex {
  constructor(workspace) {
    this.createIndex(workspace);
  }

  createIndex(workspace) {
    this.index = new FlexSearch('balance');
    this.workspace = workspace;
    // TODO: zpracovat board.content a pridat do indexu
  }

  updateIndex() {
    this.workspace.boards.forEach(board => {
      if (board.modified !== board.indexmtime) {
        board.ids.forEach(id => {
          this.index.remove(id);
        });
        // TODO: zpracovat board.content a pridat do indexu
      }
    });
  }
}

export default WorkspaceIndex;
