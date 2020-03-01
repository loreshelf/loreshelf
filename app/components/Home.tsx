import React, { Component } from 'react';
import { Classes } from '@blueprintjs/core';
import SplitPane from 'react-split-pane';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Editor from './Editor';
import Board from './Board';

class Home extends Component {
  constructor() {
    super();
    const content = `
# POJIŠteni

% Uzavřeno
01.12.2017

% Konec
01.12.2050

% Zprostředkovatel
Generali

% Hodnota
100/den pri hospitalizaci, 3.1M uraz, 5.2M invalidita, 2.6M smrt, 300/den prac. Neschopnost od 15teho dne

% Platba
1 500 Kč měsíčně

# SMLOUVA X

% Uzavřeno
01.07.2017

% Konec
01.07.2050

% Zprostředkovatel
SDFSF dfs

% Hodnota
dfsdf sdf sd fs ffsdf

% Platba
10 000 Kč měsíčně

# SMLOUVA Y

% Uzavřeno
01.07.2017

% Konec
01.07.2050

% Zprostředkovatel
SDFSF dfs

% Hodnota
dfsdf sdf sd fs ffsdf

% Platba
10 000 Kč měsíčně

# SMLOUVA Z

% Uzavřeno
01.07.2017

% Konec
01.07.2050

% Zprostředkovatel
SDFSF dfs

% Hodnota
dfsdf sdf sd fs ffsdf

% Platba
10 000 Kč měsíčně
    `;

    const items = content.trim().split(/(?=# )/g);

    this.state = {
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

  addNewItem() {
    console.log('add new');
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
