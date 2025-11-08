const mongoose = require('mongoose');
const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '频道名称不能为空'],
    trim: true,
    minlength: [2, '频道名称至少2个字符'],
    maxlength: [30, '频道名称最多30个字符']
  },
  
  description: {
    type: String,
    maxlength: [200, '频道描述最多200字符']
  },
  
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: ['text', 'voice', 'announcement'],
    default: 'text'
  },
  
  position: {
    type: Number,
    default: 0
  },
  
  permissions: {
    canSendMessages: {
      type: [String], // 角色列表
      default: ['owner', 'admin', 'moderator', 'member']
    },
    canManageMessages: {
      type: [String],
      default: ['owner', 'admin', 'moderator']
    },
    canManageChannel: {
      type: [String],
      default: ['owner', 'admin']
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  messageCount: {
    type: Number,
    default: 0
  },
  
  topic: {
    type: String,
    maxlength: [1024, '主题内容最多1024字符']
  },
  
  rateLimit: {
    messagesPerMinute: {
      type: Number,
      default: 0 // 0表示无限制
    },
    slowMode: {
      type: Number,
      default: 0 // 慢模式间隔（秒）
    }
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
channelSchema.index({ group: 1, position: 1 });
channelSchema.index({ group: 1, name: 1 });
channelSchema.index({ creator: 1 });
channelSchema.index({ lastMessage: -1 });
channelSchema.index({ isActive: 1 });

// 虚拟字段
channelSchema.virtual('isText').get(function() {
  return this.type === 'text';
});

channelSchema.virtual('isVoice').get(function() {
  return this.type === 'voice';
});

channelSchema.virtual('isAnnouncement').get(function() {
  return this.type === 'announcement';
});

// 预保存钩子
channelSchema.pre('save', function(next) {
  // 确保每个群组只有一个默认频道
  if (this.isNew && this.isDefault) {
    this.constructor.findOneAndUpdate(
      { group: this.group, isDefault: true },
      { isDefault: false }
    ).exec();
  }
  next();
});

// 静态方法
channelSchema.statics.findByGroup = function(groupId) {
  return this.find({ group: groupId, isActive: true })
    .populate('creator', 'username avatar')
    .populate('lastMessage')
    .sort({ position: 1 });
};

channelSchema.statics.findDefaultChannel = function(groupId) {
  return this.findOne({ group: groupId, isDefault: true, isActive: true })
    .populate('creator', 'username avatar');
};

channelSchema.statics.createChannel = function(channelData) {
  const channel = new this(channelData);
  
  // 如果是第一个频道，设为默认
  return this.countDocuments({ group: channelData.group }).then(count => {
    if (count === 0) {
      channel.isDefault = true;
    }
    return channel.save();
  });
};

// 实例方法
channelSchema.methods.canUserSendMessage = function(userRole) {
  return this.permissions.canSendMessages.includes(userRole);
};

channelSchema.methods.canUserManageMessages = function(userRole) {
  return this.permissions.canManageMessages.includes(userRole);
};

channelSchema.methods.canUserManageChannel = function(userRole) {
  return this.permissions.canManageChannel.includes(userRole);
};

channelSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.messageCount += 1;
  return this.save();
};

channelSchema.methods.incrementMessageCount = function() {
  this.messageCount += 1;
  return this.save();
};

channelSchema.methods.decrementMessageCount = function() {
  this.messageCount = Math.max(0, this.messageCount - 1);
  return this.save();
};

channelSchema.methods.setTopic = function(topic) {
  this.topic = topic;
  return this.save();
};

channelSchema.methods.updatePosition = function(newPosition) {
  this.position = newPosition;
  return this.save();
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;