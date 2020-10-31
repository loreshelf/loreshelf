/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import nodePath from 'path';
import {
  Button,
  ButtonGroup,
  Card,
  Elevation,
  InputGroup,
  Intent,
  Radio,
  RadioGroup,
  Tag
} from '@blueprintjs/core';
import WorkspaceIndex from '../search/WorkspaceIndex';
import styles from './SidePanel.css';

enum SidePanelContent {
  SEARCH = 1,
  PINNED
}

class SidePanel extends Component {
  constructor(props) {
    super(props);
    const { workspace } = this.props;
    this.state = {
      open: false,
      content: SidePanelContent.SEARCH,
      searchIn: 'current',
      searchText: '',
      workspaceIndex: null,
      results: []
    };
    this.search = this.search.bind(this);
    this.selectSearch = this.selectSearch.bind(this);

    // callback when content ready for indexing and search
    ipcRenderer.on('board-content-callback', (e, path, content) => {
      const boardIndex = workspace.boards.findIndex(board => {
        return board.path === path;
      });
      workspace.boards[boardIndex].content = content;
    });
  }

  contentForSearchReady() {
    const { workspaceIndex, searchText, results } = this.state;
    const { workspace } = this.props;
    let wi = workspaceIndex;
    if (wi == null) {
      wi = new WorkspaceIndex(workspace);
      this.setState({ workspaceIndex: wi });
    } else {
      wi.updateIndex();
    }
    wi.search(searchText, rs => {
      results.length = 0;
      const temp = {};
      console.log(rs);
      rs.result.forEach(r => {
        const notebook = r.path.substring(
          r.path.lastIndexOf(nodePath.sep) + 1,
          r.path.length - 3
        );
        if (!temp[notebook]) {
          temp[notebook] = { tags: [] };
        }
        temp[notebook].tags.push({ id: r.id, title: r.title });
      });
      Object.keys(temp).forEach(k => {
        results.push({ notebook: k, notecards: temp[k].tags });
      });
      this.setState({ results });
    });
  }

  search() {
    const { searchText } = this.state;
    const { workspace } = this.props;
    console.log(searchText);
    // ipc set workspace.boards.content
    let allSet = true;
    workspace.boards.forEach(board => {
      if (board.content === undefined) {
        allSet = false;
        ipcRenderer.send('board-content', board.path);
      }
    });
    if (allSet) {
      this.contentForSearchReady();
    }
  }

  selectSearch() {
    const { open, content } = this.state;
    if (content === SidePanelContent.SEARCH) {
      this.setState({
        open: !open
      });
    } else {
      this.setState({
        open: true,
        content: SidePanelContent.SEARCH
      });
    }
  }

  render() {
    const { open, content, searchIn, searchText, results } = this.state;

    return (
      <div className={styles.sidePanel}>
        <ButtonGroup>
          <ButtonGroup vertical fill style={{ marginRight: '12px' }}>
            <Button
              icon="search"
              onClick={this.selectSearch}
              large
              intent={
                content === SidePanelContent.SEARCH && open
                  ? Intent.PRIMARY
                  : Intent.NONE
              }
            />
          </ButtonGroup>
          {open && content === SidePanelContent.SEARCH && (
            <div className={styles.sidePanelContent}>
              <RadioGroup
                label="Search in"
                onChange={(e, x) => {
                  this.setState({ searchIn: e.target.value });
                }}
                selectedValue={searchIn}
              >
                <Radio label="Current workspace" value="current" />
                <Radio label="All workspaces" value="all" />
              </RadioGroup>
              {searchIn === 'all' && (
                <div>
                  <div style={{ fontSize: 'small' }}>Indexed data from:</div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: 'small'
                    }}
                  >
                    14:23 Oct 30
                  </div>
                </div>
              )}
              <InputGroup
                type="text"
                placeholder="Enter text..."
                onChange={e => {
                  this.setState({ searchText: e.target.value });
                }}
                onKeyPress={e => {
                  if (e.which === 13) {
                    // Enter
                    this.search();
                  }
                }}
                value={searchText}
              />
              <ButtonGroup fill style={{ margin: '15px 0px' }}>
                {searchIn === 'all' && (
                  <Button
                    icon="inbox-geo"
                    outlined
                    intent={Intent.DANGER}
                    title="Refresh global search index"
                    style={{ marginRight: '10px' }}
                  />
                )}
                <Button
                  intent={Intent.PRIMARY}
                  text="Search"
                  onClick={this.search}
                />
              </ButtonGroup>
              <div
                style={{
                  width: 'calc(100% + 20px)',
                  textAlign: 'center',
                  background: '#202b33',
                  clear: 'both',
                  fontSize: 'small',
                  padding: '5px 10px',
                  marginLeft: '-10px'
                }}
              >
                23 results
              </div>
              <div
                style={{
                  minHeight: '0',
                  display: 'flex',
                  flex: '1',
                  flexDirection: 'column',
                  margin: '0px -10px'
                }}
              >
                <ButtonGroup
                  vertical
                  fill
                  style={{ overflow: 'auto', flex: '1' }}
                >
                  {results.length > 0 ? (
                    <>
                      {results.map(r => (
                        <Card
                          interactive
                          key={r.notebook}
                          elevation={Elevation.TWO}
                          style={{
                            padding: '5px',
                            margin: '10px 0px',
                            background: '#455b6e'
                          }}
                        >
                          <h3 style={{ padding: '0px 5px', minHeight: 'auto' }}>
                            {r.notebook}
                          </h3>
                          {r.notecards.map(n => (
                            <Tag
                              key={n.id}
                              fill
                              style={{
                                margin: '5px 0px'
                              }}
                            >
                              {n.title}
                            </Tag>
                          ))}
                          <div
                            style={{ fontSize: 'small', textAlign: 'right' }}
                          >
                            and 2 more
                          </div>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div>No results</div>
                  )}
                </ButtonGroup>
              </div>
            </div>
          )}
        </ButtonGroup>
      </div>
    );
  }
}

export default SidePanel;
