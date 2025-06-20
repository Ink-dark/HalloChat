const { app, BrowserWindow } = require('electron');
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

  // 打开开发者工具
  mainWindow.webContents.openDevTools();
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