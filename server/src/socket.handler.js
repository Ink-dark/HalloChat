const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { redisClient } = require('./redis');
const UserModel = require('./models/user.model');
const Friend = require('./models/Friend');
const { config } = require('../config/index');
const logger = require('./utils/logger');

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      methods: config.cors.methods,
      credentials: config.cors.credentials
    },
    pingTimeout: 60000,
    maxHttpBufferSize: 1e8
  });

  // JWT 认证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('未提供认证令牌'));

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await UserModel.findById(decoded.id);
      if (!user) return next(new Error('无效的用户凭证'));
      socket.user = user;
      logger.info(`User ${user.username} connected via Socket.IO`);
      next();
    } catch (err) {
      logger.error('Socket.IO authentication error:', err);
      next(new Error('认证失败'));
    }
  });

  io.on('connection', async (socket) => {
    // 记录用户在线状态
    await redisClient.set(`user:${socket.user.id}:online`, 'true');

    // 获取好友列表并通知在线好友
    const friends = await UserModel.getFriends(socket.user.id);
    const onlineFriends = [];
    for (const friend of friends) {
      const isOnline = await redisClient.get(`user:${friend.id}:online`);
      if (isOnline) onlineFriends.push(friend.id);
    }
    socket.emit('friends-online', onlineFriends);

    // 通知好友自己上线
    onlineFriends.forEach(friendId => {
      io.to(`user:${friendId}`).emit('friend-online', socket.user.id);
    });

    // 获取待处理的好友请求
    socket.on('get-pending-friend-requests', async () => {
      try {
        const pendingRequests = await Friend.getPendingRequests(socket.user.id);
        socket.emit('pending-friend-requests', pendingRequests);
      } catch (error) {
        logger.error('获取待处理好友请求错误:', error);
        socket.emit('error', { message: '获取好友请求失败' });
      }
    });

    // 发送好友请求通知
    socket.on('friend-request-sent', async (data) => {
      try {
        const { recipientId, requestId } = data;
        // 通知接收者
        io.to(`user:${recipientId}`).emit('new-friend-request', {
          requestId,
          fromUserId: socket.user.id,
          fromUsername: socket.user.username,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('发送好友请求通知错误:', error);
      }
    });

    // 好友请求被接受
    socket.on('friend-request-accepted', async (data) => {
      try {
        const { requestId, friendId } = data;
        // 通知请求发送者
        io.to(`user:${socket.user.id}`).emit('friend-request-accepted', {
          requestId,
          friendId,
          acceptedBy: socket.user.id,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('好友请求接受通知错误:', error);
      }
    });

    // 好友请求被拒绝
    socket.on('friend-request-rejected', async (data) => {
      try {
        const { requestId } = data;
        // 通知请求发送者
        io.to(`user:${socket.user.id}`).emit('friend-request-rejected', {
          requestId,
          rejectedBy: socket.user.id,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('好友请求拒绝通知错误:', error);
      }
    });

    // 好友关系删除
    socket.on('friend-removed', async (data) => {
      try {
        const { friendId, friendUserId } = data;
        // 通知被删除的好友
        io.to(`user:${friendUserId}`).emit('friend-removed', {
          friendId,
          removedBy: socket.user.id,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('好友删除通知错误:', error);
      }
    });

    // 加入个人房间
    socket.join(`user:${socket.user.id}`);

    // 处理下线事件
    socket.on('disconnect', async () => {
      await redisClient.del(`user:${socket.user.id}:online`);
      // 通知好友自己下线
      friends.forEach(friend => {
        io.to(`user:${friend.id}`).emit('friend-offline', socket.user.id);
      });
    });
  });

  return io;
};