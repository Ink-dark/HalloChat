const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 初始化配置输入框
window.onload = () => {
  const configPath = path.join(__dirname, '../../config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  document.getElementById('port').value = config.port;
  document.getElementById('maxConnections').value = config.maxConnections;
  document.getElementById('forceLogoutEnabled').checked = config.forceLogoutEnabled;
};

// 启动服务
document.getElementById('startBtn').addEventListener('click', () => {
  ipcRenderer.send('start-server');
});

// 停止服务
document.getElementById('stopBtn').addEventListener('click', () => {
  ipcRenderer.send('stop-server');
});

// 保存配置
document.getElementById('saveConfig').addEventListener('click', () => {
  const newConfig = {
    port: parseInt(document.getElementById('port').value),
    maxConnections: parseInt(document.getElementById('maxConnections').value),
    forceLogoutEnabled: document.getElementById('forceLogoutEnabled').checked,
    logLevel: 'info', // 可扩展为输入框
    ssl: { enabled: false } // 可扩展为输入框
  };
  ipcRenderer.send('save-config', newConfig);
});

// 监听服务状态更新
ipcRenderer.on('server-status', (event, status) => {
  document.getElementById('status').textContent = `服务状态：${status}`;
});