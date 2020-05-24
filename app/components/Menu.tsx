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
  Label,
  Card
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import fs from 'fs';
import styles from './Menu.css';
import { Workspace, workspaceSelectProps } from './Workspaces';
import { SortOption, renderSort } from './SortBySelect';
import BoardItem from './MenuItem';
import brand from '../resources/brand.png';

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
      newBoardIntent: Intent.NONE,
      addWorkspaceOpen: false,
      licensePopupOpen: false,
      licenseActivatePopupOpen: false,
      licenseEmail: '',
      licenseKey: '',
      licenseEmailIntent: Intent.NONE,
      licenseKeyIntent: Intent.NONE,
      licenseActivatedOpen: false
    };

    this.searchInputRef = React.createRef();

    this.newBoardOpen = this.newBoardOpen.bind(this);
    this.duplicateBoardOpen = this.duplicateBoardOpen.bind(this);
    this.newBoardClose = this.newBoardClose.bind(this);
    this.addWorkspaceOpen = this.addWorkspaceOpen.bind(this);
    this.addWorkspaceClose = this.addWorkspaceClose.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.licensePopupOpen = this.licensePopupOpen.bind(this);
    this.licensePopupClose = this.licensePopupClose.bind(this);
    this.licenseActivatedClose = this.licenseActivatedClose.bind(this);
    this.handleLicenseKeyChange = this.handleLicenseKeyChange.bind(this);
    this.handleLicenseEmailChange = this.handleLicenseEmailChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { boardStatus, searchText, homeBoard, license } = this.props;
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
    if (license !== nextProps.license) {
      return true;
    }
    if (searchText !== nextProps.searchText) {
      return true;
    }
    if (homeBoard !== nextProps.homeBoard) {
      return true;
    }
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  isValidEmail(email) {
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return true;
    }
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  isValidLicenseKey(licenseKey) {
    if (/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(licenseKey)) {
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

  addWorkspaceOpen() {
    this.setState({
      addWorkspaceOpen: true
    });
  }

  licensePopupOpen() {
    this.setState({
      licensePopupOpen: true
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

  licensePopupClose() {
    this.setState({ licensePopupOpen: false });
  }

  licenseActivatedClose() {
    this.setState({ licenseActivatedOpen: false });
  }

  handleNameChange(newBoardName, workspacePath) {
    // Check if board already exists
    let newBoardIntent;
    if (fs.existsSync(`${workspacePath}/${newBoardName}`)) {
      newBoardIntent = Intent.DANGER;
    } else {
      newBoardIntent = Intent.NONE;
    }
    this.setState({ newBoardName, newBoardIntent });
    return newBoardIntent;
  }

  handleLicenseKeyChange(event) {
    // Check if board already exists
    const licenseKey = event.target.value;
    let licenseKeyIntent;
    if (!this.isValidLicenseKey(licenseKey)) {
      licenseKeyIntent = Intent.DANGER;
    } else {
      licenseKeyIntent = Intent.NONE;
    }
    this.setState({ licenseKey, licenseKeyIntent });
  }

  handleLicenseEmailChange(event) {
    // Check if board already exists
    const licenseEmail = event.target.value;
    let licenseEmailIntent;
    if (!this.isValidEmail(licenseEmail)) {
      licenseEmailIntent = Intent.DANGER;
    } else {
      licenseEmailIntent = Intent.NONE;
    }
    this.setState({ licenseEmail, licenseEmailIntent });
  }

  render() {
    const {
      boardData,
      boardStatus,
      knownWorkspaces,
      workspace,
      homeBoard,
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
      sortBy,
      onSortSelect,
      searchText,
      onSearchText,
      license,
      deviceId,
      onLicenseActivated
    } = this.props;
    const {
      newBoardOpen,
      newBoardName,
      newBoardIntent,
      newBoardType,
      addWorkspaceOpen,
      licensePopupOpen,
      licenseActivatePopupOpen,
      licenseKey,
      licenseKeyIntent,
      licenseEmail,
      licenseEmailIntent,
      licenseActivatedOpen
    } = this.state;
    const noResults = <MenuItem text="No matching workspaces found" />;
    const workspaceName =
      workspace && workspace.name ? workspace.name : '(No selection)';
    const workspacePath =
      workspace && workspace.path ? workspace.path : 'unknown';
    const boards = workspace && workspace.boards ? workspace.boards : [];
    const boardName =
      boardData && boardData.name ? boardData.name : 'No notebooks';

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
                    icon: 'log-in',
                    text: 'Open on startup'
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
                placeholder="Search here"
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
                textAlign: 'center',
                fontSize: 'small',
                width: '100%',
                color: '#a7b6c2'
              }}
            >
              v1.0
              <br />
              PROFESSIONAL
            </div>
            <Button
              icon="cog"
              style={{
                minWidth: '50px',
                width: '50px',
                maxWidth: '50px'
              }}
              onClick={() => {
                this.licensePopupOpen();
              }}
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
              The new notebook will be stored at
              <strong>{` ${workspacePath}/${newBoardName}`}</strong>
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
                  const status = this.handleNameChange(
                    newBoardName,
                    workspacePath
                  );
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
                }}
              >
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
                flexWrap: 'wrap',
                width: '100%',
                margin: '0 auto',
                justifyContent: 'center'
              }}
            >
              <Card
                interactive
                style={{
                  minWidth: '200px',
                  maxWidth: '200px',
                  padding: '15px',
                  paddingTop: '5px',
                  margin: '3px'
                }}
                onClick={() => {
                  this.addWorkspaceClose();
                  onAddWorkspace();
                }}
              >
                <h3>Local folder</h3>
                <p>
                  Open local file folder where notebooks (.md) files will be
                  stored.
                </p>
              </Card>
              <Card
                interactive
                style={{
                  minWidth: '200px',
                  maxWidth: '200px',
                  padding: '15px',
                  paddingTop: '5px',
                  margin: '3px'
                }}
              >
                <h3>My secured workspace</h3>
                <p>Open AES-encrypted zip archive with your notebooks.</p>
              </Card>
              <Card
                interactive
                style={{
                  minWidth: '200px',
                  maxWidth: '200px',
                  padding: '15px',
                  paddingTop: '5px',
                  margin: '3px'
                }}
              >
                <h3>GitHub repository</h3>
                <p>Open location in your GitHub repository as a workspace.</p>
              </Card>
              <Card
                interactive
                style={{
                  minWidth: '200px',
                  maxWidth: '200px',
                  padding: '15px',
                  paddingTop: '5px',
                  margin: '3px'
                }}
              >
                <h3>New secured workspace</h3>
                <p>Create new AES-encrypted zip archive.</p>
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
          icon="git-repo"
          onClose={this.licensePopupClose}
          isOpen={licensePopupOpen}
          title="Free version"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              This is a free version of Loreshelf for personal use. In order to
              remove the popup and enable premium features, please consider
              upgrading to the premium version.
            </p>
            <Button
              onClick={() => {
                this.setState({
                  licensePopupOpen: false,
                  licenseActivatePopupOpen: true
                });
              }}
            >
              Activate license
            </Button>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.licensePopupClose}>Close</Button>
              <Button
                intent={Intent.PRIMARY}
                onClick={() => {
                  window.open('https://loreshelf.com/pricing', '_blank');
                }}
              >
                Buy online
              </Button>
            </div>
          </div>
        </Dialog>
        <Dialog
          className={Classes.DARK}
          icon="key"
          onClose={() => {
            this.setState({ licenseActivatePopupOpen: false });
          }}
          isOpen={licenseActivatePopupOpen}
          title="Activate License"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              Fill in your email address which you used for the purchase and the
              license key which you received in the welcome email.
            </p>
            <Label>
              Email:
              <InputGroup
                placeholder="Enter your email"
                intent={licenseEmailIntent}
                onChange={this.handleLicenseEmailChange}
              />
            </Label>
            <Label>
              License Key:
              <InputGroup
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                intent={licenseKeyIntent}
                onChange={this.handleLicenseKeyChange}
              />
            </Label>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                onClick={() => {
                  this.setState({ licenseActivatePopupOpen: false });
                }}
              >
                Close
              </Button>
              <Button
                intent={Intent.PRIMARY}
                onClick={() => {
                  // check inputs, email and licenseKey
                  const valid =
                    this.isValidEmail(licenseEmail) &&
                    this.isValidLicenseKey(licenseKey);
                  if (valid) {
                    const requestOptions = {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: licenseEmail,
                        licenseKey,
                        deviceId
                      })
                    };
                    // eslint-disable-next-line promise/catch-or-return
                    fetch('http://localhost:4242/activate', requestOptions)
                      .then(response => response.json())
                      // eslint-disable-next-line promise/always-return
                      .then(data => {
                        const { hash } = data;
                        onLicenseActivated(
                          licenseEmail,
                          licenseKey,
                          deviceId,
                          hash
                        );
                        this.setState({
                          licenseActivatePopupOpen: false,
                          licenseActivatedOpen: true
                        });
                      });
                  }
                }}
              >
                Activate
              </Button>
            </div>
          </div>
        </Dialog>
        <Dialog
          className={Classes.DARK}
          icon="crown"
          onClose={this.licenseActivatedClose}
          isOpen={licenseActivatedOpen}
          title="Premium version"
        >
          <div className={Classes.DIALOG_BODY}>
            <p>
              Congratulations! You successfully activated your premium license.
              The premium functions have been enabled. Use it well.
            </p>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                onClick={this.licenseActivatedClose}
                intent={Intent.PRIMARY}
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default Menu;
