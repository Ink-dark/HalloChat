require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const mdns = require('mdns-js');
const logger = require('./utils/logger');

// 导入配置
const config = require('./config/config');

// 创建Express应用
const app = express();

// 配置CORS
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 创建HTTP服务器
const server = http.createServer(app);

// 中间件配置
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 导入路由
const routes = require('./routes');
app.use('/api', routes);

// 数据库连接
mongoose.connect(config.mongoURI, config.mongoOptions).then(() => {
  logger.info('Connected to MongoDB');
  console.log('Connected to MongoDB');
}).catch(err => {
  logger.error('MongoDB connection error:', err);
  console.error('MongoDB connection error:', err);
});

// 引入数据模型
const Message = require('./models/message.model');
const User = require('./models/user.model');
const Group = require('./models/group.model');
const Channel = require('./models/channel.model');

// Socket.io服务
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 保存用户Socket映射
const userSockets = new Map();

io.on('connection', (socket) => {
  logger.info('a user connected');
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.userId = userId;
    // 存储用户Socket映射
    userSockets.set(userId, socket.id);
    // 加入个人房间
    socket.join(userId);
    logger.info(`User ${userId} connected with socket ID ${socket.id}`);
  }

  socket.on('disconnect', () => {
    logger.info('user disconnected');
    if (socket.userId) {
      userSockets.delete(socket.userId);
      logger.info(`User ${socket.userId} disconnected`);
    }
  });

  // 处理发送消息事件
  socket.on('message', async (data) => {
    console.log('message received:', data);
    try {
      // 创建新消息
      const message = new Message({
        content: data.content,
        type: data.type || 'text',
        sender: socket.userId,
        receiver: data.receiverId || null,
        group: data.groupId || null,
        channel: data.channelId || null
      });

      await message.save();

      // 填充关联数据
      await message.populate([
        { path: 'sender', select: 'username avatar' },
        { path: 'receiver', select: 'username avatar' },
        { path: 'group', select: 'name' },
        { path: 'channel', select: 'name' }
      ]);

      // 发送消息给接收者
      if (data.receiverId) {
        const receiverSocketId = userSockets.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message', message);
        }
        // 发送给自己的确认
        socket.emit('messageStatus', {
          messageId: message._id,
          status: 'sent'
        });
      } 
      // 群组消息
      else if (data.groupId) {
        // 找到群组成员
        const group = await Group.findById(data.groupId).populate('members.user', '_id');
        if (group) {
          // 发送给群组内所有成员
          group.members.forEach(member => {
            const memberSocketId = userSockets.get(member.user._id.toString());
            if (memberSocketId) {
              io.to(memberSocketId).emit('message', message);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // 处理输入状态事件
  socket.on('typing', (data) => {
    if (data.receiverId) {
      const receiverSocketId = userSockets.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', {
          userId: socket.userId,
          isTyping: data.isTyping
        });
      }
    } else if (data.groupId) {
      // 群组输入状态（可选实现）
      io.to(`group_${data.groupId}`).emit('typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
        groupId: data.groupId
      });
    }
  });

  // 处理消息已读事件
  socket.on('read', async (data) => {
    try {
      const message = await Message.findById(data.messageId);
      if (message && message.receiver.toString() === socket.userId) {
        message.isRead = true;
        await message.save();

        // 通知发送者消息已读
        const senderSocketId = userSockets.get(message.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('read', {
            messageId: data.messageId,
            receiverId: socket.userId
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // 处理消息撤回事件
  socket.on('recallMessage', async (data) => {
    try {
      const message = await Message.findById(data.messageId);
      if (message && message.sender.toString() === socket.userId) {
        // 检查是否在可撤回时间内（2分钟）
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (message.createdAt > twoMinutesAgo) {
          message.isRecalled = true;
          await message.save();

          // 通知接收者消息已撤回
          if (message.receiver) {
            const receiverSocketId = userSockets.get(message.receiver.toString());
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('recallMessage', {
                messageId: data.messageId
              });
            }
          } 
          // 群组消息撤回
          else if (message.group) {
            const group = await Group.findById(message.group).populate('members.user', '_id');
            if (group) {
              group.members.forEach(member => {
                const memberSocketId = userSockets.get(member.user._id.toString());
                if (memberSocketId) {
                  io.to(memberSocketId).emit('recallMessage', {
                    messageId: data.messageId
                  });
                }
              });
            }
          }

          socket.emit('recallMessageResponse', { success: true });
        } else {
          socket.emit('recallMessageResponse', { 
            success: false, 
            error: '消息已超过可撤回时间'
          });
        }
      } else {
        socket.emit('recallMessageResponse', { 
          success: false, 
          error: '只能撤回自己的消息'
        });
      }
    } catch (error) {
      console.error('Error recalling message:', error);
      socket.emit('recallMessageResponse', { 
        success: false, 
        error: '撤回消息失败'
      });
    }
  });

  // 处理消息编辑事件
  socket.on('editMessage', async (data) => {
    try {
      const message = await Message.findById(data.messageId);
      if (message && message.sender.toString() === socket.userId) {
        // 检查是否在可编辑时间内（15分钟）
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (message.createdAt > fifteenMinutesAgo && !message.isRecalled) {
          // 保存编辑历史
          if (!message.editHistory) {
            message.editHistory = [];
          }
          message.editHistory.push({
            timestamp: new Date(),
            content: message.content
          });
          
          // 更新消息内容
          message.content = data.newContent;
          message.isEdited = true;
          await message.save();

          // 通知接收者消息已编辑
          if (message.receiver) {
            const receiverSocketId = userSockets.get(message.receiver.toString());
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('editMessage', {
                messageId: data.messageId,
                newContent: data.newContent
              });
            }
          } 
          // 群组消息编辑
          else if (message.group) {
            const group = await Group.findById(message.group).populate('members.user', '_id');
            if (group) {
              group.members.forEach(member => {
                const memberSocketId = userSockets.get(member.user._id.toString());
                if (memberSocketId) {
                  io.to(memberSocketId).emit('editMessage', {
                    messageId: data.messageId,
                    newContent: data.newContent
                  });
                }
              });
            }
          }

          socket.emit('editMessageResponse', { success: true });
        } else {
          socket.emit('editMessageResponse', { 
            success: false, 
            error: message.isRecalled ? '已撤回的消息不能编辑' : '消息已超过可编辑时间'
          });
        }
      } else {
        socket.emit('editMessageResponse', { 
          success: false, 
          error: '只能编辑自己的消息'
        });
      }
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('editMessageResponse', { 
        success: false, 
        error: '编辑消息失败'
      });
    }
  });
});

// 将io实例附加到app对象，以便在路由中使用
app.set('io', io);

const PORT = config.port;

// 启用MDNS服务广播
if (config.mdns && config.mdns.enabled) {
  const ad = mdns.createAdvertisement(mdns.tcp(config.mdns.serviceName || 'hallo-chat'), PORT, {
    name: config.mdns.displayName || 'HalloChat Server'
  });
  ad.start();
  logger.info('MDNS service broadcast started');
}

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

// 优雅关闭服务器
const shutdown = () => {
  logger.info('Shutting down server...');
  console.log('Shutting down server...');
  server.close(() => {
    logger.info('HTTP server closed');
    console.log('HTTP server closed');
    mongoose.disconnect().then(() => {
      logger.info('MongoDB disconnected');
      console.log('MongoDB disconnected');
      process.exit(0);
    });
  });
};

// 添加stop命令API端点
app.post('/api/stop', (req, res) => {
  res.status(200).send('Server is shutting down...');
  shutdown();
});

// 监听终止信号
process.on('SIGINT', shutdown);  // Ctrl+C
process.on('SIGTERM', shutdown); // 系统终止信号