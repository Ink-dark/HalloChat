const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const log = require('electron-log');

// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// 模拟服务器发现
ipcMain.handle('discover-servers', async () => {
  log.info('正在搜索局域网服务器...');
  // 实际应用中应实现真实的服务器发现逻辑
  return [{
    id: 'local-server',
    name: '本地服务器',
    address: 'localhost',
    port: 3000
  }];
});

// 暴露日志接口
ipcMain.on('log', (event, level, message) => {
  if (log[level]) {
    log[level](message);
  }
});

// 暴露对话框接口
ipcMain.on('show-error-box', (event, title, content) => {
  dialog.showErrorBox(title, content);
});
const path = require('path');

// 创建窗口函数
function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    enableRemoteModule: true
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // 加载React开发服务器
  mainWindow.loadURL('http://localhost:3000');

  // 暂时禁用自动打开开发者工具以解决Autofill API错误
  // mainWindow.webContents.openDevTools();
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当点击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});