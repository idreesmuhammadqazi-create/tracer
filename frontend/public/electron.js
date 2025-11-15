const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess;

// Python backend integration
function startPythonBackend() {
  const pythonScript = path.join(__dirname, '../../backend/main.py');
  const pythonExecutable = process.platform === 'win32' ? 'python.exe' : 'python3';

  console.log('Starting Python backend:', pythonScript);

  pythonProcess = spawn(pythonExecutable, [pythonScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '../../backend')
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log('Python stdout:', data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Python stderr:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });

  return pythonProcess;
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          }
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'LowLogic Files', extensions: ['ll', 'lowlogic'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled) {
              const fileContent = fs.readFileSync(result.filePaths[0], 'utf8');
              mainWindow.webContents.send('menu-open-file', {
                content: fileContent,
                path: result.filePaths[0]
              });
            }
          }
        },
        {
          label: 'Save File',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            mainWindow.webContents.send('menu-save-file');
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            mainWindow.webContents.send('menu-save-as');
          }
        },
        { type: 'separator' },
        {
          label: 'Export C++',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-cpp');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Run',
      submenu: [
        {
          label: 'Run Program',
          accelerator: 'F5',
          click: () => {
            mainWindow.webContents.send('menu-run');
          }
        },
        {
          label: 'Step Over',
          accelerator: 'F10',
          click: () => {
            mainWindow.webContents.send('menu-step');
          }
        },
        {
          label: 'Continue',
          accelerator: 'F5',
          click: () => {
            mainWindow.webContents.send('menu-continue');
          }
        },
        {
          label: 'Stop',
          accelerator: 'Shift+F5',
          click: () => {
            mainWindow.webContents.send('menu-stop');
          }
        },
        {
          label: 'Reset',
          accelerator: 'Ctrl+Shift+F5',
          click: () => {
            mainWindow.webContents.send('menu-reset');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LowLogic',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LowLogic',
              message: 'LowLogic - Traceable Low-Level Mode',
              detail: 'Version 1.0.0\n\nA lightweight sandbox environment for algorithm researchers to test logic at a low level without full C++ syntax.'
            });
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/lowlogic/docs');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  // Start Python backend
  startPythonBackend();

  // Create window
  createWindow();

  // Create menu
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close Python process
  if (pythonProcess) {
    pythonProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close Python process
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Handle file operations from renderer
ipcMain.handle('save-file', async (event, { content, filePath }) => {
  try {
    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'program.lowlogic',
        filters: [
          { name: 'LowLogic Files', extensions: ['ll', 'lowlogic'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      filePath = result.filePath;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'program.lowlogic',
    filters: [
      { name: 'LowLogic Files', extensions: ['ll', 'lowlogic'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result;
});

ipcMain.handle('show-export-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'program.cpp',
    filters: [
      { name: 'C++ Files', extensions: ['cpp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result;
});