import React from 'react';
import { ContextMenuTarget, Menu, MenuItem, Button } from '@blueprintjs/core';

const BoardMenuItem = ContextMenuTarget(
  class BoardMenuItemWithContext extends React.Component<{}, {}> {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(props) {
      super(props);
    }

    // eslint-disable-next-line class-methods-use-this
    public onContextMenuClose() {
      // Optional method called once the context menu is closed.
    }

    public renderContextMenu() {
      // return a single element, or nothing to use default browser behavior
      return (
        <Menu>
          <MenuItem onClick={this.handleSave} text="Save" />
          <MenuItem onClick={this.handleDelete} text="Delete" />
        </Menu>
      );
    }

    public render() {
      const { children, onClick, active } = this.props;
      // root element must support `onContextMenu`
      return (
        <Button active={active} key="selectedBoard" onClick={onClick}>
          {children}
        </Button>
      );
    }
  }
);

export default BoardMenuItem;
