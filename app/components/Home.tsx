import React from 'react';
import styles from './Home.css';
import { Button, Classes } from "@blueprintjs/core";

export default function Home() {
  return (
    <div className={`${styles.container} ${Classes.DARK}`} data-tid="container">
      <h2>Comboard</h2>
      <Button icon="refresh">
          Click to wiggle
      </Button>
    </div>
  );
}
