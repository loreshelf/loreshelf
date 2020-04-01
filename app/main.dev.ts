/* eslint-disable no-param-reassign */
/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import sourceMapSupport from 'source-map-support';
import MenuBuilder from './menu';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    title: 'Jotspin',
    show: false,
    darkTheme: true,
    width: 1366,
    height: 768,
    icon: path.join(__dirname, '/resources/icon.png'),
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // This is the actual solution
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on('workspace-add', event => {
    const options = {
      title: 'Add and open a workspace',
      buttonLabel: 'Open workspace',
      properties: ['openDirectory']
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (data.canceled) {
        console.log('No file selected');
      } else {
        const workspacePath = data.filePaths[0];
        fs.readdir(workspacePath, (err, files) => {
          event.reply('workspace-add-callback', workspacePath, files);
        });
      }
    });
  });

  ipcMain.on(
    'workspace-load',
    (event, workspacePath, shouldSetWorkspace, openBoardPath) => {
      fs.readdir(workspacePath, (err, files) => {
        event.reply(
          'workspace-load-callback',
          workspacePath,
          files,
          shouldSetWorkspace,
          openBoardPath
        );
      });
    }
  );

  ipcMain.on('board-read', (event, boardMeta) => {
    const text = fs.readFileSync(boardMeta.path, 'utf8');
    const stats = fs.statSync(boardMeta.path);
    event.reply('board-read-callback', boardMeta, text, stats);
  });

  ipcMain.on(
    'board-save',
    (event, boardPath, boardContent, isNew?, isInBackground?) => {
      fs.writeFileSync(boardPath, boardContent, 'utf8');
      if (isNew) {
        event.reply('board-new-callback', boardPath);
      } else if (!isInBackground) {
        event.reply('board-save-callback');
      }
    }
  );

  ipcMain.on('board-delete', (event, boardPath) => {
    fs.unlinkSync(boardPath);
    event.reply('board-delete-callback', boardPath);
  });

  ipcMain.on('board-move-card', (event, boardPath, title, cardContent) => {
    const text = fs.readFileSync(boardPath, 'utf8');
    const newBoardContent = `${text}\n\n# ${title}\n\n${cardContent.trim()}`;
    fs.writeFileSync(boardPath, newBoardContent, 'utf8');
  });

  ipcMain.on('board-rename', (event, oldBoardPath, newBoardPath) => {
    fs.renameSync(oldBoardPath, newBoardPath);
    event.reply('board-rename-callback', oldBoardPath, newBoardPath);
  });

  ipcMain.on(
    'board-spooling-load',
    (event, boardPath, spoolingCardIndex?, cardName?) => {
      const boardContent = fs.readFileSync(boardPath, 'utf8');
      const stats = fs.statSync(boardPath);
      event.reply(
        'board-spooling-data',
        boardPath,
        boardContent,
        stats,
        spoolingCardIndex,
        cardName
      );
    }
  );

  ipcMain.on('file-link', event => {
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
        // eslint-disable-next-line prefer-destructuring
        event.returnValue = data.filePaths[0];
      }
    });
  });

  mainWindow.on('close', () => {
    mainWindow.webContents.send('board-save');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
