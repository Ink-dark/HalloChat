const mongoose = require('mongoose');
const { v1: uuidv1 } = require('uuid');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [20, '用户名最多20个字符'],
    match: [/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含中文、字母、数字和下划线']
  },
  
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
  },
  
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    maxlength: [20, '密码最多20个字符']
  },
  
  user_uuid: {
    type: String,
    required: true,
    default: () => uuidv1()
  },
  
  // 用户唯一标识符（以服务器为单位，用于识别和验证）
  uid: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  random_id: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 8).toUpperCase()
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  profile: {
    bio: {
      type: String,
      maxlength: [500, '个人简介最多500个字符'],
      default: ''
    },
    location: {
      type: String,
      maxlength: [100, '位置最多100个字符'],
      default: ''
    },
    website: {
      type: String,
      maxlength: [200, '网站最多200个字符'],
      default: ''
    }
  },
  
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
           email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: true
      }
    }
  },
  
  random_id_updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastLogin: 1 });
userSchema.index({ random_id: 1 });
userSchema.index({ uid: 1 }, { unique: true });

// UID 生成器（以服务器为单位）
function generateUID() {
  const timestamp = Date.now().toString(36).toUpperCase(); // 时间戳
  const random = Math.random().toString(36).substr(2, 6).toUpperCase(); // 随机字符
  return `${timestamp}${random}`;
}

// 静态方法：生成唯一 UID
userSchema.statics.generateUniqueUID = async function() {
  let uid;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (exists && attempts < maxAttempts) {
    uid = generateUID();
    exists = await this.findOne({ uid });
    attempts++;
  }
  
  if (exists) {
    throw new Error('无法生成唯一 UID，请稍后重试');
  }
  
  return uid;
};

// 静态方法：检查 UID 是否存在
userSchema.statics.isUIDExists = async function(uid) {
  const user = await this.findOne({ uid });
  return !!user;
};

// 静态方法：通过 UID 查找用户
userSchema.statics.findByUID = async function(uid) {
  return await this.findOne({ uid }).select('-password');
};

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码验证失败');
  }
};

// 获取公开信息
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    uid: this.uid,
    avatar: this.avatar,
    status: this.status,
    role: this.role,
    profile: this.profile,
    user_uuid: this.user_uuid,
    random_id: this.random_id,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

// 静态方法：查找活跃用户
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).select('-password');
};

// 静态方法：查找在线用户
userSchema.statics.findOnlineUsers = function() {
  return this.find({ status: 'online', isActive: true }).select('-password');
};

// 静态方法：按用户名搜索用户
userSchema.statics.searchByUsername = function(query) {
  return this.find({
    username: { $regex: query, $options: 'i' },
    isActive: true
  }).select('-password').limit(10);
};

// 静态方法：检查用户名是否存在
userSchema.statics.isUsernameExists = async function(username) {
  const user = await this.findOne({ username });
  return !!user;
};

// 静态方法：检查邮箱是否存在
userSchema.statics.isEmailExists = async function(email) {
  const user = await this.findOne({ email });
  return !!user;
};

// 静态方法：注册用户
userSchema.statics.registerUser = async function(userData) {
  const { username, email, password } = userData;
  
  // 检查用户是否已存在
  const existingUser = await this.findOne({
    $or: [{ username }, { email }]
  });
  
  if (existingUser) {
    const field = existingUser.username === username ? 'username' : 'email';
    const error = new Error(field === 'username' ? '用户名已被使用' : '邮箱已被使用');
    error.status = 409;
    error.field = field;
    throw error;
  }
  
  // 生成唯一 UID
  const uid = await this.generateUniqueUID();
  
  // 创建用户 - 密码会通过pre('save')中间件自动哈希
  const user = new this({
    username,
    email,
    password, // 明文密码，由pre('save')中间件处理哈希
    uid
  });
  
  // 保存用户
  await user.save();
  
  console.log(`[用户注册] 成功创建用户: ${username}, UID: ${uid}`);
  
  // 返回用户的公开信息
  return user.getPublicProfile();
};

// 静态方法：获取用户的好友列表
// 注意：这是一个简化实现，实际应用中应该有专门的好友关系模型
userSchema.statics.getFriends = async function(userId) {
  try {
    // 这里是一个简化实现
    // 实际应用中应该查询专门的好友关系集合
    // 为了演示，这里返回用户自己的信息作为模拟好友数据
    const user = await this.findById(userId).select('-password');
    if (!user) return [];
    
    // 实际应用中，这里应该返回真正的好友列表
    // 这里返回用户自己作为演示
    return [user];
  } catch (error) {
    console.error('获取好友列表失败:', error);
    return [];
  }
};

// 用户登录验证
async function loginUser(usernameOrEmailOrUID, plainPassword) {
  // 支持通过用户名、邮箱或 UID 登录
  const user = await User.findOne({
    $or: [
      { username: usernameOrEmailOrUID }, 
      { email: usernameOrEmailOrUID },
      { uid: usernameOrEmailOrUID.toUpperCase() }
    ]
  });
  if (!user) throw new Error('用户不存在');

  const isPasswordValid = await user.comparePassword(plainPassword);
  if (!isPasswordValid) throw new Error('密码错误');

  // 更新最后登录时间
  user.lastLogin = new Date();
  await user.save();

  console.log(`[用户登录] ${user.username} (UID: ${user.uid}) 登录成功`);

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    uid: user.uid,
    userUuid: user.user_uuid,
    randomId: user.random_id,
    avatar: user.avatar,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
}

const User = mongoose.model('User', userSchema);

// 支持两种导入方式
module.exports = User;
module.exports.User = User;
module.exports.loginUser = loginUser;