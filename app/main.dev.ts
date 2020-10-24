/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
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
import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import chokidar from 'chokidar';
import sourceMapSupport from 'source-map-support';
import MenuBuilder from './menu';

let mainWindow: BrowserWindow | null = null;

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

autoUpdater.on('error', error => {
  log.error(`Autoupdate failed: ${error}`);
});

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

function copyFolderRecursiveSync(source, target) {
  let files = [];

  // check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(file => {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        fs.copyFileSync(curSource, path.join(targetFolder, file));
      }
    });
  }
}

function deleteFolderRecursive(folder) {
  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach(file => {
      const curPath = path.join(folder, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folder);
  }
}

const appConfig = new Store();

function windowStateKeeper(windowName) {
  let window;
  let windowState;
  function setBounds() {
    // Restore from appConfig
    if (appConfig.has(`windowState.${windowName}`)) {
      windowState = appConfig.get(`windowState.${windowName}`);
      return;
    }
    // Default
    windowState = {
      x: undefined,
      y: undefined,
      width: 1366,
      height: 768
    };
  }
  function saveState() {
    if (!windowState.isMaximized) {
      windowState = window.getBounds();
    }
    windowState.isMaximized = window.isMaximized();
    appConfig.set(`windowState.${windowName}`, windowState);
  }
  function track(win) {
    window = win;
    ['resize', 'move', 'close'].forEach(event => {
      win.on(event, saveState);
    });
  }
  setBounds();
  return {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    isMaximized: windowState.isMaximized,
    track
  };
}

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = request.url.replace('file:///', '');
    callback(pathname);
  });

  const mainWindowStateKeeper = windowStateKeeper('main');

  mainWindow = new BrowserWindow({
    title: 'Loreshelf',
    show: false,
    darkTheme: true,
    x: mainWindowStateKeeper.x,
    y: mainWindowStateKeeper.y,
    width: mainWindowStateKeeper.width,
    height: mainWindowStateKeeper.height,
    icon: path.join(__dirname, `resources${path.sep}icon.png`),
    webPreferences:
      process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
        ? {
            nodeIntegration: true,
            enableRemoteModule: true,
            spellcheck: false
          }
        : {
            nodeIntegration: true, // TODO: change to false, more needs to be setup!
            // contextIsolation: true, // protect against prototype pollution
            // enableRemoteModule: false // turn off remote
            // ,preload: path.join(__dirname, '/dist/renderer.prod.js')
            enableRemoteModule: true,
            spellcheck: false
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

  mainWindowStateKeeper.track(mainWindow);

  let watcher = null;
  let boardWatcher = null;
  const watcherOptions = {
    depth: 0,
    awaitWriteFinish: true,
    ignorePermissionErrors: true
  };
  const initializeWatcher = workspacePath => {
    watcher = chokidar.watch(workspacePath, watcherOptions);
    watcher.on('unlinkDir', removedWorkspacePath => {
      mainWindow.webContents.send(
        'event-workspace-removed',
        removedWorkspacePath
      );
      watcher.unwatch(removedWorkspacePath);
    });
    watcher.on('add', boardPath => {
      if (boardPath.endsWith('.md')) {
        mainWindow.webContents.send('event-board-added', boardPath);
      }
    });
    watcher.on('unlink', removedBoardPath => {
      if (removedBoardPath.endsWith('.md')) {
        mainWindow.webContents.send('event-board-removed', removedBoardPath);
      }
    });
  };

  const workspaceLoadFunc = (
    event,
    workspacePath,
    shouldSetWorkspace,
    openBoardPath
  ) => {
    fs.access(workspacePath, fs.constants.W_OK, err => {
      const readonly = err != null;
      if (watcher == null) {
        initializeWatcher(workspacePath);
      } else {
        watcher.add(workspacePath);
      }
      fs.readdir(workspacePath, (err2, files) => {
        const stats = [];
        if (files) {
          files.forEach(filePath => {
            stats.push(fs.statSync(`${workspacePath}${path.sep}${filePath}`));
          });
          event.reply(
            'workspace-load-callback',
            workspacePath,
            files,
            stats,
            shouldSetWorkspace,
            openBoardPath,
            readonly
          );
        }
      });
    });
  };

  ipcMain.on(
    'places-exist',
    (event, workspaceOnStartup, boardOnStartup, workspaces) => {
      const workspaceOnStartupExist =
        workspaceOnStartup && fs.existsSync(workspaceOnStartup)
          ? workspaceOnStartup
          : null;
      const boardOnStartupExist =
        boardOnStartup && fs.existsSync(boardOnStartup) ? boardOnStartup : null;
      const existingWorkspaces = [];
      if (workspaces) {
        workspaces.forEach(w => {
          if (fs.existsSync(w)) {
            existingWorkspaces.push(w);
          }
        });
      }
      const loreshelfDocsWorkspacePath =
        process.env.NODE_ENV === 'development'
          ? path.join(__dirname, `workspaces${path.sep}Loreshelf Docs`)
          : path.join(
              process.resourcesPath,
              `workspaces${path.sep}Loreshelf Docs`
            );
      event.reply(
        'places-exist-callback',
        app.getVersion(),
        workspaceOnStartupExist,
        boardOnStartupExist,
        existingWorkspaces,
        loreshelfDocsWorkspacePath
      );
    }
  );

  ipcMain.on('get-started', event => {
    const getStartedWorkspacePath =
      process.env.NODE_ENV === 'development'
        ? path.join(__dirname, `workspaces${path.sep}Get Started`)
        : path.join(process.resourcesPath, `workspaces${path.sep}Get Started`);
    const getStartedWorkspacePathTarget = path.join(
      app.getPath('userData'),
      'workspaces'
    );
    const getStartedWorkspacePathFinal = path.join(
      getStartedWorkspacePathTarget,
      'Get Started'
    );
    if (!fs.existsSync(getStartedWorkspacePathTarget)) {
      fs.mkdirSync(getStartedWorkspacePathTarget);
    }
    if (fs.existsSync(getStartedWorkspacePathFinal)) {
      deleteFolderRecursive(getStartedWorkspacePathFinal);
    }
    copyFolderRecursiveSync(
      getStartedWorkspacePath,
      getStartedWorkspacePathTarget
    );
    workspaceLoadFunc(event, getStartedWorkspacePathFinal, true, null);
  });

  ipcMain.on('workspace-add', event => {
    const options = {
      title: 'Add and open a workspace',
      buttonLabel: 'Open workspace',
      properties: [
        'openDirectory',
        'createDirectory',
        'promptToCreate',
        'treatPackageAsDirectory',
        'dontAddToRecent'
      ]
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (!data.canceled) {
        const workspacePath = data.filePaths[0];
        fs.access(workspacePath, fs.constants.W_OK, err => {
          const readonly = err != null;
          if (watcher == null) {
            initializeWatcher(workspacePath);
          } else {
            watcher.add(workspacePath);
          }
          fs.readdir(workspacePath, (err2, files) => {
            if (!err2) {
              const stats = [];
              files.forEach(filePath => {
                stats.push(
                  fs.statSync(`${workspacePath}${path.sep}${filePath}`)
                );
              });
              event.reply(
                'workspace-add-callback',
                workspacePath,
                files,
                stats,
                readonly
              );
            }
          });
        });
      }
    });
  });

  ipcMain.on('workspace-add-zip', event => {
    const options = {
      title: 'Add and open a secured workspace',
      buttonLabel: 'Open workspace',
      filters: [{ name: 'Archive', extensions: ['zip'] }],
      properties: ['openFile']
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (!data.canceled) {
        const workspacePath = data.filePaths[0];
        fs.readFile(workspacePath, (err, zipdata) => {
          if (!err) {
            event.reply('workspace-add-zip-callback', workspacePath, zipdata);
          }
        });
      }
    });
  });

  ipcMain.on('new-zip-select', event => {
    const options = {
      title: 'Create new secured workspace',
      buttonLabel: 'Create workspace',
      filters: [{ name: 'Archive', extensions: ['zip'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation']
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showSaveDialog(mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (!data.canceled) {
        let workspacePath = data.filePath;
        if (!workspacePath?.endsWith('.zip')) {
          workspacePath += '.zip';
        }
        event.reply('new-zip-select-callback', workspacePath);
      }
    });
  });

  ipcMain.on('workspace-load', workspaceLoadFunc);

  ipcMain.on(
    'workspace-secured-load',
    (event, workspacePath, shouldSetWorkspace, openBoardPath) => {
      fs.readFile(workspacePath, (err, zipdata) => {
        if (!err) {
          event.reply(
            'workspace-secured-load-callback',
            workspacePath,
            zipdata,
            shouldSetWorkspace,
            openBoardPath
          );
        }
      });
    }
  );

  ipcMain.on('board-read', (event, boardMeta) => {
    const text = fs.readFileSync(boardMeta.path, 'utf8');
    const stats = fs.statSync(boardMeta.path);
    if (boardWatcher != null) {
      boardWatcher.close();
    }
    boardWatcher = chokidar.watch(boardMeta.path, { alwaysStat: true });
    boardWatcher.on('change', (modifiedBoardPath, modifiedStats) => {
      mainWindow.webContents.send(
        'event-board-modified',
        modifiedBoardPath,
        modifiedStats
      );
    });
    event.reply('board-read-callback', boardMeta, text, stats);
  });

  ipcMain.on('workspace-close', (event, workspacePath) => {
    watcher.unwatch(workspacePath);
    event.reply('workspace-close-callback', workspacePath);
  });

  ipcMain.on(
    'board-save',
    (event, boardPath, boardContent, isNew?, isInBackground?) => {
      try {
        fs.writeFileSync(boardPath, boardContent, 'utf8');
        const stats = fs.statSync(boardPath);
        if (isNew) {
          event.reply('board-new-callback', boardPath);
        } else if (!isInBackground) {
          event.reply('board-save-callback', stats);
        }
      } catch (error) {
        if (isNew) {
          event.reply('board-new-callback', null);
        } else if (!isInBackground) {
          event.reply('board-save-callback', null);
        }
      }
    }
  );

  ipcMain.on(
    'board-secured-save',
    (
      event,
      workspacePath,
      boardPath,
      zipdata,
      isNew?,
      isInBackground?,
      deleted?
    ) => {
      fs.writeFileSync(workspacePath, zipdata, 'binary');
      if (deleted) {
        event.reply('board-delete-callback', boardPath);
      } else if (isNew) {
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

  ipcMain.on(
    'board-move-to-workspace',
    (event, boardName, boardPath, targetWorkspacePath) => {
      const newBoardPath = `${targetWorkspacePath}${path.sep}${boardName}.md`;
      if (fs.existsSync(newBoardPath)) {
        event.reply(
          'board-move-to-workspace-callback',
          boardPath,
          null,
          targetWorkspacePath
        );
      } else {
        fs.renameSync(boardPath, newBoardPath);
        event.reply(
          'board-move-to-workspace-callback',
          boardPath,
          newBoardPath,
          targetWorkspacePath
        );
      }
    }
  );

  ipcMain.on('board-rename', (event, oldBoardPath, newBoardPath) => {
    fs.renameSync(oldBoardPath, newBoardPath);
    event.reply('board-rename-callback', oldBoardPath, newBoardPath);
  });

  ipcMain.on(
    'board-spooling-load',
    (event, boardPath, spoolingCardIndex?, cardName?) => {
      if (fs.existsSync(boardPath)) {
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
      } else {
        event.reply('board-spooling-data', boardPath, null, null, null, null);
      }
    }
  );

  ipcMain.on('file-link', (event, baseHref, filters?) => {
    const options = {
      title: 'Add file link',
      buttonLabel: 'Add file link',
      properties: ['openFile'],
      filters
    };
    // eslint-disable-next-line promise/catch-or-return
    dialog.showOpenDialog(mainWindow, options).then(data => {
      // eslint-disable-next-line promise/always-return
      if (data.canceled) {
        event.returnValue = undefined;
      } else {
        const relativePath = path.relative(
          baseHref,
          `file://${data.filePaths[0]}`
        );
        event.returnValue = relativePath;
      }
    });
  });

  ipcMain.on('export-pdf', (event, boardName, htmlSource) => {
    const winPDF = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        webSecurity: false
      }
    });
    winPDF.webContents.loadURL(
      `data:text/html;charset=utf-8;base64,${Buffer.from(htmlSource).toString(
        'base64'
      )}`
    );
    winPDF.on('ready-to-show', () => {
      const options = {
        title: 'Save PDF',
        defaultPath: `${boardName}.pdf`,
        buttonLabel: 'Save',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      };
      // eslint-disable-next-line promise/catch-or-return
      dialog.showSaveDialog(mainWindow, options).then(data => {
        // eslint-disable-next-line promise/always-return
        if (data.canceled) {
          winPDF.close();
        } else {
          let pdfPath = data.filePath;
          if (!pdfPath?.endsWith('.pdf')) {
            pdfPath += '.pdf';
          }
          // eslint-disable-next-line promise/no-nesting
          winPDF.webContents
            .printToPDF({
              printBackground: true,
              pageSize: 'A4',
              scaleFactor: 100,
              landscape: false
            })
            .then(pdfData => {
              fs.writeFile(pdfPath, pdfData, error => {
                if (error) throw error;
              });
              winPDF.close();
            })
            .catch(error => {
              log.error(`Exporting to PDF failed: ${error}`);
            });
        }
      });
    });
  });

  let autoUpdateCheck = false;

  ipcMain.on('update-check', (event, auto) => {
    autoUpdateCheck = auto;
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('update-download', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('update-install', () => {
    setImmediate(() => autoUpdater.quitAndInstall());
  });

  ipcMain.on('refresh-and-save', () => {
    mainWindow.webContents.send('refresh-and-save-callback');
  });

  autoUpdater.on('update-available', info => {
    mainWindow.webContents.send(
      'update-check-callback',
      info.version,
      autoUpdateCheck
    );
    autoUpdateCheck = false;
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-check-callback', null, autoUpdateCheck);
    autoUpdateCheck = false;
  });

  autoUpdater.on('update-downloaded', () => {
    if (process.env.DESKTOPINTEGRATION === 'AppImageLauncher') {
      process.env.APPIMAGE = process.env.ARGV0;
    }
    mainWindow.webContents.send('update-download-callback');
  });

  mainWindow.on('close', () => {
    mainWindow.webContents.send('remember-last-notebook');
    mainWindow.webContents.send('board-save');
    if (watcher != null) {
      watcher.close();
    }
    if (boardWatcher != null) {
      boardWatcher.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(app, mainWindow);
  menuBuilder.buildMenu();

  if (process.argv.length > 1) {
    setTimeout(() => {
      log.info(`Request to start Loreshelf with ${process.argv[1]}`);
      mainWindow.webContents.send('start', process.argv[1]);
    }, 500);
  }

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

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  log.info(`filePath: ${filePath}`);
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
