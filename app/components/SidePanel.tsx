/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import nodePath from 'path';
import {
  Button,
  ButtonGroup,
  Card,
  Elevation,
  InputGroup,
  Intent,
  Spinner,
  Tag
} from '@blueprintjs/core';
import WorkspaceIndex from '../search/WorkspaceIndex';
import styles from './SidePanel.css';

enum SidePanelContent {
  SEARCH = 1,
  PINNED
}

enum SearchStatus {
  DONE = 1,
  SEARCHING
}

class SidePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      content: SidePanelContent.SEARCH,
      searchText: '',
      workspaceIndex: null,
      results: null,
      searchStatus: SearchStatus.DONE
    };
    this.search = this.search.bind(this);
    this.selectSearch = this.selectSearch.bind(this);
    this.searchReady = this.searchReady.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { workspace } = this.props;
    if (workspace !== nextProps.workspace) {
      this.setState({ results: null, searchText: '' });
    }
    return true;
  }

  searchReady() {
    const { workspaceIndex, searchText, results } = this.state;
    if (workspaceIndex) {
      workspaceIndex.search(searchText, rs => {
        let newResults = results;
        if (newResults === null) {
          newResults = [];
        } else {
          newResults.length = 0;
        }
        const temp = {};
        rs.result.forEach(r => {
          const notebook = r.path.substring(
            r.path.lastIndexOf(nodePath.sep) + 1,
            r.path.length - 3
          );
          if (!temp[notebook]) {
            temp[notebook] = { tags: [], total: 0 };
          }
          temp[notebook].path = r.path;
          const existingTitle = temp[notebook].tags.findIndex(tag => {
            return tag.title === r.title;
          });
          if (existingTitle < 0) {
            temp[notebook].tags.push({ id: r.id, title: r.title });
          }
          temp[notebook].total += 1;
          if (temp[notebook].tags.length > 3) {
            if (temp[notebook].more === undefined) {
              temp[notebook].more = 1;
            } else {
              temp[notebook].more += 1;
            }
          }
        });
        Object.keys(temp).forEach(k => {
          newResults.push({
            notebook: k,
            notecards: temp[k].tags,
            more: temp[k].more,
            path: temp[k].path,
            total: temp[k].total
          });
        });
        this.setState({ results: newResults, searchStatus: SearchStatus.DONE });
      });
    } else {
      let newResults = results;
      if (newResults === null) {
        newResults = [];
      } else {
        newResults.length = 0;
      }
      this.setState({ results: newResults, searchStatus: SearchStatus.DONE });
    }
  }

  search() {
    this.setState({ searchStatus: SearchStatus.SEARCHING });
    const { workspace, knownWorkspaces, showonly } = this.props;
    const { workspaceIndex } = this.state;
    showonly.enabled = false;
    showonly.searchResult = null;
    let wi = workspaceIndex;
    if (wi == null) {
      wi = new WorkspaceIndex(workspace, knownWorkspaces);
      this.setState({ workspaceIndex: wi });
      wi.createIndex(workspace, this.searchReady);
    } else if (!wi.sameWorkspace(workspace)) {
      wi.createIndex(workspace, this.searchReady);
    } else {
      wi.updateIndex(this.searchReady);
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
    const { open, content, searchText, results, searchStatus } = this.state;
    const {
      workspace,
      boardPath,
      showonly,
      openBoard,
      onSwitchShowOnly
    } = this.props;
    let totalResults = 0;
    if (results) {
      results.forEach(r => {
        totalResults += r.total;
      });
    }

    return (
      <div className={styles.sidePanel}>
        <ButtonGroup>
          <ButtonGroup vertical fill style={{ marginRight: '12px' }}>
            <Button
              icon="search"
              onClick={this.selectSearch}
              disabled={!workspace}
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
              <div
                style={{
                  borderBottom: '1px solid hsl(206, 24%, 64%)',
                  width: 'calc(100% + 20px)',
                  marginLeft: '-10px',
                  padding: '0px 10px',
                  paddingBottom: '5px'
                }}
              >
                Search in:
              </div>
              <div style={{ textAlign: 'right', padding: '10px 0px' }}>
                {workspace.name}
              </div>
              <InputGroup
                type="text"
                placeholder="Enter text..."
                disabled={searchStatus === SearchStatus.SEARCHING}
                onChange={e => {
                  this.setState({ searchText: e.target.value });
                }}
                onKeyPress={e => {
                  if (e.which === 13 && searchStatus === SearchStatus.DONE) {
                    // Enter
                    this.search();
                  }
                }}
                value={searchText}
              />
              <ButtonGroup fill style={{ margin: '15px 0px' }}>
                <Button
                  intent={Intent.PRIMARY}
                  text="Search"
                  disabled={searchStatus === SearchStatus.SEARCHING}
                  onClick={this.search}
                />
              </ButtonGroup>
              {searchStatus === SearchStatus.SEARCHING && <Spinner />}
              <div
                style={{
                  minHeight: '0',
                  display: 'flex',
                  flex: '1',
                  flexDirection: 'column',
                  margin: '0px -10px'
                }}
              >
                {searchStatus === SearchStatus.DONE && results && (
                  <>
                    <div
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        background: '#202b33',
                        fontSize: 'small',
                        padding: '5px 10px'
                      }}
                    >
                      {totalResults === 0 && <div>No results</div>}
                      {totalResults > 0 && `${totalResults} results`}
                    </div>
                    <ButtonGroup
                      vertical
                      fill
                      style={{ overflow: 'auto', flex: '1' }}
                    >
                      {results.map(r => (
                        <Card
                          interactive
                          key={r.notebook}
                          elevation={Elevation.TWO}
                          style={{
                            padding: '5px',
                            margin: '10px 0px',
                            background:
                              boardPath === r.path && showonly.enabled
                                ? '#0081c9'
                                : '#455b6e'
                          }}
                          onClick={() => {
                            if (
                              boardPath !== r.path ||
                              !showonly.searchResult ||
                              showonly.searchResult.notecards.length === 0
                            ) {
                              const notecards = [];
                              r.notecards.forEach(n => {
                                notecards.push(n.title);
                              });
                              openBoard(r.path, {
                                notecards,
                                total: r.total
                              });
                              const menuItem = document.getElementById(
                                `menu-${r.notebook.replaceAll(' ', '_')}`
                              );
                              menuItem.scrollIntoView({ behavior: 'smooth' });
                            } else {
                              onSwitchShowOnly();
                            }
                          }}
                        >
                          <h3 style={{ padding: '0px 5px', minHeight: 'auto' }}>
                            {r.notebook}
                          </h3>
                          {r.notecards.map(
                            (n, i) =>
                              i < 3 && (
                                <Tag
                                  key={n.id}
                                  fill
                                  style={{
                                    margin: '5px 0px'
                                  }}
                                >
                                  {n.title}
                                </Tag>
                              )
                          )}
                          {r.more && (
                            <div
                              style={{
                                fontSize: 'small',
                                textAlign: 'right'
                              }}
                            >
                              {`and ${r.more} more`}
                            </div>
                          )}
                        </Card>
                      ))}
                    </ButtonGroup>
                  </>
                )}
              </div>
            </div>
          )}
        </ButtonGroup>
      </div>
    );
  }
}

export default SidePanel;
