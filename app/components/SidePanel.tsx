/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
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
import styles from './SidePanel.css';

enum SidePanelContent {
  SEARCH = 1,
  PINNED
}

class SidePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      content: SidePanelContent.SEARCH,
      searchIn: 'current'
    };
    this.selectSearch = this.selectSearch.bind(this);
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
    const { open, content, searchIn } = this.state;

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
              <InputGroup
                type="text"
                placeholder="Enter text..."
                onChange={e => {
                  console.log(e);
                }}
                style={{ marginBottom: '10px' }}
              />
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
                <Button intent={Intent.PRIMARY} text="Search" />
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
                  <Card
                    interactive
                    elevation={Elevation.TWO}
                    style={{
                      padding: '5px',
                      margin: '10px 0px',
                      background: '#455b6e'
                    }}
                  >
                    <h3 style={{ padding: '0px 5px', minHeight: 'auto' }}>
                      Accounts
                    </h3>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      Mybank gd fg dfg dfg dfg hfg h fgh
                    </Tag>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      Mybank gd f
                    </Tag>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      Myba
                    </Tag>
                    <div style={{ fontSize: 'small', textAlign: 'right' }}>
                      and 2 more
                    </div>
                  </Card>
                  <Card
                    interactive
                    elevation={Elevation.TWO}
                    style={{
                      padding: '5px',
                      margin: '10px 0px',
                      background: '#455b6e'
                    }}
                  >
                    <h3 style={{ padding: '0px 5px', minHeight: 'auto' }}>
                      Ideas
                    </h3>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      UX improvements
                    </Tag>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      Pinned notecards
                    </Tag>
                    <Tag
                      fill
                      style={{
                        margin: '5px 0px'
                      }}
                    >
                      Collapsible text
                    </Tag>
                    <div style={{ fontSize: 'small', textAlign: 'right' }}>
                      and 1 more
                    </div>
                  </Card>
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
