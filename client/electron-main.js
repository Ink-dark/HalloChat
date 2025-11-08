// 导入必要的模块
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const fs = require('fs');

// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// 窗口配置文件路径
const windowConfigPath = path.join(app.getPath('userData'), 'window-config.json');

// 加载窗口配置
function loadWindowConfig() {
  try {
    if (fs.existsSync(windowConfigPath)) {
      return JSON.parse(fs.readFileSync(windowConfigPath, 'utf8'));
    }
  } catch (error) {
    log.error('加载窗口配置失败:', error);
  }
  return {};
}

// 保存窗口配置
function saveWindowConfig(windowName, bounds) {
  try {
    const config = loadWindowConfig();
    config[windowName] = bounds;
    fs.writeFileSync(windowConfigPath, JSON.stringify(config, null, 2));
  } catch (error) {
    log.error('保存窗口配置失败:', error);
  }
}

// 全局引用，防止窗口被垃圾回收
let loginWindow = null;
let mainWindow = null;

// 创建登录窗口
function createLoginWindow() {
  const config = loadWindowConfig();
  const loginConfig = config.login || {};
  
  loginWindow = new BrowserWindow({
    ...loginConfig,
    width: loginConfig.width || 650,
    height: loginConfig.height || 700,
    minWidth: 500,
    minHeight: 600,
    title: 'HalloChat - 登录',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false, // 临时禁用webSecurity以解决可能的CSP问题
      allowRunningInsecureContent: true // 允许加载HTTP内容（仅开发环境）
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // 加载URL或文件
  try {
    log.info('应用运行模式:', app.isPackaged ? '打包模式' : '开发模式');
    log.info('当前目录:', __dirname);
    
    // 根据应用是否打包决定加载方式
  // 开发模式下使用开发服务器，打包模式下使用构建文件
  const forceLocalFile = app.isPackaged;
    
    if (forceLocalFile) {
      // 打包模式下，文件路径可能不同
      // 尝试多种可能的路径
      const possiblePaths = [
        path.join(__dirname, 'build', 'index.html'),
        path.join(process.resourcesPath, 'build', 'index.html'),
        path.join(__dirname, '..', 'build', 'index.html')
      ];
      
      // 尝试找到有效的文件路径
      let foundPath = null;
      for (const p of possiblePaths) {
        log.info('尝试加载文件:', p);
        try {
          // 尝试加载文件，不抛出异常
          loginWindow.loadFile(p, { query: { view: 'login' } });
          foundPath = p;
          break;
        } catch (err) {
          log.warn('文件加载失败:', p, err.message);
        }
      }
      
      if (!foundPath) {
        throw new Error('无法找到有效的index.html文件');
      }
    } else {
      loginWindow.loadURL('http://localhost:3000/?view=login');
    }
  } catch (error) {
    log.error('加载窗口内容失败:', error);
    dialog.showErrorBox('加载失败', '无法加载应用内容: ' + error.message);
    app.quit();
  }

  // 保存窗口大小和位置
  loginWindow.on('resize', () => {
    if (!loginWindow.isMaximized()) {
      saveWindowConfig('login', loginWindow.getBounds());
    }
  });

  loginWindow.on('move', () => {
    if (!loginWindow.isMaximized()) {
      saveWindowConfig('login', loginWindow.getBounds());
    }
  });

  // 登录窗口关闭时退出应用
  loginWindow.on('closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// 创建主窗口
function createMainWindow() {
  const config = loadWindowConfig();
  const mainConfig = config.main || {};
  
  mainWindow = new BrowserWindow({
    ...mainConfig,
    width: mainConfig.width || 1200,
    height: mainConfig.height || 800,
    minWidth: 800,
    minHeight: 600,
    title: 'HalloChat',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false, // 临时禁用webSecurity以解决可能的CSP问题
      allowRunningInsecureContent: true // 允许加载HTTP内容（仅开发环境）
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // 加载URL或文件
  try {
    log.info('创建主窗口 - 应用运行模式:', app.isPackaged ? '打包模式' : '开发模式');
    log.info('创建主窗口 - 当前目录:', __dirname);
    
    // 根据应用是否打包决定加载方式
    // 开发模式下使用开发服务器，打包模式下使用构建文件
    const forceLocalFile = app.isPackaged;
    
    if (forceLocalFile) {
      // 打包模式下，文件路径可能不同
      // 尝试多种可能的路径
      const possiblePaths = [
        path.join(__dirname, 'build', 'index.html'),
        path.join(process.resourcesPath, 'build', 'index.html'),
        path.join(__dirname, '..', 'build', 'index.html')
      ];
      
      // 尝试找到有效的文件路径
      let foundPath = null;
      for (const p of possiblePaths) {
        log.info('尝试加载文件:', p);
        try {
          // 尝试加载文件，不抛出异常
          mainWindow.loadFile(p, { query: { view: 'main' } });
          foundPath = p;
          break;
        } catch (err) {
          log.warn('文件加载失败:', p, err.message);
        }
      }
      
      if (!foundPath) {
        throw new Error('无法找到有效的index.html文件');
      }
    } else {
      mainWindow.loadURL('http://localhost:3000/?view=main');
    }
  } catch (error) {
    log.error('加载窗口内容失败:', error);
    dialog.showErrorBox('加载失败', '无法加载应用内容: ' + error.message);
  }

  // 主窗口关闭时不自动退出应用
  // 保存窗口大小和位置
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowConfig('main', mainWindow.getBounds());
    }
  });

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowConfig('main', mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 监听登录成功事件
ipcMain.on('login-success', (event, userData) => {
  log.info('用户登录成功:', userData);
  
  // 创建主窗口
  createMainWindow();
  
  // 关闭登录窗口
  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }
});

// 监听登出事件
ipcMain.on('logout', () => {
  log.info('用户登出');
  
  // 创建登录窗口
  createLoginWindow();
  
  // 关闭主窗口
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
});

// 模拟服务器发现
ipcMain.handle('discover-servers', async () => {
  log.info('正在搜索局域网服务器...');
  // 实际应用中应实现真实的服务器发现逻辑
  return [{
    id: 'local-server',
    name: '本地服务器',
    address: 'localhost',
    port: 7932
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

// 应用就绪后创建登录窗口
app.whenReady().then(() => {
  try {
    createLoginWindow();
  } catch (error) {
    log.error('创建窗口失败:', error);
    dialog.showErrorBox('启动失败', '无法创建应用窗口: ' + error.message);
  }

  app.on('activate', function () {
    // 在macOS上，当点击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        createLoginWindow();
      } catch (error) {
        log.error('重新激活时创建窗口失败:', error);
        dialog.showErrorBox('启动失败', '无法创建应用窗口: ' + error.message);
      }
    }
  });
});

// 当所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});