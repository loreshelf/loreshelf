/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
/* eslint @typescript-eslint/ban-ts-ignore: off */
import { Menu, BrowserWindow, shell, ipcMain } from 'electron';
import os from 'os';

export default class MenuBuilder {
  mainWindow: BrowserWindow;
  app;

  constructor(app, mainWindow: BrowserWindow) {
    this.app = app;
    this.mainWindow = mainWindow;
  }

  buildMenu() {
    if (process.platform === 'darwin') {
      const template = this.buildMacTemplate();
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      return menu;
    }
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      const template = this.buildDevTemplate();
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      return menu;
    }
    Menu.setApplicationMenu(null);
    return null;
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

  buildMacTemplate() {
    const result = [];
    const updates = os.platform() !== 'darwin' ? [{
      label: 'Check for updates',
      click: () => {
        ipcMain.emit('update-check', false);
      }
    }] : [];
    return [{
      label: 'Loreshelf',
      submenu: [{
        label: 'About Loreshelf',
        selector: 'orderFrontStandardAboutPanel:'
      }].concat(updates).concat([{
        label: 'License',
        click: () => {
          this.mainWindow.webContents.send('license-open');
        }
      }, {
        type: 'separator'
      }, {
        label: 'Preferences',
        click: () => {
          this.mainWindow.webContents.send('preferences-open');
        }
      }, {
        type: 'separator'
      }, {
        label: 'Hide ElectronReact',
        accelerator: 'Command+H',
        selector: 'hide:'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        selector: 'hideOtherApplications:'
      }, {
        label: 'Show All',
        selector: 'unhideAllApplications:'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          this.app.quit();
        }
      }])
    }, {
      label: 'Edit',
      submenu: [{
        label: 'Cut',
        accelerator: 'Command+X',
        selector: 'cut:'
      }, {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      }, {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      }, {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      }]
    }, {
      label: 'View',
      submenu: (process.env.NODE_ENV === 'development') ? [{
        label: 'Reload',
        accelerator: 'Command+R',
        click: () => {
          this.mainWindow.webContents.reload();
        }
      }, {
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click: () => {
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
        }
      }, {
        label: 'Toggle Developer Tools',
        accelerator: 'Alt+Command+I',
        click: () => {
          this.mainWindow.toggleDevTools();
        }
      }] : [{
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click: () => {
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
        }
      }]
    }, {
      label: 'Window',
      submenu: [{
        label: 'Minimize',
        accelerator: 'Command+M',
        selector: 'performMiniaturize:'
      }, {
        label: 'Close',
        accelerator: 'Command+W',
        selector: 'performClose:'
      }, {
        type: 'separator'
      }, {
        label: 'Bring All to Front',
        selector: 'arrangeInFront:'
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Homepage',
        click: () => {
          shell.openExternal('https://loreshelf.com');
        }
      }, {
        label: 'Reddit',
        click: () => {
          shell.openExternal('https://www.reddit.com/r/Loreshelf');
        }
      }]
    }];
  }
}
