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
# POJIŠTĚNÍ

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
    `;
    this.state = {
      markdownSrc: content
    };
  }

  render() {
    const { markdownSrc } = this.state;
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
            <div className={styles.board}>
              <Card elevation={Elevation.ZERO} className={styles.card}>
                <h5>
                  <a href="https://test.com">Card heading</a>
                </h5>
                <p>Card content</p>
              </Card>
              <Card elevation={Elevation.ZERO} className={styles.card}>
                <h5>
                  <a href="https://test.com">Card heading</a>
                </h5>
                <p>Card content</p>
              </Card>
              <Card elevation={Elevation.ZERO} className={styles.card}>
                <h5>
                  <a href="https://test.com">Card heading</a>
                </h5>
                <p>Card content</p>
              </Card>
              <Card elevation={Elevation.ZERO} className={styles.card}>
                <h5>
                  <a href="https://test.com">Card heading</a>
                </h5>
                <p>Card content</p>
              </Card>
            </div>
          </OverlayScrollbarsComponent>
          <div className={styles.editor}>
            <Editor />
          </div>
        </SplitPane>
      </div>
    );
  }
}

export default Home;
