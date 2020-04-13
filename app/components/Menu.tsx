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
  Dialog,
  Icon,
  Popover,
  Position
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import fs from 'fs';
import styles from './Menu.css';
import { Workspace, workspaceSelectProps } from './Workspaces';
import { SortOption, renderSort } from './SortBySelect';
import BoardItem from './MenuItem';

const WorkspaceSelect = Select.ofType<Workspace>();
const SortSelect = Select.ofType<SortOption>();

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
      newBoardName: 'Notebook.md',
      newBoardType: NewBoardType.CREATE,
      newBoardIntent: Intent.NONE
    };

    this.searchInputRef = React.createRef();

    this.newBoardOpen = this.newBoardOpen.bind(this);
    this.duplicateBoardOpen = this.duplicateBoardOpen.bind(this);
    this.newBoardClose = this.newBoardClose.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { boardName, boardStatus, searchText } = this.props;
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      return true;
    }
    if (boardName !== nextProps.boardName) {
      return true;
    }
    if (boardStatus !== nextProps.boardStatus) {
      return true;
    }
    if (searchText !== nextProps.searchText) {
      return true;
    }
    return false;
  }

  newBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'Notebook.md',
      newBoardType: NewBoardType.CREATE
    });
  }

  duplicateBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'DuplicateNotebook.md',
      newBoardType: NewBoardType.DUPLICATE
    });
  }

  renameBoardOpen() {
    this.setState({
      newBoardOpen: true,
      newBoardName: 'RenamedNotebook.md',
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
      boardName,
      boardStatus,
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
      onNewCard,
      homeBoard,
      sortBy,
      onSortSelect,
      searchText,
      onSearchText
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
    const boards = workspace && workspace.boards ? workspace.boards : [];

    let dialogTitle;
    if (newBoardType === NewBoardType.CREATE) {
      dialogTitle = 'Create a new notebook';
    } else if (newBoardType === NewBoardType.DUPLICATE) {
      dialogTitle = 'Duplicate the notebook';
    } else if (newBoardType === NewBoardType.RENAME) {
      dialogTitle = 'Rename the notebook';
    }

    return (
      <div className={styles.menu}>
        <ButtonGroup vertical fill>
          <ButtonGroup
            style={{
              marginBottom: '12px',
              width: '100%',
              backgroundColor: '#30404d',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)'
            }}
          >
            <Button
              key="homeBoard"
              title={
                homeBoard
                  ? 'Open the home notebook'
                  : 'Set home notebook in the context menu of your current notebook'
              }
              onClick={onOpenHomeBoard}
              disabled={!homeBoard}
              icon="home"
              style={{
                maxWidth: '75px',
                height: '40px',
                minWidth: '75px'
              }}
            />
            {homeBoard && homeBoard.endsWith(`${boardName}.md`) && (
              <div
                style={{
                  position: 'absolute',
                  left: '18px',
                  top: '35px',
                  width: '40px',
                  height: '3px',
                  background: '#92f8e6',
                  zIndex: 10
                }}
              />
            )}
            <Button
              key="openWorkspace"
              title="Add and open new workspace"
              onClick={onAddWorkspace}
              icon="folder-open"
              style={{ maxWidth: '75px', minWidth: '75px' }}
            />
          </ButtonGroup>
          <ButtonGroup
            vertical
            alignText="right"
            style={{
              minWidth: '150px',
              maxWidth: '150px',
              backgroundColor: '#30404d',
              marginBottom: '10px',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)'
            }}
          >
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
              style={{
                width: '30px',
                marginTop: '30px',
                marginLeft: '150px',
                position: 'absolute',
                borderRadius: '0 15px 15px 0',
                zIndex: 10
              }}
              intent={Intent.PRIMARY}
              onClick={onNewCard}
              title="Add a new block"
              icon="plus"
            />
            <Button
              active
              key="selectedBoard"
              onContextMenu={e => {
                e.preventDefault();
                let parent = e.target;
                if (parent.tagName !== 'BUTTON') {
                  parent = e.target.offsetParent;
                }
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
              {boardName}
            </Button>
            {boardName && (
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
          </ButtonGroup>
          <ButtonGroup
            vertical
            fill
            alignText="right"
            style={{
              minWidth: '150px',
              maxWidth: '150px',
              backgroundColor: '#30404d',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)'
            }}
          >
            <ButtonGroup>
              <SortSelect
                items={[
                  { name: 'NAME', asc: true, icon: 'sort-alphabetical' },
                  { name: 'LAST UPDATED', asc: true, icon: 'sort-asc' },
                  { name: 'NAME', asc: false, icon: 'sort-alphabetical-desc' },
                  { name: 'LAST UPDATED', asc: false, icon: 'sort-desc' }
                ]}
                itemRenderer={renderSort}
                filterable={false}
                onItemSelect={selectedSort => {
                  this.shouldUpdate = true;
                  onSortSelect(
                    selectedSort.name,
                    selectedSort.asc,
                    selectedSort.icon
                  );
                }}
                popoverProps={{ minimal: true }}
              >
                <Button
                  rightIcon={sortBy.icon}
                  alignText="right"
                  title={`Sorting by ${sortBy.method.toLowerCase()}`}
                  style={{
                    minWidth: '50px',
                    maxWidth: '50px',
                    fontSize: 'small'
                  }}
                />
              </SortSelect>
              <Button
                key="newBoard"
                title="Create a new notebook"
                intent={Intent.PRIMARY}
                icon="plus"
                onClick={this.newBoardOpen}
              />
              <Button
                icon="reset"
                disabled={!searchText}
                style={{
                  minWidth: '50px',
                  width: '50px',
                  maxWidth: '50px'
                }}
                onClick={() => {
                  this.searchInputRef.current.value = '';
                  onSearchText(undefined);
                }}
                title="Reset search"
              />
            </ButtonGroup>
            <div
              className={`bp3-input-group ${
                searchText ? 'bp3-intent-warning' : ''
              }`}
              style={{ marginTop: '1px' }}
            >
              <Icon icon="search-text" />
              <input
                ref={this.searchInputRef}
                className="bp3-input"
                style={{ borderRadius: '0px', paddingRight: '0px' }}
                type="search"
                placeholder="Search in blocks"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    onSearchText(e.target.value);
                  }
                }}
                dir="auto"
              />
            </div>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <ButtonGroup
                vertical
                minimal
                fill
                small="true"
                alignText="right"
                style={{
                  width: '100%'
                }}
              >
                {boards.map((boardMeta, id) => {
                  return (
                    <BoardItem
                      // eslint-disable-next-line react/no-array-index-key
                      key={boardMeta.path}
                      disabled={boardMeta.name === boardName}
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
              The new notebook will be stored at
              <strong>{` ${workspacePath}/${newBoardName}`}</strong>
            </p>
            <p style={{ color: 'red' }}>
              {newBoardIntent === Intent.DANGER
                ? 'A notebook with this name already exists.'
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
