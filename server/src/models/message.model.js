const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, '消息内容不能为空'],
    trim: true,
    maxlength: [5000, '消息内容不能超过5000字符']
  },
  
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'emoji', 'audio'],
    default: 'text'
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  
  file: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    thumbnailUrl: String
  },
  
  reactions: [{
    emoji: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: {
    type: Date,
    default: null
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  isEncrypted: {
    type: Boolean,
    default: false
  },
  
  isSelfDestruct: {
    type: Boolean,
    default: false
  },
  
  destructTime: {
    type: Date,
    default: null
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });
messageSchema.index({ type: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ deliveryStatus: 1 });
messageSchema.index({ 'reactions.user': 1 });

// 虚拟字段
messageSchema.virtual('isPrivate').get(function() {
  return this.receiver !== null;
});

messageSchema.virtual('isGroupMessage').get(function() {
  return this.group !== null;
});

messageSchema.virtual('isChannelMessage').get(function() {
  return this.channel !== null;
});

messageSchema.virtual('isSystem').get(function() {
  return this.type === 'system';
});

// 静态方法
messageSchema.statics.getChatHistory = function(filter, options = {}) {
  const {
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;

  return this.find(filter)
    .populate('sender', 'username avatar status')
    .populate('receiver', 'username avatar status')
    .populate('replyTo')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

messageSchema.statics.getUnreadCount = function(userId, lastReadTimestamps = {}) {
  const filter = {
    $or: [
      { receiver: userId },
      { group: { $in: Object.keys(lastReadTimestamps) } },
      { channel: { $in: Object.keys(lastReadTimestamps) } }
    ],
    isDeleted: false
  };

  return this.find(filter)
    .then(messages => {
      return messages.filter(msg => {
        const key = msg.group || msg.channel || msg.sender;
        const lastRead = lastReadTimestamps[key];
        return !lastRead || msg.createdAt > lastRead;
      }).length;
    });
};

messageSchema.statics.searchMessages = function(query, options = {}) {
  const {
    limit = 20,
    skip = 0,
    userId = null
  } = options;

  const filter = {
    content: { $regex: query, $options: 'i' },
    isDeleted: false
  };

  if (userId) {
    filter.$or = [
      { sender: userId },
      { receiver: userId },
      { 'mentions': userId }
    ];
  }

  return this.find(filter)
    .populate('sender', 'username avatar')
    .populate('channel', 'name')
    .populate('group', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

messageSchema.statics.getRecentMessages = function(userId, limit = 20) {
  return this.find({
    $or: [
      { sender: userId },
      { receiver: userId },
      { mentions: userId }
    ],
    isDeleted: false
  })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// 实例方法
messageSchema.methods.addReaction = function(emoji, userId) {
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    // 移除反应
    this.reactions = this.reactions.filter(
      r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
    );
  } else {
    // 添加反应
    this.reactions.push({
      emoji,
      user: userId,
      createdAt: new Date()
    });
  }

  return this.save();
};

messageSchema.methods.editMessage = function(newContent, editorId) {
  if (this.sender.toString() !== editorId.toString()) {
    throw new Error('只能编辑自己的消息');
  }

  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();

  return this.save();
};

messageSchema.methods.softDelete = function(deleterId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deleterId;

  return this.save();
};

messageSchema.methods.markAsDelivered = function() {
  if (this.deliveryStatus === 'sent') {
    this.deliveryStatus = 'delivered';
    return this.save();
  }
  return Promise.resolve(this);
};

messageSchema.methods.markAsRead = function() {
  this.deliveryStatus = 'read';
  return this.save();
};

// 避免模型重复编译
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

module.exports = Message;