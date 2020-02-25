import React from 'react';
import { Button, Classes } from '@blueprintjs/core';
import SplitPane from 'react-split-pane';
import styles from './Home.css';
import Editor from './Editor';

export default function Home() {
  return (
    <div className={`${styles.container} ${Classes.DARK}`} data-tid="container">
      <SplitPane split="vertical" style={{ height: '100%' }} defaultSize="50%">
        <div className={styles.board}>
          <Button icon="refresh">Click to wiggle</Button>
        </div>
        <div className={styles.editor}>
          <Editor />
        </div>
      </SplitPane>
    </div>
  );
}
