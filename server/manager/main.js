const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess;

// 创建窗口
function createWindow() {
  const win = new BrowserWindow({ width: 800, height: 600, webPreferences: { nodeIntegration: true } });
  win.loadFile('renderer/index.html');
}

// 启动服务端
ipcMain.on('start-server', (event) => {
  const configPath = path.join(__dirname, '../config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  serverProcess = spawn('node', [path.join(__dirname, '../src/index.js')], { cwd: path.join(__dirname, '..') });
  event.reply('server-status', 'running');
});

// 停止服务端
ipcMain.on('stop-server', (event) => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  event.reply('server-status', 'stopped');
});

// 保存配置
ipcMain.on('save-config', (event, newConfig) => {
  const configPath = path.join(__dirname, '../config.json');
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  event.reply('config-saved', true);
});

app.whenReady().then(createWindow);