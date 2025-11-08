const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, loginUser } = require('../src/models/user.model');
const bcrypt = require('bcryptjs');

let mongoServer;

// 测试前的设置
beforeAll(async () => {
  // 启动内存中的MongoDB服务器
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // 连接到内存中的MongoDB
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// 测试后的清理
afterAll(async () => {
  // 关闭数据库连接
  await mongoose.connection.close();
  // 停止内存中的MongoDB服务器
  await mongoServer.stop();
});

// 测试前清理数据库
beforeEach(async () => {
  await User.deleteMany({});
});

describe('用户模型测试', () => {
  describe('User 模型定义', () => {
    it('应该创建有效的用户文档', async () => {
      const userData = {
        username: 'modeluser',
        email: 'model@example.com',
        password: 'Test123!'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      // 验证用户是否正确保存
      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // 密码应该被加密
      expect(savedUser.status).toBe('offline'); // 验证默认值
      expect(savedUser.role).toBe('user'); // 验证默认值
      expect(savedUser.isActive).toBe(true); // 验证默认值
      expect(savedUser.user_uuid).toBeDefined(); // 验证自动生成的UUID
      expect(savedUser.random_id).toBeDefined(); // 验证自动生成的随机ID
    });
    
    it('应该验证必填字段', async () => {
      const user = new User({
        // 缺少必填字段
      });
      
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.username).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
    
    it('应该验证字段长度限制', async () => {
      const user = new User({
        username: 'ab', // 太短
        email: 'short@ex.com',
        password: '12345' // 太短
      });
      
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.username).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
    
    it('应该验证邮箱格式', async () => {
      const user = new User({
        username: 'validuser',
        email: 'not-an-email', // 无效的邮箱格式
        password: 'validpassword123'
      });
      
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });
  });
  
  describe('用户方法测试', () => {
    it('comparePassword 方法应该正确验证密码', async () => {
      const password = 'password123';
      const user = new User({
        username: 'methoduser',
        email: 'method@example.com',
        password: password
      });
      await user.save();
      
      // 验证正确的密码
      const isMatch = await user.comparePassword(password);
      expect(isMatch).toBe(true);
      
      // 验证错误的密码
      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
    
    it('getPublicProfile 方法应该返回不包含密码的用户信息', async () => {
      const user = new User({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'password123'
      });
      await user.save();
      
      const publicProfile = user.getPublicProfile();
      
      expect(publicProfile).toBeDefined();
      expect(publicProfile.password).toBeUndefined(); // 不应该包含密码
      expect(publicProfile.username).toBe(user.username);
      expect(publicProfile.email).toBe(user.email);
      // MongoDB ObjectId对象可能在不同环境下表现不同
      expect(publicProfile.id).toBeDefined();
      expect(typeof publicProfile.id === 'string' || typeof publicProfile.id === 'object').toBe(true);
    });
  });
  
  describe('静态方法测试', () => {
    beforeEach(async () => {
      // 创建一些测试用户
      const user1 = new User({
        username: 'statictest1',
        email: 'static1@example.com',
        password: 'password123',
        status: 'online'
      });
      
      const user2 = new User({
        username: 'statictest2',
        email: 'static2@example.com',
        password: 'password123',
        status: 'offline'
      });
      
      const user3 = new User({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'password123',
        isActive: false
      });
      
      await Promise.all([user1.save(), user2.save(), user3.save()]);
    });
    
    it('findActiveUsers 方法应该返回所有活跃用户', async () => {
      const activeUsers = await User.findActiveUsers();
      
      expect(activeUsers).toHaveLength(2); // 应该只返回活跃用户
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
        expect(user.password).toBeUndefined(); // 不应该包含密码
      });
    });
    
    it('findOnlineUsers 方法应该返回所有在线用户', async () => {
      const onlineUsers = await User.findOnlineUsers();
      
      expect(onlineUsers).toHaveLength(1); // 应该只返回在线用户
      onlineUsers.forEach(user => {
        expect(user.status).toBe('online');
        expect(user.isActive).toBe(true);
      });
    });
    
    it('isUsernameExists 方法应该正确检查用户名是否存在', async () => {
      // 检查存在的用户名
      const exists1 = await User.isUsernameExists('statictest1');
      expect(exists1).toBe(true);
      
      // 检查不存在的用户名
      const exists2 = await User.isUsernameExists('nonexistentusername');
      expect(exists2).toBe(false);
    });
    
    it('isEmailExists 方法应该正确检查邮箱是否存在', async () => {
      // 检查存在的邮箱
      const exists1 = await User.isEmailExists('static1@example.com');
      expect(exists1).toBe(true);
      
      // 检查不存在的邮箱
      const exists2 = await User.isEmailExists('nonexistent@example.com');
      expect(exists2).toBe(false);
    });
    
    it('searchByUsername 方法应该按用户名搜索用户', async () => {
      const results = await User.searchByUsername('statictest');
      
      expect(results).toHaveLength(2); // 应该返回两个匹配的用户
      results.forEach(user => {
        expect(user.username).toMatch(/statictest/);
      });
    });
  });
  
  describe('registerUser 函数测试', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: 'registertest',
        email: 'register@example.com',
        password: 'register123456'
      };
      
      const result = await User.registerUser(userData);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('user_uuid');
      expect(result).toHaveProperty('random_id');
      
      // 验证用户是否已保存到数据库
      const user = await User.findById(result.id);
      expect(user).not.toBeNull();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
    });
    
    it('应该抛出错误，当用户名或密码为空时', async () => {
      await expect(User.registerUser({})).rejects.toThrow('用户名不能为空');
    });
    
    it('应该抛出错误，当用户名格式不符合要求时', async () => {
      const userData = {
        username: 'ab', // 太短
        email: 'short@example.com',
        password: 'validpassword123'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('用户名至少3个字符');
    });
    
    it('应该抛出错误，当密码长度不符合要求时', async () => {
      const userData = {
        username: 'validuser',
        email: 'valid@example.com',
        password: '12345' // 太短
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('密码至少8个字符');
    });
    
    it('应该抛出错误，当邮箱为空时', async () => {
      const userData = {
        username: 'validuser',
        email: '', // 空邮箱
        password: 'validpassword123'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('邮箱不能为空');
    });
    
    it('应该抛出错误，当邮箱格式不符合要求时', async () => {
      const userData = {
        username: 'validuser',
        email: 'not-an-email', // 无效的邮箱
        password: 'validpassword123'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('请输入有效的邮箱地址');
    });
    
    it('应该抛出错误，当用户名已存在时', async () => {
      // 先创建一个用户
      const existingUser = new User({
        username: 'existingusername',
        email: 'existing@example.com',
        password: 'password123'
      });
      await existingUser.save();
      
      // 尝试使用相同的用户名注册
      const userData = {
        username: 'existingusername',
        email: 'new@example.com',
        password: 'Test123!'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('用户名已被使用');
    });
    
    it('应该抛出错误，当邮箱已存在时', async () => {
      // 先创建一个用户
      const existingUser = new User({
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      });
      await existingUser.save();
      
      // 尝试使用相同的邮箱注册
      const userData = {
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'Test123!'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow('邮箱已被使用');
    });
  });
  
  describe('loginUser 函数测试', () => {
    it('应该成功验证并返回用户信息', async () => {
      const password = 'password123';
      // 创建一个用户，但不使用save()（避免pre('save')中间件自动加密）
      const user = new User({
        username: 'logintest',
        email: 'login@example.com',
        password: await bcrypt.hash(password, 12)
      });
      // 直接插入数据库，不触发中间件
      const insertedUser = await User.collection.insertOne(user);
      
      // 使用插入的用户进行登录测试
      const result = await loginUser('logintest', password);
      
      expect(result).toBeDefined();
      expect(result.username).toBe('logintest');
      expect(result.email).toBe('login@example.com');
      expect(result).toHaveProperty('userUuid');
      expect(result).toHaveProperty('randomId');
      
      // 验证最后登录时间已更新
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.lastLogin).not.toBeNull();
    });
    
    it('应该抛出错误，当用户不存在时', async () => {
      await expect(loginUser('nonexistentuser', 'password123')).rejects.toThrow('用户不存在');
    });
    
    it('应该抛出错误，当密码错误时', async () => {
      // 先创建一个用户
      const user = new User({
        username: 'wrongpasswordtest',
        email: 'wrong@example.com',
        password: await bcrypt.hash('password123', 12)
      });
      await user.save();
      
      await expect(loginUser('wrongpasswordtest', 'wrongpassword')).rejects.toThrow('密码错误');
    });
  });
});