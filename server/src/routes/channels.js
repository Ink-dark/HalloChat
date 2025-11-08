const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../middleware/errorHandler');
const { RESPONSE } = require('../../utils/constants');
const auth = require('../middleware/auth');

const Channel = require('../models/channel.model');
const Group = require('../models/group.model');
const Message = require('../models/message.model');

// 创建频道验证规则
const createChannelValidation = [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('频道名称长度必须在1-50个字符之间'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('频道描述不能超过200个字符'),
  body('type')
    .isIn(['text', 'voice', 'announcement'])
    .withMessage('频道类型无效'),
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('位置必须是大于等于0的整数')
];

// 获取群组频道列表
router.get('/group/:groupId', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查用户是否有权限查看
  const isMember = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && member.isActive
  );

  if (!isMember) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '您不在该群组中'
    });
  }

  const channels = await Channel.find({
    group: groupId,
    isActive: true
  })
    .populate('creator', 'username avatar')
    .sort({ position: 1, createdAt: 1 });

  res.json({
    success: true,
    data: { channels }
  });
}));

// 获取频道详情
router.get('/:channelId', auth, asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channel = await Channel.findById(channelId)
    .populate('creator', 'username avatar')
    .populate('group', 'name type');

  if (!channel) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '频道不存在'
    });
  }

  // 检查用户是否有权限查看
  const group = await Group.findById(channel.group);
  const isMember = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && member.isActive
  );

  if (!isMember) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '您不在该群组中'
    });
  }

  res.json({
    success: true,
    data: { channel }
  });
}));

// 创建频道
router.post('/', auth, createChannelValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { name, description, type, groupId, position } = req.body;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否有权限创建频道（管理员或创建者）
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限创建频道'
    });
  }

  // 检查频道名称是否已存在
  const existingChannel = await Channel.findOne({
    name,
    group: groupId
  });

  if (existingChannel) {
    return res.status(RESPONSE.ERROR.CONFLICT).json({
      success: false,
      message: '频道名称已存在'
    });
  }

  const channel = new Channel({
    name,
    description,
    type: type || 'text',
    group: groupId,
    creator: req.user._id,
    position: position || 0
  });

  await channel.save();
  await channel.populate('creator', 'username avatar');

  res.status(RESPONSE.SUCCESS.CREATED).json({
    success: true,
    message: '频道创建成功',
    data: { channel }
  });
}));

// 更新频道
router.put('/:channelId', auth, createChannelValidation, asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { name, description, type, position } = req.body;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '频道不存在'
    });
  }

  const group = await Group.findById(channel.group);
  
  // 检查是否有权限更新频道（管理员或创建者）
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin && channel.creator.toString() !== req.user._id.toString()) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限更新频道'
    });
  }

  // 检查频道名称是否已存在（排除当前频道）
  if (name && name !== channel.name) {
    const existingChannel = await Channel.findOne({
      name,
      group: channel.group,
      _id: { $ne: channelId }
    });

    if (existingChannel) {
      return res.status(RESPONSE.ERROR.CONFLICT).json({
        success: false,
        message: '频道名称已存在'
      });
    }
  }

  if (name) channel.name = name;
  if (description !== undefined) channel.description = description;
  if (type) channel.type = type;
  if (position !== undefined) channel.position = position;

  await channel.save();
  await channel.populate('creator', 'username avatar');

  res.json({
    success: true,
    message: '频道更新成功',
    data: { channel }
  });
}));

// 删除频道
router.delete('/:channelId', auth, asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '频道不存在'
    });
  }

  const group = await Group.findById(channel.group);
  
  // 检查是否有权限删除频道（管理员或创建者）
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin && channel.creator.toString() !== req.user._id.toString()) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限删除频道'
    });
  }

  // 软删除
  channel.isActive = false;
  channel.deletedAt = new Date();

  await channel.save();

  res.json({
    success: true,
    message: '频道已删除'
  });
}));

// 获取频道的消息
router.get('/:channelId/messages', auth, asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '频道不存在'
    });
  }

  const group = await Group.findById(channel.group);
  const isMember = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && member.isActive
  );

  if (!isMember) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '您不在该群组中'
    });
  }

  const query = { channel: channelId, isDeleted: false };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((page - 1) * limit);

  const total = await Message.countDocuments(query);

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// 重新排序频道
router.put('/:groupId/reorder', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { channelIds } = req.body;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否有权限（管理员或创建者）
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限重新排序频道'
    });
  }

  // 更新频道位置
  for (let i = 0; i < channelIds.length; i++) {
    await Channel.findByIdAndUpdate(channelIds[i], { position: i });
  }

  res.json({
    success: true,
    message: '频道排序已更新'
  });
}));

module.exports = router;