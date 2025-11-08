// 在导入任何模块之前设置环境变量
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'default_jwt_secret_32_characters_long';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('../src/routes/auth');
const { User } = require('../src/models/user.model');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

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

// 生成唯一的测试用户名和邮箱，确保不超过20个字符
const generateUniqueTestData = () => {
  const timestamp = Date.now().toString().slice(-8);
  return {
    username: `test${timestamp}`, // 确保用户名不超过20个字符
    email: `test${timestamp}@example.com`,
    password: 'Valid123!'
  };
};

describe('注册验证规则测试', () => {
  describe('POST /api/auth/register', () => {
    // 有效的注册数据模板
    const validUserData = generateUniqueTestData();

    // 成功注册的测试
    it('应该成功注册新用户，当所有字段都有效时', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('注册成功');
      expect(response.body.data).toHaveProperty('token');
    });

    // 用户名验证测试
    describe('用户名验证', () => {
      it('应该返回400错误，当用户名为空时', async () => {
        const invalidData = { ...validUserData, username: '' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当用户名少于最小长度时', async () => {
        // 用户名长度小于最小长度要求
        const invalidData = { ...validUserData, username: 'ab' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当用户名超过最大长度时', async () => {
        // 用户名长度超过20个字符
        const longUsername = 'a'.repeat(21);
        const invalidData = { ...validUserData, username: longUsername };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当用户名包含非法字符时', async () => {
        // 包含空格和特殊字符
        const invalidData = { ...validUserData, username: 'user name!' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该允许中文用户名，当符合长度和格式要求时', async () => {
        const validData = { ...validUserData, username: '测试用户123' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(validData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('注册成功');
      });

      it('应该允许用户名包含下划线，当符合长度和格式要求时', async () => {
        const validData = { ...validUserData, username: 'test_user_123' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(validData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('注册成功');
      });
    });

    // 邮箱验证测试
    describe('邮箱验证', () => {
      it('应该返回400错误，当邮箱为空时', async () => {
        const invalidData = { ...validUserData, email: '' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
      });

      it('应该返回400错误，当邮箱格式无效时（缺少@符号）', async () => {
        const invalidData = { ...validUserData, email: 'invalid-email' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当邮箱格式无效时（缺少域名）', async () => {
        const invalidData = { ...validUserData, email: 'user@' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当邮箱格式无效时（缺少用户名部分）', async () => {
        const invalidData = { ...validUserData, email: '@example.com' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        // 不依赖param字段，只检查有错误返回
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该允许有效的邮箱格式', async () => {
        const validData = { ...validUserData, email: 'user.name+tag@example.co.uk' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(validData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('注册成功');
      });
    });

    // 密码验证测试
    describe('密码验证', () => {
      it('应该返回400错误，当密码为空时', async () => {
        const invalidData = { ...validUserData, password: '' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
      });

      it('应该返回400错误，当密码少于最小长度时', async () => {
        // 根据更新后的规则，密码最小长度为8
        const invalidData = { ...validUserData, password: 'Pass1!' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        expect(response.body.errors.some(err => 
          err.msg.includes('密码长度必须在')
        )).toBe(true);
      });

      it('应该返回400错误，当密码超过最大长度时', async () => {
        // 根据规则，密码最大长度为60
        const longPassword = 'A'.repeat(61);
        const invalidData = { ...validUserData, password: longPassword };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        expect(response.body.errors.some(err => 
          err.msg.includes('密码长度必须在')
        )).toBe(true);
      });

      it('应该返回400错误，当密码只包含字母和数字时', async () => {
        // 根据新规则，密码必须包含特殊字符
        const invalidData = { ...validUserData, password: 'Password123' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当密码只包含字母和特殊字符时', async () => {
        // 根据新规则，密码必须包含数字
        const invalidData = { ...validUserData, password: 'Password!@$' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该返回400错误，当密码只包含数字和特殊字符时', async () => {
        // 根据新规则，密码必须包含字母
        const invalidData = { ...validUserData, password: '12345678!@$' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('应该允许有效的密码格式（包含大写字母、小写字母、数字和特殊字符）', async () => {
        // 符合新规则的有效密码：包含大写字母、小写字母、数字和特殊字符
        const validData = { ...validUserData, password: 'Abc123!@$' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(validData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('注册成功');
      });

      it('应该允许有效的密码格式（包含多种特殊字符）', async () => {
        // 包含多种特殊字符的有效密码
        const validData = { ...validUserData, password: 'Passw0rd!@#$%^&*()' };
        const response = await request(app)
          .post('/api/auth/register')
          .send(validData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('注册成功');
      });
    });

    // 多字段验证错误测试
    it('应该返回400错误，当多个字段都不符合要求时', async () => {
      const invalidData = {
        username: 'ab', // 太短
        email: 'not-an-email', // 无效邮箱
        password: '123' // 太短且格式不符合要求
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('输入验证失败');
      // 应该有至少3个错误（每个字段一个）
      expect(response.body.errors.length).toBeGreaterThanOrEqual(3);
    });

    // 数据库唯一性测试
    it('应该返回409错误，当用户名已存在于数据库中时', async () => {
      // 先创建一个用户
      const user = new User({
        username: validUserData.username,
        email: validUserData.email,
        password: validUserData.password
      });
      await user.save();
      
      // 尝试使用相同的用户名注册
      const duplicateData = {
        ...validUserData,
        email: 'different@example.com'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名已被使用');
    });

    it('应该返回409错误，当邮箱已存在于数据库中时', async () => {
      // 先创建一个用户
      const user = new User({
        username: validUserData.username,
        email: validUserData.email,
        password: validUserData.password
      });
      await user.save();
      
      // 尝试使用相同的邮箱注册
      const duplicateData = {
        ...validUserData,
        username: 'differentuser'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('邮箱已被使用');
    });
  });
});