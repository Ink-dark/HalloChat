const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../db');
const UserModel = require('./models/user.model').default;

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  // JWT 认证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('未提供认证令牌'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await UserModel.login(decoded.username, decoded.password);
      if (!user) return next(new Error('无效的用户凭证'));
      socket.user = user;
      next();
    } catch (err) {
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