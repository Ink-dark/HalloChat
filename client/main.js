const log = require('electron-log');

// 配置日志路径（Windows默认：%USERPROFILE%/AppData/Roaming/HalloChat/logs）
log.transports.file.resolvePath = () => {
  return path.join(app.getPath('userData'), 'logs', 'hallochat-%DATE%.log');
};

// 配置格式（时间戳+级别+内容）
log.transports.file.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

// 设置单文件最大5MB，保留7天日志
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.archiveLog = (logPath) => {
  // 可选：自动上传日志到服务端（需用户授权）
  if (userAgreedToUpload) {
    uploadLogToServer(logPath);
  }
};

const win = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    enableRemoteModule: true
  },
  icon: path.join(__dirname, 'public/favicon.ico')
})