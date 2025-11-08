const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../middleware/errorHandler');
const { RESPONSE } = require('../../utils/constants');
const auth = require('../middleware/auth');

const Message = require('../models/message.model');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const Channel = require('../models/channel.model');

// 发送消息验证规则
const sendMessageValidation = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('消息内容长度必须在1-2000个字符之间'),
  body('type')
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('消息类型无效'),
  body('receiverId')
    .optional()
    .isMongoId()
    .withMessage('接收者ID格式无效'),
  body('groupId')
    .optional()
    .isMongoId()
    .withMessage('群组ID格式无效'),
  body('channelId')
    .optional()
    .isMongoId()
    .withMessage('频道ID格式无效')
];

// 获取消息历史
router.get('/history', auth, asyncHandler(async (req, res) => {
  const { 
    userId, 
    groupId, 
    channelId, 
    page = 1, 
    limit = 50,
    before,
    after 
  } = req.query;

  const query = {};
  
  // 构建查询条件
  if (userId) {
    // 私聊消息
    query.$or = [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id }
    ];
  } else if (groupId) {
    // 群组消息
    query.group = groupId;
    if (channelId) {
      query.channel = channelId;
    }
  } else {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '必须指定userId、groupId或channelId'
    });
  }

  // 时间范围过滤
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  if (after) {
    query.createdAt = { $gt: new Date(after) };
  }

  const messages = await Message.find(query)
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar')
    .populate('group', 'name')
    .populate('channel', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((page - 1) * limit);

  const total = await Message.countDocuments(query);

  res.json({
    success: true,
    data: {
      messages: messages.reverse(), // 反转回正序
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// 发送消息
router.post('/send', auth, sendMessageValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { content, type, receiverId, groupId, channelId } = req.body;

  // 验证权限
  let receiverUser = null;
  let group = null;
  let channel = null;

  if (receiverId) {
    receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(RESPONSE.ERROR.NOT_FOUND).json({
        success: false,
        message: '接收者不存在'
      });
    }
  }

  if (groupId) {
    group = await Group.findById(groupId);
    if (!group) {
      return res.status(RESPONSE.ERROR.NOT_FOUND).json({
        success: false,
        message: '群组不存在'
      });
    }

    // 检查用户是否在群组中
    const isMember = group.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(RESPONSE.ERROR.FORBIDDEN).json({
        success: false,
        message: '您不在该群组中'
      });
    }

    if (channelId) {
      channel = await Channel.findById(channelId);
      if (!channel || channel.group.toString() !== groupId) {
        return res.status(RESPONSE.ERROR.NOT_FOUND).json({
          success: false,
          message: '频道不存在或不属于该群组'
        });
      }
    }
  }

  const message = new Message({
    content,
    type,
    sender: req.user._id,
    receiver: receiverId || null,
    group: groupId || null,
    channel: channelId || null
  });

  await message.save();

  // 填充关联数据
  await message.populate([
    { path: 'sender', select: 'username avatar' },
    { path: 'receiver', select: 'username avatar' },
    { path: 'group', select: 'name' },
    { path: 'channel', select: 'name' }
  ]);

  // WebSocket广播
  const io = req.app.get('io');
  if (io) {
    if (receiverId) {
      // 私聊
      io.to(receiverId).emit('newMessage', message);
    } else if (groupId) {
      // 群组消息
      io.to(`group_${groupId}`).emit('newMessage', message);
    }
  }

  res.json({
    success: true,
    data: { message }
  });
}));

// 编辑消息
router.put('/:messageId/edit', auth, asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '消息内容不能为空'
    });
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '消息不存在'
    });
  }

  // 检查权限（只能编辑自己的消息）
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '只能编辑自己的消息'
    });
  }

  // 检查消息是否可编辑（15分钟内）
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (message.createdAt < fifteenMinutesAgo) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '消息已超过可编辑时间'
    });
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();
  await message.populate([
    { path: 'sender', select: 'username avatar' },
    { path: 'receiver', select: 'username avatar' }
  ]);

  // WebSocket广播更新
  const io = req.app.get('io');
  if (io) {
    if (message.receiver) {
      io.to(message.receiver.toString()).emit('messageUpdated', message);
    }
    if (message.group) {
      io.to(`group_${message.group}`).emit('messageUpdated', message);
    }
  }

  res.json({
    success: true,
    data: { message }
  });
}));

// 删除消息
router.delete('/:messageId', auth, asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '消息不存在'
    });
  }

  // 检查权限（只能删除自己的消息）
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '只能删除自己的消息'
    });
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = '[消息已删除]';

  await message.save();

  // WebSocket广播删除
  const io = req.app.get('io');
  if (io) {
    if (message.receiver) {
      io.to(message.receiver.toString()).emit('messageDeleted', { messageId });
    }
    if (message.group) {
      io.to(`group_${message.group}`).emit('messageDeleted', { messageId });
    }
  }

  res.json({
    success: true,
    message: '消息已删除'
  });
}));

// 标记消息已读
router.put('/:messageId/read', auth, asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '消息不存在'
    });
  }

  // 检查是否是接收者
  const isReceiver = message.receiver?.toString() === req.user._id.toString();
  if (!isReceiver) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '只能标记自己接收的消息'
    });
  }

  message.isRead = true;
  message.readAt = new Date();

  await message.save();

  res.json({
    success: true,
    message: '消息已标记为已读'
  });
}));

// 获取未读消息数量
router.get('/unread-count', auth, asyncHandler(async (req, res) => {
  const { userId, groupId } = req.query;

  const query = {
    isRead: false
  };

  if (userId) {
    query.receiver = req.user._id;
    query.sender = userId;
  } else if (groupId) {
    query.group = groupId;
  }

  const count = await Message.countDocuments(query);

  res.json({
    success: true,
    data: { count }
  });
}));

module.exports = router;