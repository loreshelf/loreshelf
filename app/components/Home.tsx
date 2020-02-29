import React, { Component } from 'react';
import { Card, Classes, Elevation } from '@blueprintjs/core';
import SplitPane from 'react-split-pane';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import styles from './Home.css';
import Editor from './Editor';
import Board from './Board';

class Home extends Component {
  constructor(props) {
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
    this.state = {
      markdownSrc: content,
      editSrc: ''
    };
    this.editItem = this.editItem.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
  }

  editItem(item) {
    this.setState({ editSrc: item });
  }

  handleEdit(e) {
    const { markdownSrc, editSrc } = this.state;
    this.setState({
      markdownSrc: markdownSrc.replace(editSrc, e.target.value)
    });
    this.setState({ editSrc: e.target.value });
  }

  render() {
    const { markdownSrc, editSrc } = this.state;
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
            <Board markdownSrc={markdownSrc} onEdit={this.editItem} />
          </OverlayScrollbarsComponent>
          <div className={styles.editor}>
            <Editor content={editSrc} onChange={this.handleEdit} />
          </div>
        </SplitPane>
      </div>
    );
  }
}

export default Home;
