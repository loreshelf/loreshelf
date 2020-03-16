/* eslint-disable react/prop-types */
import React from 'react';
import {
  Button,
  ButtonGroup,
  MenuItem,
  ContextMenu,
  Menu as BJMenu,
  Popover,
  Intent,
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
    knownWorkspaces,
    workspace,
    boardData,
    onSelectBoard,
    onDeleteBoard,
    onLoadWorkspace,
    onSwitchWorkspace
  } = props;
  const noResults = <MenuItem text="Open the first workspace" />;
  const workspaceName =
    workspace && workspace.name ? workspace.name : '(No selection)';
  const selectedBoardName =
    boardData && boardData.name ? boardData.name : 'No board selected';
  const boardStatus = boardData && boardData.status ? boardData.status : '';
  const boards = workspace && workspace.boards ? workspace.boards : [];
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
                onClick={onLoadWorkspace}
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
                onClick={onLoadWorkspace}
                icon="cross"
                style={{ maxWidth: '75px' }}
              />
            </Tooltip>
          </Popover>
        </ButtonGroup>
        <WorkspaceSelect
          items={knownWorkspaces}
          noResults={noResults}
          itemRenderer={workspaceSelectProps.itemRenderer}
          onItemSelect={onSwitchWorkspace}
        >
          <Button
            rightIcon="caret-down"
            alignText="left"
            text={workspaceName}
            style={{
              minWidth: '150px',
              maxWidth: '150px'
            }}
          />
        </WorkspaceSelect>
        <Button
          active
          key="selectedBoard"
          onContextMenu={e => {
            e.preventDefault();
            const parent = e.target.offsetParent;
            const boardContextMenu = React.createElement(
              BJMenu,
              {},
              React.createElement(MenuItem, {
                onClick: () => {
                  console.log('duplicate');
                },
                icon: 'duplicate',
                text: 'Duplicate'
              }),
              React.createElement(MenuItem, {
                onClick: () => {
                  console.log('export');
                },
                icon: 'export',
                text: 'Export'
              }),
              React.createElement(MenuItem, {
                onClick: onDeleteBoard,
                icon: 'trash',
                intent: Intent.DANGER,
                text: 'Delete'
              })
            );

            ContextMenu.show(
              boardContextMenu,
              {
                left: parent.offsetLeft + parent.offsetWidth + 1,
                top: parent.offsetTop
              },
              () => {
                // menu was closed; callback optional
              },
              true
            );
          }}
        >
          {selectedBoardName}
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
          <div style={{ paddingLeft: '25px' }}>{boardStatus}</div>
        </div>
        <ButtonGroup>
          <Popover>
            <Tooltip
              content="Create new board in the workspace"
              position={Position.RIGHT}
            >
              <Button key="newBoard">
                <Icon
                  icon="add-to-artifact"
                  iconSize={Icon.SIZE_STANDARD}
                  style={{ marginRight: '10px', float: 'right' }}
                />
              </Button>
            </Tooltip>
          </Popover>
        </ButtonGroup>
        {boards.map((boardMeta, id) => {
          if (boardMeta.name !== selectedBoardName) {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Button key={id} onClick={() => onSelectBoard(id)}>
                {boardMeta.name}
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
