const express = require('express');
const router = express.Router();

// 导入各个路由模块
const apiRoutes = require('./api');
const authRoutes = require('./auth');
const messageRoutes = require('./messages');
const groupRoutes = require('./groups');
const channelRoutes = require('./channels');
const friendRoutes = require('./friends');

// 挂载各个路由
router.use('/api', apiRoutes); // API路由
router.use('/auth', authRoutes); // 认证路由
router.use('/messages', messageRoutes); // 消息路由
router.use('/groups', groupRoutes); // 群组路由
router.use('/channels', channelRoutes); // 频道路由
router.use('/friends', friendRoutes); // 好友路由

// 健康检查路由
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 404 处理
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `无法找到路径: ${req.originalUrl}`
  });
});

module.exports = router;