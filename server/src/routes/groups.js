const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../middleware/errorHandler');
const { RESPONSE } = require('../../utils/constants');
const auth = require('../middleware/auth');

const Group = require('../models/group.model');
const User = require('../models/user.model');
const Channel = require('../models/channel.model');

// 创建群组验证规则
const createGroupValidation = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('群组名称长度必须在2-50个字符之间'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('群组描述不能超过500个字符'),
  body('type')
    .isIn(['public', 'private', 'direct'])
    .withMessage('群组类型无效')
];

// 获取用户群组列表
router.get('/my', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const groups = await Group.find({
    'members.user': req.user._id,
    'members.isActive': true
  })
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar status')
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit))
    .skip((page - 1) * limit);

  const total = await Group.countDocuments({
    'members.user': req.user._id,
    'members.isActive': true
  });

  res.json({
    success: true,
    data: {
      groups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// 获取公开群组
router.get('/public', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  const query = { type: 'public' };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const groups = await Group.find(query)
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar')
    .sort({ memberCount: -1 })
    .limit(parseInt(limit))
    .skip((page - 1) * limit);

  const total = await Group.countDocuments(query);

  res.json({
    success: true,
    data: {
      groups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// 获取群组详情
router.get('/:groupId', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate('creator', 'username avatar')
    .populate('members.user', 'username avatar status lastSeen')
    .populate({
      path: 'channels',
      select: 'name description type position isActive'
    });

  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查用户是否有权限查看
  const isMember = group.members.some(member => 
    member.user._id.toString() === req.user._id.toString() && member.isActive
  );

  if (!isMember && group.type !== 'public') {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '您不在该群组中'
    });
  }

  res.json({
    success: true,
    data: { group }
  });
}));

// 创建群组
router.post('/', auth, createGroupValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { name, description, type } = req.body;

  // 检查群组名称是否已存在
  const existingGroup = await Group.findOne({ name });
  if (existingGroup) {
    return res.status(RESPONSE.ERROR.CONFLICT).json({
      success: false,
      message: '群组名称已存在'
    });
  }

  const group = new Group({
    name,
    description,
    type: type || 'public',
    creator: req.user._id,
    members: [{
      user: req.user._id,
      role: 'admin',
      joinedAt: new Date()
    }]
  });

  await group.save();

  // 创建默认频道
  const defaultChannel = new Channel({
    name: 'general',
    description: '默认频道',
    group: group._id,
    creator: req.user._id,
    type: 'text',
    position: 0
  });

  await defaultChannel.save();

  await group.populate('creator', 'username avatar');

  res.status(RESPONSE.SUCCESS.CREATED).json({
    success: true,
    message: '群组创建成功',
    data: { group }
  });
}));

// 加入群组
router.post('/:groupId/join', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { inviteCode } = req.body;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否已加入
  const isMember = group.members.some(member => 
    member.user.toString() === req.user._id.toString()
  );

  if (isMember) {
    return res.status(RESPONSE.ERROR.CONFLICT).json({
      success: false,
      message: '您已在该群组中'
    });
  }

  // 验证邀请码（如果是私有群组）
  if (group.type === 'private' && group.inviteCode !== inviteCode) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '邀请码无效'
    });
  }

  // 加入群组
  group.members.push({
    user: req.user._id,
    role: 'member',
    joinedAt: new Date()
  });

  await group.save();

  res.json({
    success: true,
    message: '成功加入群组',
    data: { group }
  });
}));

// 退出群组
router.post('/:groupId/leave', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否在群组中
  const memberIndex = group.members.findIndex(member => 
    member.user.toString() === req.user._id.toString()
  );

  if (memberIndex === -1) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '您不在该群组中'
    });
  }

  // 如果是创建者，不允许退出
  if (group.creator.toString() === req.user._id.toString()) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '创建者不能退出群组'
    });
  }

  // 标记为不活跃而不是删除
  group.members[memberIndex].isActive = false;
  group.members[memberIndex].leftAt = new Date();

  await group.save();

  res.json({
    success: true,
    message: '成功退出群组'
  });
}));

// 邀请用户加入群组
router.post('/:groupId/invite', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { username } = req.body;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否有权限邀请（管理员或创建者）
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限邀请用户'
    });
  }

  const userToInvite = await User.findOne({ username });
  if (!userToInvite) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '用户不存在'
    });
  }

  // 检查是否已在群组中
  const isMember = group.members.some(member => 
    member.user.toString() === userToInvite._id.toString()
  );

  if (isMember) {
    return res.status(RESPONSE.ERROR.CONFLICT).json({
      success: false,
      message: '用户已在该群组中'
    });
  }

  // 加入群组
  group.members.push({
    user: userToInvite._id,
    role: 'member',
    invitedBy: req.user._id,
    joinedAt: new Date()
  });

  await group.save();

  res.json({
    success: true,
    message: '邀请成功',
    data: { user: userToInvite }
  });
}));

// 获取群组邀请码
router.get('/:groupId/invite-code', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(RESPONSE.ERROR.NOT_FOUND).json({
      success: false,
      message: '群组不存在'
    });
  }

  // 检查是否有权限获取邀请码
  const isAdmin = group.members.some(member => 
    member.user.toString() === req.user._id.toString() && 
    ['admin', 'creator'].includes(member.role)
  );

  if (!isAdmin) {
    return res.status(RESPONSE.ERROR.FORBIDDEN).json({
      success: false,
      message: '没有权限获取邀请码'
    });
  }

  if (!group.inviteCode) {
    group.inviteCode = Math.random().toString(36).substring(2, 10);
    await group.save();
  }

  res.json({
    success: true,
    data: { inviteCode: group.inviteCode }
  });
}));

module.exports = router;