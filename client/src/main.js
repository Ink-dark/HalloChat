const { app, BrowserWindow, ipcMain } = require('electron')
const mdns = require('mdns')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

// MDNS服务发现
ipcMain.handle('discover-servers', async () => {
  return new Promise((resolve) => {
    const browser = mdns.createBrowser(mdns.tcp('hallo-chat'))
    const servers = []
    
    browser.on('serviceUp', (service) => {
      servers.push({
        address: service.addresses[0],
        port: service.port,
        name: service.name
      })
    })
    
    browser.on('ready', () => {
      browser.discover()
      // 3秒后返回结果
      setTimeout(() => {
        browser.stop()
        resolve(servers)
      }, 3000)
    })
  })
})

app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})