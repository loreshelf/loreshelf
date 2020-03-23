/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
/* eslint @typescript-eslint/ban-ts-ignore: off */
import { Menu, BrowserWindow, dialog, ipcMain } from 'electron';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    ipcMain.on('workspace-new', event => {
      self.addAndOpenWorkspace(event);
    });

    ipcMain.on('file-link', event => {
      self.addFileLink(event);
      // eslint-disable-next-line no-param-reassign
      // event.returnValue = 'ahoj';
    });
  }

  openBoard() {
    const options = {
      title: 'Open a file or folder',
      // defaultPath: '/path/to/something/',
      buttonLabel: 'Open',
      filters: [{ extensions: ['md'] }],
      properties: ['openFile']
    };
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(this.mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (data.canceled) {
        console.log('No file selected');
      } else {
        self.mainWindow.webContents.send('board-load', data.filePaths[0]);
      }
    });
  }

  addFileLink(event) {
    const options = {
      title: 'Add file link',
      buttonLabel: 'Add file link',
      properties: ['openFile']
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(this.mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (data.canceled) {
        console.log('No file selected');
        // eslint-disable-next-line no-restricted-globals
        event.returnValue = undefined;
      } else {
        // eslint-disable-next-line no-restricted-globals
        event.returnValue = data.filePaths[0];
      }
    });
  }

  addAndOpenWorkspace(event) {
    const options = {
      title: 'Add and open a workspace',
      buttonLabel: 'Open workspace',
      properties: ['openDirectory']
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(this.mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (data.canceled) {
        console.log('No file selected');
      } else {
        event.reply('workspace-load', data.filePaths[0]);
      }
    });
  }

  saveBoard() {
    this.mainWindow.webContents.send('board-save');
  }

  buildMenu() {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();

      const template = this.buildDevTemplate();
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      return menu;
    }
    Menu.setApplicationMenu(null);
    return null;
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          }
        }
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDevTemplate() {
    const templateDefault = [
      {
        label: '&View',
        submenu: [
          {
            label: '&Reload',
            accelerator: 'Ctrl+R',
            click: () => {
              this.mainWindow.webContents.reload();
            }
          },
          {
            label: 'Toggle &Developer Tools',
            accelerator: 'Alt+Ctrl+I',
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            }
          }
        ]
      }
    ];

    return templateDefault;
  }
}
