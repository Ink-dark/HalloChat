const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '群组名称不能为空'],
    trim: true,
    minlength: [2, '群组名称至少2个字符'],
    maxlength: [50, '群组名称最多50个字符']
  },
  
  description: {
    type: String,
    maxlength: [500, '群组描述最多500字符']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  type: {
    type: String,
    enum: ['public', 'private', 'direct'],
    default: 'public'
  },
  
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  
  settings: {
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB
    },
    allowedFileTypes: [{
      type: String,
      default: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    }],
    allowInvites: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    messageRetention: {
      type: Number,
      default: 0 // 0表示永久保留
    }
  },
  
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  memberCount: {
    type: Number,
    default: 0
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  isEncrypted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// 索引优化
groupSchema.index({ name: 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ type: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ lastActivity: -1 });
groupSchema.index({ memberCount: -1 });

// 虚拟字段
groupSchema.virtual('isDirect').get(function() {
  return this.type === 'direct';
});

groupSchema.virtual('isPrivate').get(function() {
  return this.type === 'private';
});

groupSchema.virtual('isPublic').get(function() {
  return this.type === 'public';
});

// 预保存钩子
groupSchema.pre('save', function(next) {
  if (this.isNew && !this.inviteCode && this.type !== 'direct') {
    this.inviteCode = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  }
  
  // 更新成员计数
  this.memberCount = this.members.filter(m => m.isActive).length;
  next();
});

// 静态方法
groupSchema.statics.findByInviteCode = function(inviteCode) {
  return this.findOne({ inviteCode, isActive: true });
};

groupSchema.statics.findUserGroups = function(userId) {
  return this.find({
    'members.user': userId,
    isActive: true
  }).populate('creator', 'username avatar')
    .populate('members.user', 'username avatar status')
    .sort({ lastActivity: -1 });
};

groupSchema.statics.findPublicGroups = function() {
  return this.find({ type: 'public', isActive: true })
    .populate('creator', 'username avatar')
    .sort({ memberCount: -1, lastActivity: -1 });
};

groupSchema.statics.searchGroups = function(query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ],
    type: 'public',
    isActive: true
  }).populate('creator', 'username avatar')
    .sort({ memberCount: -1 });
};

// 实例方法
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (existingMember) {
    existingMember.isActive = true;
    existingMember.joinedAt = new Date();
  } else {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      lastReadAt: new Date()
    });
  }

  this.memberCount = this.members.filter(m => m.isActive).length;
  this.lastActivity = new Date();

  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    m => m.user.toString() === userId.toString()
  );

  if (memberIndex !== -1) {
    this.members[memberIndex].isActive = false;
    this.memberCount = this.members.filter(m => m.isActive).length;
    
    // 如果群组没有成员了，标记为非活跃
    if (this.memberCount === 0) {
      this.isActive = false;
    }
  }

  return this.save();
};

groupSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (member) {
    member.role = newRole;
    return this.save();
  }

  throw new Error('用户不在群组中');
};

groupSchema.methods.updateLastRead = function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (member) {
    member.lastReadAt = new Date();
    return this.save();
  }
};

groupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(
    m => m.user.toString() === userId.toString() && m.isActive
  );
};

groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );
  return member && ['owner', 'admin', 'moderator'].includes(member.role);
};

// 验证消息是否属于该群组
groupSchema.methods.validateMessage = function(messageId) {
  return this.lastMessage && this.lastMessage.toString() === messageId.toString();
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;