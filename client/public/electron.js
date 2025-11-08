// 这是一个桥接文件，用于解决electron-builder寻找public/electron.js的问题
// 实际的主进程代码位于client/electron-main.js
require('../electron-main.js');