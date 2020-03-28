/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import {
  Button,
  ButtonGroup,
  Classes,
  MenuItem,
  ContextMenu,
  InputGroup,
  Menu as BJMenu,
  MenuDivider,
  Intent,
  Dialog
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import fs from 'fs';
import styles from './Menu.css';
import { Workspace, workspaceSelectProps } from './Workspaces';
import BoardItem from './MenuItem';

const WorkspaceSelect = Select.ofType<Workspace>();

enum NewBoardType {
  CREATE = 1,
  DUPLICATE,
  RENAME
}

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newBoardOpen: false,
      newBoardName: 'NewSpool.md',
      newBoardType: NewBoardType.CREATE,
      newBoardIntent: Intent.NONE
    };
    this.newBoardOpen = this.newBoardOpen.bind(this);
    this.duplicateBoardOpen = this.duplicateBoardOpen.bind(this);
    this.newBoardClose = this.newBoardClose.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
  }

  newBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'NewSpool.md',
      newBoardType: NewBoardType.CREATE
    });
  }

  duplicateBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'DuplicateSpool.md',
      newBoardType: NewBoardType.DUPLICATE
    });
  }

  renameBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'RenamedSpool.md',
      newBoardType: NewBoardType.RENAME
    });
  }

  newBoardClose() {
    this.setState({ newBoardOpen: false });
  }

  handleNameChange(event, workspacePath) {
    // Check if board already exists
    const newBoardName = `${event.target.value}.md`;
    let newBoardIntent;
    if (fs.existsSync(`${workspacePath}/${newBoardName}`)) {
      newBoardIntent = Intent.DANGER;
    } else {
      newBoardIntent = Intent.NONE;
    }
    this.setState({ newBoardName, newBoardIntent });
  }

  render() {
    const {
      knownWorkspaces,
      workspace,
      boardData,
      onNewBoard,
      onDuplicateBoard,
      onSelectBoard,
      onDeleteBoard,
      onRenameBoard,
      onMoveCardToBoard,
      onAddWorkspace,
      onCloseWorkspace,
      onSwitchWorkspace,
      onOpenHomeBoard,
      onSetHome,
      homeBoard
    } = this.props;
    const {
      newBoardOpen,
      newBoardName,
      newBoardIntent,
      newBoardType
    } = this.state;
    const noResults = <MenuItem text="No matching workspaces found" />;
    const workspaceName =
      workspace && workspace.name ? workspace.name : '(No selection)';
    const workspacePath =
      workspace && workspace.path ? workspace.path : 'unknown';
    const selectedBoardName =
      boardData && boardData.name ? boardData.name : 'No spools';
    const boardStatus = boardData && boardData.status ? boardData.status : '';
    const boards = workspace && workspace.boards ? workspace.boards : [];

    let dialogTitle;
    if (newBoardType === NewBoardType.CREATE) {
      dialogTitle = 'Create a new spool';
    } else if (newBoardType === NewBoardType.DUPLICATE) {
      dialogTitle = 'Duplicate the spool';
    } else if (newBoardType === NewBoardType.RENAME) {
      dialogTitle = 'Rename the spool';
    }

    return (
      <div className={styles.menu}>
        <ButtonGroup
          vertical
          large
          fill
          minimal
          alignText="right"
          style={{
            minWidth: '150px',
            maxWidth: '150px'
          }}
        >
          <ButtonGroup>
            <Button
              key="homeBoard"
              title={
                homeBoard
                  ? 'Open the home spool'
                  : 'Set home spool in the context menu of your current spool'
              }
              onClick={onOpenHomeBoard}
              disabled={!homeBoard}
              icon="home"
              style={{
                maxWidth: '75px',
                boxShadow: homeBoard.endsWith(`${selectedBoardName}.md`)
                  ? '0px 17px 0px -15px white'
                  : 'none'
              }}
            />
            <Button
              key="openWorkspace"
              title="Add and open new workspace"
              onClick={onAddWorkspace}
              icon="folder-open"
              style={{ maxWidth: '75px' }}
            />
          </ButtonGroup>
          <WorkspaceSelect
            items={knownWorkspaces}
            noResults={noResults}
            itemPredicate={workspaceSelectProps.itemPredicate}
            itemRenderer={workspaceSelectProps.itemRenderer}
            onItemSelect={(selectedWorkspace, actionMeta) => {
              if (actionMeta && actionMeta.action === 'close') {
                onCloseWorkspace(actionMeta.workspacePath);
              } else {
                onSwitchWorkspace(selectedWorkspace);
              }
            }}
            resetOnClose
            resetOnSelect
            popoverProps={{ minimal: true }}
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
                    this.duplicateBoardOpen();
                  },
                  icon: 'duplicate',
                  text: 'Duplicate'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    this.renameBoardOpen();
                  },
                  icon: 'edit',
                  text: 'Rename'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    onSetHome();
                  },
                  icon: 'home',
                  text: 'Set Home'
                }),
                React.createElement(MenuItem, {
                  onClick: () => {
                    console.log('export');
                  },
                  icon: 'export',
                  text: 'Export'
                }),
                React.createElement(MenuDivider),
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
          {boardData && (
            <div
              style={{
                fontSize: 'small',
                paddingRight: '5px',
                paddingTop: '5px',
                paddingBottom: '5px'
              }}
            >
              <div style={{ paddingLeft: '25px' }}>{boardStatus}</div>
            </div>
          )}
          <Button
            key="newBoard"
            title="Create a new spool"
            icon="plus"
            onClick={this.newBoardOpen}
          />
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <ButtonGroup
              vertical
              large
              minimal
              alignText="right"
              style={{ width: '100%' }}
            >
              {boards.map((boardMeta, id) => {
                return (
                  <BoardItem
                    // eslint-disable-next-line react/no-array-index-key
                    key={id}
                    disabled={boardMeta.name === selectedBoardName}
                    onClick={() => onSelectBoard(id)}
                    moveCard={cardIndex => onMoveCardToBoard(cardIndex, id)}
                  >
                    {boardMeta.name}
                  </BoardItem>
                );
              })}
            </ButtonGroup>
          </div>
        </ButtonGroup>
        <Dialog
          className={Classes.DARK}
          icon="control"
          onClose={this.newBoardClose}
          isOpen={newBoardOpen}
          title={dialogTitle}
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              The new spool will be stored at
              <strong>{` ${workspacePath}/${newBoardName}`}</strong>
            </p>
            <p style={{ color: 'red' }}>
              {newBoardIntent === Intent.DANGER
                ? 'A spool with this name already exists.'
                : ''}
            </p>
            <InputGroup
              onChange={e => this.handleNameChange(e, workspacePath)}
              intent={newBoardIntent}
              placeholder="Enter new name..."
            />
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.newBoardClose}>Close</Button>
              <Button
                intent={Intent.PRIMARY}
                onClick={() => {
                  if (newBoardIntent === Intent.NONE) {
                    if (newBoardType === NewBoardType.CREATE) {
                      onNewBoard(newBoardName);
                    } else if (newBoardType === NewBoardType.DUPLICATE) {
                      onDuplicateBoard(newBoardName);
                    } else if (newBoardType === NewBoardType.RENAME) {
                      onRenameBoard(newBoardName);
                    }
                    this.setState({ newBoardOpen: false });
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default Menu;
