const mongoose = require('mongoose');
const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, '文件名不能为空'],
    trim: true,
    maxlength: [255, '文件名最多255字符']
  },
  
  originalName: {
    type: String,
    required: [true, '原始文件名不能为空'],
    trim: true,
    maxlength: [255, '原始文件名最多255字符']
  },
  
  mimeType: {
    type: String,
    required: [true, '文件类型不能为空'],
    trim: true
  },
  
  size: {
    type: Number,
    required: [true, '文件大小不能为空'],
    min: [0, '文件大小不能为负']
  },
  
  path: {
    type: String,
    required: [true, '文件路径不能为空'],
    trim: true
  },
  
  url: {
    type: String,
    required: [true, '文件URL不能为空'],
    trim: true
  },
  
  thumbnailUrl: {
    type: String,
    trim: true
  },
  
  hash: {
    type: String,
    required: [true, '文件哈希不能为空'],
    trim: true,
    index: true
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  
  metadata: {
    width: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    },
    duration: {
      type: Number,
      default: null // 音频/视频时长（秒）
    },
    format: {
      type: String,
      default: null
    },
    bitrate: {
      type: Number,
      default: null
    },
    codec: {
      type: String,
      default: null
    }
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isProcessed: {
    type: Boolean,
    default: false
  },
  
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  processingError: {
    type: String,
    default: null
  },
  
  downloads: {
    type: Number,
    default: 0
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, '标签最多50字符']
  }],
  
  expiresAt: {
    type: Date,
    default: null // null表示永不过期
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
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.path; // 不暴露内部路径
      return ret;
    }
  }
});

// 索引优化
fileSchema.index({ owner: 1 });
fileSchema.index({ message: 1 });
fileSchema.index({ group: 1 });
fileSchema.index({ channel: 1 });
fileSchema.index({ hash: 1 });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ size: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ expiresAt: 1 });
fileSchema.index({ isDeleted: 1 });
fileSchema.index({ filename: 'text', originalName: 'text' });

// 虚拟字段
fileSchema.virtual('isImage').get(function() {
  return this.mimeType.startsWith('image/');
});

fileSchema.virtual('isVideo').get(function() {
  return this.mimeType.startsWith('video/');
});

fileSchema.virtual('isAudio').get(function() {
  return this.mimeType.startsWith('audio/');
});

fileSchema.virtual('isDocument').get(function() {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ].includes(this.mimeType);
});

fileSchema.virtual('extension').get(function() {
  return this.filename.split('.').pop().toLowerCase();
});

fileSchema.virtual('sizeFormatted').get(function() {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
});

fileSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// 预保存钩子
fileSchema.pre('save', function(next) {
  // 如果文件已过期且未标记为删除，自动标记
  if (this.isExpired && !this.isDeleted) {
    this.isDeleted = true;
    this.deletedAt = new Date();
  }
  next();
});

// 静态方法
fileSchema.statics.findByOwner = function(userId) {
  return this.find({ owner: userId, isDeleted: false })
    .populate('owner', 'username avatar')
    .populate('message', 'content')
    .populate('group', 'name')
    .populate('channel', 'name')
    .sort({ createdAt: -1 });
};

fileSchema.statics.findByGroup = function(groupId) {
  return this.find({ group: groupId, isDeleted: false })
    .populate('owner', 'username avatar')
    .populate('message', 'content')
    .populate('channel', 'name')
    .sort({ createdAt: -1 });
};

fileSchema.statics.findByChannel = function(channelId) {
  return this.find({ channel: channelId, isDeleted: false })
    .populate('owner', 'username avatar')
    .populate('message', 'content')
    .sort({ createdAt: -1 });
};

fileSchema.statics.findByMessage = function(messageId) {
  return this.find({ message: messageId, isDeleted: false })
    .populate('owner', 'username avatar')
    .sort({ createdAt: 1 });
};

fileSchema.statics.findByHash = function(hash) {
  return this.findOne({ hash, isDeleted: false });
};

fileSchema.statics.searchFiles = function(query, options = {}) {
  const searchCriteria = {
    $or: [
      { filename: { $regex: query, $options: 'i' } },
      { originalName: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ],
    isDeleted: false
  };

  if (options.owner) {
    searchCriteria.owner = options.owner;
  }

  if (options.group) {
    searchCriteria.group = options.group;
  }

  if (options.channel) {
    searchCriteria.channel = options.channel;
  }

  if (options.mimeType) {
    searchCriteria.mimeType = { $regex: options.mimeType };
  }

  if (options.minSize || options.maxSize) {
    searchCriteria.size = {};
    if (options.minSize) searchCriteria.size.$gte = options.minSize;
    if (options.maxSize) searchCriteria.size.$lte = options.maxSize;
  }

  return this.find(searchCriteria)
    .populate('owner', 'username avatar')
    .populate('message', 'content')
    .populate('group', 'name')
    .populate('channel', 'name')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

fileSchema.statics.getTotalSize = function(userId) {
  return this.aggregate([
    { $match: { owner: userId, isDeleted: false } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } }
  ]);
};

fileSchema.statics.getFileStats = function(userId) {
  return this.aggregate([
    { $match: { owner: userId, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        imageCount: {
          $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /^image\// } }, 1, 0] }
        },
        videoCount: {
          $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /^video\// } }, 1, 0] }
        },
        audioCount: {
          $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /^audio\// } }, 1, 0] }
        },
        documentCount: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$mimeType',
                  [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  ]
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// 实例方法
fileSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

fileSchema.methods.markAsProcessed = function() {
  this.isProcessed = true;
  this.processingStatus = 'completed';
  return this.save();
};

fileSchema.methods.markAsFailed = function(error) {
  this.processingStatus = 'failed';
  this.processingError = error;
  return this.save();
};

fileSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

fileSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

fileSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

fileSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

fileSchema.methods.setExpiration = function(expiresAt) {
  this.expiresAt = expiresAt;
  return this.save();
};

const File = mongoose.model('File', fileSchema);

module.exports = File;