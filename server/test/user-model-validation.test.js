// 直接测试User模型的验证规则

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/user.model');

let mongoServer;

// 在所有测试前设置MongoDB内存服务器
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// 在每个测试后清理数据库
afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

// 在所有测试后关闭连接
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User模型验证规则测试', () => {
  describe('用户名验证', () => {
    // 测试有效用户名
    it('应该创建有效的用户名（3-20个字符，只包含字母、数字、下划线和中文）', async () => {
      const validUsernames = [
        'user123',
        'user_name',
        '用户名称',
        'user123_用户名'
      ];
      
      for (const username of validUsernames) {
        const user = new User({
          username,
          email: `test+${Date.now().toString().slice(-6)}@example.com`,
          password: 'Valid123!'
        });
        
        const savedUser = await user.save();
        expect(savedUser.username).toBe(username);
      }
    });

    // 测试用户名太短
    it('应该抛出错误，当用户名为空时', async () => {
      const user = new User({
        username: '',
        email: 'test@example.com',
        password: 'Valid123!'
      });
      
      await expect(user.save()).rejects.toThrow('用户名不能为空');
    });

    it('应该抛出错误，当用户名长度小于3个字符时', async () => {
      const user = new User({
        username: 'ab',
        email: 'test@example.com',
        password: 'Valid123!'
      });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('应该抛出错误，当用户名长度大于20个字符时', async () => {
      const user = new User({
        username: 'a'.repeat(21),
        email: 'test@example.com',
        password: 'Valid123!'
      });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('应该抛出错误，当用户名包含不允许的字符时', async () => {
      const invalidUsernames = ['user@123', 'user#name', 'user name'];
      
      for (const username of invalidUsernames) {
        const user = new User({
          username,
          email: `test+${Date.now()}+${Math.random().toString(36).substr(2, 5)}@example.com`,
          password: 'Valid123!'
        });
        
        await expect(user.save()).rejects.toThrow();
      }
    });
  });

  describe('邮箱验证', () => {
    it('应该创建有效的邮箱', async () => {
      const validEmails = [
        'test@example.com',
        'test.user@example.co.uk',
        'test+tag@example.com'
      ];
      
      for (const email of validEmails) {
        // 确保用户名不超过20个字符
        const shortTimestamp = Date.now().toString().slice(-8);
        const user = new User({
          username: `test${shortTimestamp}`,
          email,
          password: 'Valid123!'
        });
        
        const savedUser = await user.save();
        expect(savedUser.email).toBe(email.toLowerCase());
      }
    });

    it('应该抛出错误，当邮箱为空时', async () => {
      const user = new User({
        username: 'testuser',
        email: '',
        password: 'Valid123!'
      });
      
      await expect(user.save()).rejects.toThrow('邮箱不能为空');
    });

    it('应该抛出错误，当邮箱格式无效时', async () => {
      const invalidEmails = ['test', 'test@', 'test@example'];
      
      for (const email of invalidEmails) {
        const user = new User({
          username: `test${Date.now()}+${Math.random().toString(36).substr(2, 5)}`,
          email,
          password: 'Valid123!'
        });
        
        await expect(user.save()).rejects.toThrow();
      }
    });
  });

  describe('密码验证', () => {
    // 注意：在User模型中，密码的最大长度是60，而不是constants.js中的20
    it('应该创建有效的密码（长度在8-60个字符之间）', async () => {
      const validPasswords = [
        'Test123!',
        'a'.repeat(8),
        'a'.repeat(60),
        'A1!a'.repeat(15)
      ];
      
      for (const password of validPasswords) {
        // 确保用户名不超过20个字符
        const shortTimestamp = Date.now().toString().slice(-8);
        const user = new User({
          username: `test${shortTimestamp}`,
          email: `test${shortTimestamp}@example.com`,
          password
        });
        
        const savedUser = await user.save();
        expect(savedUser.password).not.toBe(password); // 密码应该被哈希
        expect(savedUser.password.length).toBeGreaterThanOrEqual(password.length); // 哈希后的密码更长或等于
      }
    });

    it('应该抛出错误，当密码为空时', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: ''
      });
      
      await expect(user.save()).rejects.toThrow('密码不能为空');
    });

    it('应该抛出错误，当密码长度小于6个字符时', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Ab1!'
      });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('应该抛出错误，当密码长度大于60个字符时', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'A'.repeat(61)
      });
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('registerUser静态方法测试', () => {
    it('应该成功注册有效的用户', async () => {
      // 确保用户名不超过20个字符
      const shortTimestamp = Date.now().toString().slice(-8);
      const userData = {
        username: `test${shortTimestamp}`,
        email: `test${shortTimestamp}@example.com`,
        password: 'Valid123!'
      };
      
      const user = await User.registerUser(userData);
      
      expect(user).toHaveProperty('id');
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user).not.toHaveProperty('password'); // 不应该返回密码
    });

    it('应该抛出错误，当用户名为空时', async () => {
      const userData = {
        username: '',
        email: 'test@example.com',
        password: 'Valid123!'
      };
      
      await expect(User.registerUser(userData)).rejects.toThrow();
    });

    it('应该抛出错误，当用户已存在时', async () => {
      // 先创建一个用户
      const userData = {
        username: `test${Date.now()}`,
        email: `test+${Date.now()}@example.com`,
        password: 'Valid123!'
      };
      
      await User.registerUser(userData);
      
      // 尝试再次使用相同的用户名和邮箱注册
      await expect(User.registerUser(userData)).rejects.toThrow();
    });
  });
});