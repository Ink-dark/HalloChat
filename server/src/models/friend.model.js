const mongoose = require('mongoose');
const { RESPONSE } = require('../../utils/constants');

const friendSchema = new mongoose.Schema({
  // 发起好友请求的用户
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 接收好友请求的用户
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 好友关系状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  
  // 好友请求消息（可选）
  message: {
    type: String,
    maxlength: 200
  },
  
  // 好友请求创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 好友关系更新时间（接受/拒绝/屏蔽时更新）
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // 好友备注名
  alias: {
    type: String,
    maxlength: 50
  },
  
  // 是否星标好友
  isStarred: {
    type: Boolean,
    default: false
  },
  
  // 好友分组
  group: {
    type: String,
    maxlength: 50,
    default: '默认分组'
  }
}, {
  timestamps: true
});

// 复合索引，确保同一对用户只能有一个好友关系
friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 索引优化查询性能
friendSchema.index({ requester: 1, status: 1 });
friendSchema.index({ recipient: 1, status: 1 });
friendSchema.index({ updatedAt: -1 });

// 静态方法：发送好友请求
friendSchema.statics.sendFriendRequest = async function(requesterId, recipientId, message = '') {
  // 检查是否已经是好友或已有待处理请求
  const existingFriend = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });
  
  if (existingFriend) {
    const error = new Error('好友关系已存在或待处理');
    error.status = RESPONSE.ERROR.CONFLICT;
    throw error;
  }
  
  // 检查不能添加自己为好友
  if (requesterId.toString() === recipientId.toString()) {
    const error = new Error('不能添加自己为好友');
    error.status = RESPONSE.ERROR.BAD_REQUEST;
    throw error;
  }
  
  // 创建好友请求
  const friendRequest = new this({
    requester: requesterId,
    recipient: recipientId,
    message: message.trim(),
    status: 'pending'
  });
  
  await friendRequest.save();
  
  // 填充关联数据
  await friendRequest.populate([
    { path: 'requester', select: 'username avatar' },
    { path: 'recipient', select: 'username avatar' }
  ]);
  
  return friendRequest;
};

// 静态方法：接受好友请求
friendSchema.statics.acceptFriendRequest = async function(friendRequestId, recipientId) {
  const friendRequest = await this.findById(friendRequestId)
    .populate('requester', 'username avatar')
    .populate('recipient', 'username avatar');
  
  if (!friendRequest) {
    const error = new Error('好友请求不存在');
    error.status = RESPONSE.ERROR.NOT_FOUND;
    throw error;
  }
  
  // 检查权限
  if (friendRequest.recipient._id.toString() !== recipientId.toString()) {
    const error = new Error('无权处理此好友请求');
    error.status = RESPONSE.ERROR.FORBIDDEN;
    throw error;
  }
  
  if (friendRequest.status !== 'pending') {
    const error = new Error('好友请求状态无效');
    error.status = RESPONSE.ERROR.BAD_REQUEST;
    throw error;
  }
  
  friendRequest.status = 'accepted';
  friendRequest.updatedAt = new Date();
  await friendRequest.save();
  
  return friendRequest;
};

// 静态方法：拒绝好友请求
friendSchema.statics.rejectFriendRequest = async function(friendRequestId, recipientId) {
  const friendRequest = await this.findById(friendRequestId);
  
  if (!friendRequest) {
    const error = new Error('好友请求不存在');
    error.status = RESPONSE.ERROR.NOT_FOUND;
    throw error;
  }
  
  // 检查权限
  if (friendRequest.recipient.toString() !== recipientId.toString()) {
    const error = new Error('无权处理此好友请求');
    error.status = RESPONSE.ERROR.FORBIDDEN;
    throw error;
  }
  
  if (friendRequest.status !== 'pending') {
    const error = new Error('好友请求状态无效');
    error.status = RESPONSE.ERROR.BAD_REQUEST;
    throw error;
  }
  
  friendRequest.status = 'rejected';
  friendRequest.updatedAt = new Date();
  await friendRequest.save();
  
  return friendRequest;
};

// 静态方法：获取用户的好友列表
friendSchema.statics.getFriends = async function(userId) {
  const friends = await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  })
    .populate('requester', 'username avatar status')
    .populate('recipient', 'username avatar status')
    .sort({ updatedAt: -1 });
  
  // 格式化返回数据，将好友信息统一格式
  return friends.map(friend => {
    const isRequester = friend.requester._id.toString() === userId.toString();
    const friendUser = isRequester ? friend.recipient : friend.requester;
    
    return {
      id: friend._id,
      friend: friendUser,
      alias: friend.alias,
      isStarred: friend.isStarred,
      group: friend.group,
      friendshipSince: friend.updatedAt,
      isRequester: isRequester
    };
  });
};

// 静态方法：获取待处理的好友请求
friendSchema.statics.getPendingRequests = async function(userId) {
  return await this.find({
    recipient: userId,
    status: 'pending'
  })
    .populate('requester', 'username avatar')
    .sort({ createdAt: -1 });
};

// 静态方法：删除好友关系
friendSchema.statics.removeFriend = async function(friendId, userId) {
  const friend = await this.findById(friendId);
  
  if (!friend) {
    const error = new Error('好友关系不存在');
    error.status = RESPONSE.ERROR.NOT_FOUND;
    throw error;
  }
  
  // 检查权限
  if (friend.requester.toString() !== userId.toString() && 
      friend.recipient.toString() !== userId.toString()) {
    const error = new Error('无权删除此好友关系');
    error.status = RESPONSE.ERROR.FORBIDDEN;
    throw error;
  }
  
  await this.findByIdAndDelete(friendId);
  return { message: '好友关系已删除' };
};

// 静态方法：更新好友备注
friendSchema.statics.updateFriendAlias = async function(friendId, userId, alias) {
  const friend = await this.findById(friendId);
  
  if (!friend) {
    const error = new Error('好友关系不存在');
    error.status = RESPONSE.ERROR.NOT_FOUND;
    throw error;
  }
  
  // 检查权限
  if (friend.requester.toString() !== userId.toString() && 
      friend.recipient.toString() !== userId.toString()) {
    const error = new Error('无权修改此好友关系');
    error.status = RESPONSE.ERROR.FORBIDDEN;
    throw error;
  }
  
  friend.alias = alias.trim();
  friend.updatedAt = new Date();
  await friend.save();
  
  return friend;
};

// 实例方法：检查用户是否在好友关系中
friendSchema.methods.isUserInvolved = function(userId) {
  return this.requester.toString() === userId.toString() || 
         this.recipient.toString() === userId.toString();
};

// 实例方法：获取好友用户（相对于当前用户）
friendSchema.methods.getFriendUser = function(userId) {
  if (this.requester._id.toString() === userId.toString()) {
    return this.recipient;
  } else if (this.recipient._id.toString() === userId.toString()) {
    return this.requester;
  }
  return null;
};

const Friend = mongoose.model('Friend', friendSchema);

module.exports = Friend;