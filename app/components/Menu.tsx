/* eslint-disable no-nested-ternary */
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
  Card,
  Tag,
  Tooltip,
  Slider,
  Spinner
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import moment from 'moment';
import path from 'path';
import styles from './Menu.css';
import { Workspace, workspaceSelectProps } from './Workspaces';
import { SortOption, renderSort } from './SortBySelect';
import BoardItem from './MenuItem';
import brand from '../resources/brand.png';
import { FilterOption, renderFilter } from './FilterBySelect';

const WorkspaceSelect = Select.ofType<Workspace>();
const SortSelect = Select.ofType<SortOption>();
const FilterSelect = Select.ofType<FilterOption>();

enum NewBoardType {
  CREATE = 1,
  DUPLICATE,
  RENAME
}

const FILTERING_METHODS = {
  Today: modified => {
    return moment(modified).isSameOrAfter(moment().startOf('day'));
  },
  Yesterday: modified => {
    return moment(modified).isBetween(
      moment()
        .subtract(1, 'days')
        .startOf('day'),
      moment()
        .subtract(1, 'days')
        .endOf('day')
    );
  },
  'Last 7 days': modified => {
    return moment(modified).isBetween(
      moment()
        .subtract(7, 'days')
        .startOf('day'),
      moment()
    );
  },
  'Last 30 days': modified => {
    return moment(modified).isBetween(
      moment()
        .subtract(30, 'days')
        .startOf('day'),
      moment()
    );
  }
};

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newBoardOpen: false,
      newBoardName: 'Notebook.md',
      newBoardType: NewBoardType.CREATE,
      newBoardIntent: Intent.NONE,
      addWorkspaceOpen: false,
      newVaultOpen: false,
      newVaultPath: '',
      filterText: undefined,
      showPassword: false,
      settingsOpen: false
    };

    this.searchInputRef = React.createRef();

    this.newBoardOpen = this.newBoardOpen.bind(this);
    this.duplicateBoardOpen = this.duplicateBoardOpen.bind(this);
    this.newBoardClose = this.newBoardClose.bind(this);
    this.addWorkspaceOpen = this.addWorkspaceOpen.bind(this);
    this.addWorkspaceClose = this.addWorkspaceClose.bind(this);
    this.newVaultOpen = this.newVaultOpen.bind(this);
    this.newVaultClose = this.newVaultClose.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.newBoardConfirm = this.newBoardConfirm.bind(this);
    this.settingsOpen = this.settingsOpen.bind(this);
    this.settingsClose = this.settingsClose.bind(this);
    this.settingsApply = this.settingsApply.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    ipcRenderer.on('new-zip-select-callback', (event, workspacePath) => {
      self.setState({ newVaultPath: workspacePath });
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { boardStatus, newVersion, updateDownloading } = this.props;
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      return true;
    }
    if (this.state !== nextState) {
      return true;
    }
    if (boardStatus !== nextProps.boardStatus) {
      return true;
    }
    if (newVersion !== nextProps.newVersion) {
      return true;
    }
    if (updateDownloading !== nextProps.updateDownloading) {
      return true;
    }
    return false;
  }

  settingsOpen() {
    const { settings } = this.props;
    this.setState({
      newSettings: { ...settings },
      settingsOpen: true
    });
  }

  settingsClose() {
    this.setState({ settingsOpen: false });
  }

  settingsApply() {
    const { onSettingsChange } = this.props;
    const { newSettings } = this.state;
    onSettingsChange(newSettings);
    this.settingsClose();
  }

  // eslint-disable-next-line class-methods-use-this
  isValidEmail(email) {
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
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

  newBoardConfirm() {
    const { newBoardName, newBoardType } = this.state;
    const {
      workspacePath,
      onNewBoard,
      onDuplicateBoard,
      onRenameBoard
    } = this.props;
    const status = this.handleNameChange(newBoardName, workspacePath);
    if (status === Intent.NONE) {
      if (newBoardType === NewBoardType.CREATE) {
        onNewBoard(newBoardName);
      } else if (newBoardType === NewBoardType.DUPLICATE) {
        onDuplicateBoard(newBoardName);
      } else if (newBoardType === NewBoardType.RENAME) {
        onRenameBoard(newBoardName);
      }
      this.setState({ newBoardOpen: false });
    }
  }

  addWorkspaceOpen() {
    this.setState({
      addWorkspaceOpen: true
    });
  }

  newVaultOpen() {
    this.setState({
      newVaultOpen: true,
      newVaultPath: ''
    });
  }

  duplicateBoardOpen() {
    const { boardData } = this.props;
    this.setState({
      newBoardOpen: true,
      newBoardName: `${boardData.name}(copy).md`,
      newBoardType: NewBoardType.DUPLICATE
    });
  }

  renameBoardOpen() {
    const { boardData } = this.props;
    this.setState({
      newBoardOpen: true,
      newBoardName: `${boardData.name}.md`,
      newBoardType: NewBoardType.RENAME
    });
  }

  newBoardClose() {
    this.setState({ newBoardOpen: false, newBoardIntent: Intent.NONE });
  }

  addWorkspaceClose() {
    this.setState({ addWorkspaceOpen: false });
  }

  newVaultClose() {
    this.setState({ newVaultOpen: false });
  }

  handleNameChange(newBoardName, workspacePath) {
    // Check if board already exists
    let newBoardIntent;
    if (fs.existsSync(`${workspacePath}${path.sep}${newBoardName}`)) {
      newBoardIntent = Intent.DANGER;
    } else {
      newBoardIntent = Intent.NONE;
    }
    this.setState({ newBoardName, newBoardIntent });
    return newBoardIntent;
  }

  render() {
    const {
      appVersion,
      boardData,
      boardStatus,
      knownWorkspaces,
      workspace,
      updateDownloading,
      newVersion,
      onSettingsChange,
      onSelectBoard,
      onDeleteBoard,
      onMoveCardToBoard,
      onCloseWorkspace,
      onSwitchWorkspace,
      onSetBoardOnStartup,
      onNewCard,
      settings,
      onNewSecuredWorkspace,
      onExportToPDF,
      onMoveBoardToWorkspace
    } = this.props;
    const {
      newBoardOpen,
      newBoardName,
      newBoardIntent,
      newBoardType,
      addWorkspaceOpen,
      newVaultOpen,
      newVaultPath,
      filterText,
      showPassword,
      settingsOpen,
      newSettings
    } = this.state;

    const { sortBy, filterBy } = settings;

    const noResults = <MenuItem text="No matching workspaces found" />;
    let workspaceName =
      workspace && workspace.name ? workspace.name : '(No selection)';
    if (workspaceName.endsWith('.zip')) {
      workspaceName = workspaceName.substring(
        0,
        workspaceName.lastIndexOf('.zip')
      );
    }
    const workspacePath =
      workspace && workspace.path ? workspace.path : 'unknown';
    const boards = workspace && workspace.boards ? workspace.boards : [];
    let filteredBoards = boards;
    if (filterText) {
      filteredBoards = boards.filter(boardMeta =>
        boardMeta.name.includes(filterText)
      );
    }
    if (filterBy.name !== 'All') {
      filteredBoards = filteredBoards.filter(boardMeta =>
        FILTERING_METHODS[filterBy.name](boardMeta.modified)
      );
    }
    let boardName = 'No notebooks';
    if (boardData && boardData.name) {
      boardName = boardData.name;
    } else if (workspace && workspace.zipdata && !workspace.password) {
      boardName = 'Locked notebooks';
    }

    let dialogTitle;
    if (newBoardType === NewBoardType.CREATE) {
      dialogTitle = 'Create a new notebook';
    } else if (newBoardType === NewBoardType.DUPLICATE) {
      dialogTitle = 'Duplicate the notebook';
    } else if (newBoardType === NewBoardType.RENAME) {
      dialogTitle = 'Rename the notebook';
    }

    const lockButton = (
      <Tooltip content={`${showPassword ? 'Hide' : 'Show'} Password`}>
        <Button
          icon={showPassword ? 'unlock' : 'lock'}
          intent={Intent.WARNING}
          minimal
          onClick={() => {
            this.setState({ showPassword: !showPassword });
          }}
        />
      </Tooltip>
    );

    const listOfWorkspaces = [];
    knownWorkspaces.forEach(ws => {
      if (!ws.path.endsWith('.zip') && ws.path !== workspace.path) {
        listOfWorkspaces.push(
          React.createElement(MenuItem, {
            onClick: () => {
              onMoveBoardToWorkspace(ws);
            },
            key: `move-${ws.path}`,
            text: ws.name
          })
        );
      }
    });

    return (
      <div className={styles.menu}>
        <ButtonGroup vertical fill>
          <div
            style={{
              width: '180px',
              backgroundColor: '#30404d',
              textAlign: 'center',
              padding: '5px',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)'
            }}
          >
            <img
              src={brand}
              alt="Logo"
              style={{ width: '150px', margin: '0 auto' }}
            />
          </div>
          <ButtonGroup
            vertical
            alignText="right"
            style={{
              minWidth: '180px',
              maxWidth: '180px',
              backgroundColor: '#30404d',
              marginBottom: '10px',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)'
            }}
          >
            <ButtonGroup>
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
                    minWidth: '140px',
                    maxWidth: '140px'
                  }}
                />
              </WorkspaceSelect>
              <Button
                key="addWorkspace"
                title="Add new workspace"
                onClick={this.addWorkspaceOpen}
                icon="cube-add"
                style={{ maxWidth: '40px', minWidth: '40px' }}
              />
            </ButtonGroup>
            <Button
              style={{
                width: '30px',
                marginTop: '30px',
                marginLeft: '180px',
                position: 'absolute',
                borderRadius: '0 15px 15px 0',
                zIndex: 10
              }}
              intent={Intent.PRIMARY}
              onClick={onNewCard}
              disabled={!boardData || workspace.readonly}
              title="Add a new notecard"
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
                    disabled: boardData == null,
                    text: 'Duplicate'
                  }),
                  React.createElement(
                    MenuItem,
                    {
                      icon: 'flows',
                      disabled: boardData == null || workspace.readonly,
                      text: 'Move to workspace'
                    },
                    listOfWorkspaces
                  ),
                  React.createElement(MenuItem, {
                    onClick: () => {
                      this.renameBoardOpen();
                    },
                    icon: 'edit',
                    disabled: boardData == null || workspace.readonly,
                    text: 'Rename'
                  }),
                  React.createElement(MenuItem, {
                    onClick: () => {
                      onExportToPDF();
                    },
                    icon: 'export',
                    disabled: boardData == null,
                    text: 'Export to PDF'
                  }),
                  React.createElement(MenuItem, {
                    onClick: () => {
                      onSetBoardOnStartup();
                    },
                    icon: 'log-in',
                    disabled: boardData == null,
                    text: 'Open on startup'
                  }),
                  React.createElement(MenuDivider),
                  React.createElement(MenuItem, {
                    onClick: onDeleteBoard,
                    icon: 'trash',
                    disabled: boardData == null || workspace.readonly,
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
            <ButtonGroup
              style={{
                fontSize: 'small',
                paddingRight: '5px',
                paddingTop: '5px',
                paddingBottom: '5px'
              }}
            >
              {workspace && workspace.zipdata && (
                <Icon
                  icon={
                    workspace.password && workspace.wrongPassword === false
                      ? 'unlock'
                      : 'lock'
                  }
                  style={{ paddingLeft: '10px', color: '#a7b6c2' }}
                />
              )}
              {boardName && (
                <div style={{ textAlign: 'right', width: '100%' }}>
                  {boardStatus}
                </div>
              )}
            </ButtonGroup>
          </ButtonGroup>
          <ButtonGroup
            vertical
            fill
            alignText="right"
            style={{
              minWidth: '180px',
              maxWidth: '180px',
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
                  const newSortSettings = { ...settings };
                  newSortSettings.sortBy = selectedSort;
                  onSettingsChange(newSortSettings);
                }}
                popoverProps={{ minimal: true }}
              >
                <Button
                  icon={sortBy.icon}
                  title={`Sort by ${sortBy.method.toLowerCase()}`}
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
                disabled={
                  (workspace && workspace.zipdata && !workspace.password) ||
                  workspace.readonly
                }
                icon="plus"
                onClick={this.newBoardOpen}
              />
              <FilterSelect
                items={[
                  {
                    name: 'Today',
                    icon: 'time'
                  },
                  {
                    name: 'Yesterday',
                    icon: 'history'
                  },
                  {
                    name: 'Last 7 days',
                    icon: 'clipboard'
                  },
                  {
                    name: 'Last 30 days',
                    icon: 'timeline-events'
                  },
                  { name: 'All', icon: 'calendar' }
                ]}
                itemRenderer={renderFilter}
                filterable={false}
                onItemSelect={selectedFilter => {
                  this.shouldUpdate = true;
                  onFilterSelect(selectedFilter.name, selectedFilter.icon);
                  const newFilterSettings = { ...settings };
                  newFilterSettings.filterBy = selectedFilter;
                  onSettingsChange(newFilterSettings);
                }}
                popoverProps={{ minimal: true }}
              >
                <Button
                  icon={filterBy.icon}
                  title={filterBy.name}
                  style={{
                    minWidth: '50px',
                    maxWidth: '50px',
                    fontSize: 'small'
                  }}
                />
              </FilterSelect>
            </ButtonGroup>
            <InputGroup
              type="text"
              leftIcon="filter"
              placeholder="Filter by name..."
              onChange={e => {
                this.setState({ filterText: e.target.value });
              }}
              style={{ marginTop: '1px' }}
            />
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
                {filteredBoards.map((boardMeta, id) => {
                  return (
                    <BoardItem
                      // eslint-disable-next-line react/no-array-index-key
                      key={boardMeta.path}
                      disabled={boardMeta.name === boardName}
                      onClick={() => onSelectBoard(boardMeta.path)}
                      moveCard={cardIndex => {
                        onMoveCardToBoard(cardIndex, boardMeta.path);
                      }}
                    >
                      {boardMeta.name}
                    </BoardItem>
                  );
                })}
              </ButtonGroup>
            </div>
          </ButtonGroup>
          <ButtonGroup
            style={{
              minWidth: '180px',
              maxWidth: '180px',
              backgroundColor: '#30404d',
              boxShadow:
                '0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4)',
              marginTop: '10px'
            }}
          >
            <div
              style={{
                textAlign: 'left',
                fontSize: 'small',
                width: '100%',
                color: '#a7b6c2',
                cursor: 'default',
                paddingTop: '7px',
                paddingLeft: '10px'
              }}
            >
              {appVersion}
            </div>
            <Button
              icon="cog"
              style={{
                minWidth: '50px',
                width: '50px',
                maxWidth: '50px'
              }}
              onClick={this.settingsOpen}
            />
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
              The new notebook will be stored at:
              <br />
              <strong>{` ${workspacePath}${path.sep}${newBoardName}`}</strong>
            </p>
            <p style={{ color: 'red' }}>
              {newBoardIntent === Intent.DANGER
                ? 'A notebook with this name already exists.'
                : ''}
            </p>
            <InputGroup
              onChange={e => {
                this.handleNameChange(`${e.target.value}.md`, workspacePath);
              }}
              autoFocus
              onKeyPress={e => {
                if (e.which === 13) {
                  // Enter
                  this.newBoardConfirm();
                }
              }}
              intent={newBoardIntent}
              placeholder="Enter new name..."
            />
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.newBoardClose}>Close</Button>
              <Button intent={Intent.PRIMARY} onClick={this.newBoardConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
        <Dialog
          className={Classes.DARK}
          icon="cube-add"
          onClose={this.addWorkspaceClose}
          isOpen={addWorkspaceOpen}
          title="Add new workspace"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>Choose the source location of your new workspace.</p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                margin: '0 auto',
                justifyContent: 'center'
              }}
            >
              <Card
                interactive
                className={styles.addWorkspaceCard}
                onClick={() => {
                  this.addWorkspaceClose();
                  ipcRenderer.send('workspace-add');
                }}
              >
                <div style={{ display: 'flex' }}>
                  <Icon
                    icon="folder-open"
                    iconSize="48"
                    style={{ marginTop: '10px', marginRight: '10px' }}
                  />
                  <div>
                    <h3>Folder</h3>
                    <p>
                      Open local folder where notebooks (.md) files will be
                      stored as a workspace.
                    </p>
                  </div>
                </div>
              </Card>
              <Card
                interactive
                className={styles.addWorkspaceCard}
                onClick={() => {
                  this.addWorkspaceClose();
                  ipcRenderer.send('workspace-add-zip');
                }}
              >
                <div style={{ display: 'flex' }}>
                  <Icon
                    icon="shield"
                    iconSize="48"
                    style={{ marginTop: '10px', marginRight: '10px' }}
                  />
                  <div style={{ width: '100%' }}>
                    <h3>
                      My vault
                      <Tag style={{ float: 'right' }}>Password-protected</Tag>
                    </h3>
                    <p>
                      Open AES-encrypted zip archive with your notebooks as a
                      workspace.
                    </p>
                  </div>
                </div>
              </Card>
              <Card
                interactive
                className={styles.addWorkspaceCard}
                onClick={() => {
                  this.addWorkspaceClose();
                  this.newVaultOpen();
                }}
              >
                <div style={{ display: 'flex' }}>
                  <Icon
                    icon="folder-new"
                    iconSize="48"
                    style={{ marginTop: '10px', marginRight: '10px' }}
                  />
                  <div style={{ width: '100%' }}>
                    <h3>
                      New vault
                      <Tag style={{ float: 'right' }}>Password-protected</Tag>
                    </h3>
                    <p>Create new AES-encrypted zip archive as a workspace.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.addWorkspaceClose}>Cancel</Button>
            </div>
          </div>
        </Dialog>
        <Dialog
          className={Classes.DARK}
          icon="cube-add"
          onClose={this.newVaultClose}
          isOpen={newVaultOpen}
          title="New vault workspace"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>Create new AES-encrypted zip archive as a workspace.</p>
            <div style={{ width: '300px' }}>
              <p>Choose the zip file location:</p>
              <ButtonGroup>
                <InputGroup
                  type="text"
                  placeholder="Choose file..."
                  disabled
                  value={newVaultPath}
                />
                <Button
                  onClick={() => {
                    ipcRenderer.send('new-zip-select');
                  }}
                >
                  Browse
                </Button>
              </ButtonGroup>
              <p>Protect the workspace with your password:</p>
              <InputGroup
                type={showPassword ? 'text' : 'password'}
                rightElement={lockButton}
                placeholder="Enter password..."
                inputRef={(pwdInput: HTMLInputElement) => {
                  this.pwdInput = pwdInput;
                }}
              />
            </div>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.newVaultClose}>Close</Button>
              <Button
                intent={Intent.PRIMARY}
                onClick={() => {
                  this.newVaultClose();
                  onNewSecuredWorkspace(newVaultPath, this.pwdInput.value);
                }}
              >
                Create workspace
              </Button>
            </div>
          </div>
        </Dialog>
        <Dialog
          className={Classes.DARK}
          icon="cog"
          onClose={this.settingsClose}
          isOpen={settingsOpen}
          title="Settings"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              These settings apply globally in the whole Loreshelf application,
              all workspaces and notebooks.
            </p>
            <Tag fill large minimal icon="two-columns">
              Notecard Width
            </Tag>
            <div style={{ padding: '20px' }}>
              <Slider
                min={220}
                max={440}
                stepSize={110}
                labelStepSize={110}
                onChange={val => {
                  newSettings.notecardWidth = val;
                  this.setState({ newSettings });
                }}
                labelRenderer={(val: number) => {
                  switch (val) {
                    case 220:
                      return 'Minimal';
                    case 330:
                      return 'Medium';
                    case 440:
                      return 'Maximal';
                    default:
                      break;
                  }
                  return 'Unknown';
                }}
                showTrackFill={false}
                value={newSettings?.notecardWidth}
                vertical={false}
              />
            </div>
            <ButtonGroup>
              {(!newVersion || appVersion === newVersion) &&
                updateDownloading == null && (
                  <Button
                    style={{ marginRight: '10px' }}
                    onClick={() => ipcRenderer.send('update-check', false)}
                  >
                    Check for updates
                  </Button>
                )}
              {newVersion && appVersion !== newVersion && (
                <Button
                  style={{ marginRight: '10px' }}
                  disabled={updateDownloading}
                  onClick={() => ipcRenderer.send('update-download')}
                >
                  Download updates
                </Button>
              )}
              {newVersion &&
                appVersion === newVersion &&
                updateDownloading === false && (
                  <Button
                    style={{ marginRight: '10px' }}
                    onClick={() => ipcRenderer.send('update-install')}
                  >
                    Install and Restart
                  </Button>
                )}
              {updateDownloading && <Spinner size={Spinner.SIZE_SMALL} />}
              {appVersion === newVersion && (
                <p>{`Up to date, v${appVersion}`}</p>
              )}
              {newVersion && appVersion !== newVersion && (
                <p>{`Version ${newVersion} available`}</p>
              )}
            </ButtonGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.settingsClose}>Close</Button>
              <Button intent={Intent.PRIMARY} onClick={this.settingsApply}>
                Apply
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default Menu;
