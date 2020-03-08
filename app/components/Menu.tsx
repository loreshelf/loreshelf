/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import {
  Button,
  ButtonGroup,
  MenuItem,
  Popover,
  Tooltip,
  Position,
  Icon
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import styles from './Menu.css';
import { Workspace, workspaceSelectProps } from './Workspaces';

const WorkspaceSelect = Select.ofType<Workspace>();

function Menu(props) {
  const {
    menuItems,
    onClick,
    onNewBoard,
    selectedBoard,
    selectedWorkspace,
    workspaces,
    boardModified,
    onNewWorkspace,
    onWorkspaceChanged
  } = props;
  const noResults = <MenuItem text="Open the first workspace" />;
  return (
    <div className={styles.menu}>
      <ButtonGroup
        vertical
        large
        minimal
        alignText="right"
        style={{
          minWidth: '150px',
          maxWidth: '150px'
        }}
      >
        <ButtonGroup>
          <Popover>
            <Tooltip
              content="Add and open new workspace"
              position={Position.RIGHT}
            >
              <Button
                key="openWorkspace"
                onClick={onNewWorkspace}
                icon="folder-open"
                style={{ maxWidth: '75px' }}
              />
            </Tooltip>
          </Popover>
          <Popover>
            <Tooltip
              content="Close the current workspace."
              position={Position.RIGHT}
            >
              <Button
                key="closeWorkspace"
                onClick={onNewBoard}
                icon="cross"
                style={{ maxWidth: '75px' }}
              />
            </Tooltip>
          </Popover>
        </ButtonGroup>
        <WorkspaceSelect
          items={workspaces}
          noResults={noResults}
          itemRenderer={workspaceSelectProps.itemRenderer}
          onItemSelect={onWorkspaceChanged}
        >
          <Button
            rightIcon="caret-down"
            alignText="left"
            text={selectedWorkspace ? `${selectedWorkspace}` : '(No selection)'}
            style={{
              minWidth: '150px',
              maxWidth: '150px'
            }}
          />
        </WorkspaceSelect>
        <Button active key="selectedBoard" onClick={onNewBoard}>
          {selectedBoard}
        </Button>
        <div
          style={{
            fontSize: 'small',
            paddingRight: '5px',
            paddingTop: '10px',
            paddingBottom: '10px'
          }}
        >
          <Icon
            icon="automatic-updates"
            iconSize={Icon.SIZE_STANDARD}
            style={{ marginLeft: '10px', float: 'left' }}
          />
          <div style={{ paddingLeft: '25px' }}>{boardModified}</div>
        </div>
        <ButtonGroup>
          <Popover>
            <Tooltip
              content="Create new board in the workspace"
              position={Position.RIGHT}
            >
              <Button key="newBoard" onClick={onNewBoard}>
                <Icon
                  icon="add-to-artifact"
                  iconSize={Icon.SIZE_STANDARD}
                  style={{ marginRight: '10px', float: 'right' }}
                />
              </Button>
            </Tooltip>
          </Popover>
        </ButtonGroup>
        {menuItems.map((item, id) => {
          if (item !== selectedBoard) {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Button key={id} onClick={() => onClick(item)}>
                {item}
              </Button>
            );
          }
          return undefined;
        })}
      </ButtonGroup>
    </div>
  );
}

export default Menu;
