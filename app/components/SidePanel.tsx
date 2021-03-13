/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import nodePath from 'path';
import {
  Button,
  ButtonGroup,
  Card,
  Elevation,
  FormGroup,
  InputGroup,
  Intent,
  Radio,
  RadioGroup,
  Slider,
  Spinner,
  Switch,
  Tag
} from '@blueprintjs/core';
import WorkspaceIndex from '../search/WorkspaceIndex';
import styles from './SidePanel.css';

enum SidePanelContent {
  SEARCH = 1,
  NOTEBOOK_CONFIG = 2
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
      searchStatus: SearchStatus.DONE,
      notebookConfig: { ...props.boardData.notebookConfig }
    };
    this.search = this.search.bind(this);
    this.selectSearch = this.selectSearch.bind(this);
    this.selectNotebookConfig = this.selectNotebookConfig.bind(this);
    this.searchReady = this.searchReady.bind(this);
    this.changeNotecardAdding = this.changeNotecardAdding.bind(this);
    this.changeNotecardSorting = this.changeNotecardSorting.bind(this);
    this.changeNotecardWidth = this.changeNotecardWidth.bind(this);
    this.changeNotecardZenmode = this.changeNotecardZenmode.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { workspace, boardPath } = this.props;
    if (workspace !== nextProps.workspace) {
      this.setState({ results: null, searchText: '' });
    }
    if (boardPath !== nextProps.boardPath) {
      const { boardData } = nextProps;
      this.setState({ notebookConfig: { ...boardData.notebookConfig } });
    }
    return true;
  }

  removeBoardFromIndex(board) {
    const { workspaceIndex, results } = this.state;
    if (workspaceIndex && board.content) {
      workspaceIndex.removeBoard(board);
    }
    if (results && results.length > 0) {
      const i = results.findIndex(r => {
        return r.path === board.path;
      });
      if (i >= 0) {
        results.splice(i, 1);
        this.setState({ results });
      }
    }
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

  selectNotebookConfig() {
    const { open, content } = this.state;
    if (content === SidePanelContent.NOTEBOOK_CONFIG) {
      this.setState({
        open: !open
      });
    } else {
      this.setState({
        open: true,
        content: SidePanelContent.NOTEBOOK_CONFIG
      });
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

  changeNotecardAdding() {
    const { notebookConfig } = this.state;
    const { onUpdateNotebookConfig } = this.props;
    if (notebookConfig.addToEnd || notebookConfig.addToEnd === undefined) {
      notebookConfig.addToEnd = false;
    } else {
      notebookConfig.addToEnd = true;
    }
    onUpdateNotebookConfig(notebookConfig);
    this.setState(notebookConfig);
  }

  changeNotecardSorting(e) {
    const { notebookConfig } = this.state;
    const { onUpdateNotebookConfig } = this.props;
    notebookConfig.sortBy = e.target.value;
    onUpdateNotebookConfig(notebookConfig);
    this.setState(notebookConfig);
  }

  changeNotecardWidth(val) {
    const { notebookConfig } = this.state;
    const { onUpdateNotebookConfig } = this.props;
    notebookConfig.width = val;
    onUpdateNotebookConfig(notebookConfig);
    this.setState(notebookConfig);
  }

  changeNotecardZenmode() {
    const { notebookConfig } = this.state;
    const { onUpdateNotebookConfig } = this.props;
    notebookConfig.zenmode = !notebookConfig.zenmode;
    onUpdateNotebookConfig(notebookConfig);
    this.setState(notebookConfig);
  }

  render() {
    const {
      open,
      content,
      searchText,
      results,
      searchStatus,
      notebookConfig
    } = this.state;
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
              icon="widget-header"
              large
              title="Configuration"
              onClick={this.selectNotebookConfig}
              style={{ marginBottom: '6px' }}
            />
            <Button
              icon="search"
              onClick={this.selectSearch}
              disabled={!workspace}
              large
              title="Search"
              intent={
                content === SidePanelContent.SEARCH && open
                  ? Intent.PRIMARY
                  : Intent.NONE
              }
              style={{ marginBottom: '6px' }}
            />
          </ButtonGroup>
          {open && content === SidePanelContent.NOTEBOOK_CONFIG && (
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
                Notebook Configuration
              </div>
              <span style={{ margin: '15px 0px' }}>
                Placement of a newly added notecard
              </span>
              <FormGroup inline>
                <span
                  style={{
                    padding: '5px',
                    backgroundColor:
                      notebookConfig.addToEnd === false
                        ? '#137cbd'
                        : 'rgb(48, 64, 77)'
                  }}
                >
                  Top
                </span>
                <Switch
                  checked={
                    notebookConfig.addToEnd ||
                    notebookConfig.addToEnd === undefined
                  }
                  inline
                  large
                  onChange={this.changeNotecardAdding}
                  style={{ margin: '0px', marginLeft: '10px' }}
                />
                <span
                  style={{
                    padding: '5px',
                    backgroundColor:
                      notebookConfig.addToEnd ||
                      notebookConfig.addToEnd === undefined
                        ? '#137cbd'
                        : 'rgb(48, 64, 77)'
                  }}
                >
                  Bottom
                </span>
              </FormGroup>
              <div style={{ marginTop: '15px' }}>
                <RadioGroup
                  label="Notecard sorting"
                  onChange={this.changeNotecardSorting}
                  selectedValue={notebookConfig.sortBy}
                >
                  <Radio label="Custom" value="custom" />
                  <Radio label="By title" value="title" />
                </RadioGroup>
              </div>
              <div style={{ marginTop: '15px' }}>
                {`Notecard width (${notebookConfig.width || 220})`}
              </div>
              <div style={{ padding: '5px' }}>
                <Slider
                  min={220}
                  max={440}
                  stepSize={110}
                  labelStepSize={110}
                  onChange={this.changeNotecardWidth}
                  labelRenderer={(val: number) => {
                    switch (val) {
                      case 220:
                        return 'Min';
                      case 330:
                        return 'Medium';
                      case 440:
                        return 'Max';
                      default:
                        break;
                    }
                    return 'Unknown';
                  }}
                  showTrackFill={false}
                  value={notebookConfig.width || 220}
                  vertical={false}
                />
              </div>
              <div style={{ margin: '15px 0px' }}>Open in zen mode</div>
              <Switch
                checked={notebookConfig.zenmode}
                inline
                label={notebookConfig.zenmode ? 'collapsed' : 'expanded'}
                large
                onChange={this.changeNotecardZenmode}
              />
            </div>
          )}
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
