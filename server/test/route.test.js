// 路由功能测试 - 直接测试路由逻辑
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '7933';
process.env.LOG_LEVEL = 'error';

// 设置测试超时时间
jest.setTimeout(30000);

// 导入路由和中间件
const authRoutes = require('../src/routes/auth');
const userRoutes = require('../src/routes/users');
const friendRoutes = require('../src/routes/friends');
const { authenticateToken } = require('../src/middleware/auth');

// 创建测试服务器
function createTestServer() {
  const app = express();
  app.use(express.json());
  
  // 挂载路由
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/friends', friendRoutes);
  
  return app;
}

describe('路由功能测试', () => {
  let app;
  let user1Token, user2Token;
  let user1Id, user2Id;

  beforeAll(async () => {
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    // 创建测试服务器
    app = createTestServer();
    
    // 清空测试数据
    const User = require('../src/models/user.model');
    await User.deleteMany({});
    
    // 创建测试用户 - 使用registerUser方法确保密码正确哈希
    try {
      const user1 = await User.registerUser({
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'Password123!'
      });
      
      const user2 = await User.registerUser({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'Password123!'
      });
      
      console.log('用户1数据:', JSON.stringify(user1, null, 2));
      console.log('用户2数据:', JSON.stringify(user2, null, 2));
      
      user1Id = user1.id || user1._id;
      user2Id = user2.id || user2._id;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
    
    // 获取用户token
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser1',
        password: 'Password123!'
      });
    
    console.log('第一个用户登录响应:', JSON.stringify(res1.body, null, 2));
    
    if (!res1.body.data || !res1.body.data.token) {
      throw new Error(`第一个用户登录失败: ${JSON.stringify(res1.body)}`);
    }
    
    user1Token = res1.body.data.token;
    console.log('第一个用户token:', user1Token);
   // 获取第二个用户的token
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser2',
        password: 'Password123!'
      });
    
    console.log('第二个用户登录响应:', JSON.stringify(res2.body, null, 2));
    
    if (!res2.body.data || !res2.body.data.token) {
      throw new Error(`第二个用户登录失败: ${JSON.stringify(res2.body)}`);
    }
    
    user2Token = res2.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('用户注册应该成功', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.username).toBe('newuser');
  });

  test('用户登录应该成功', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser1',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  test('获取用户信息应该成功', async () => {
    const response = await request(app)
      .get(`/api/users/${user1Id}`)
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.username).toBe('testuser1');
  });

  test('搜索用户应该成功', async () => {
    const response = await request(app)
      .get('/api/friends/search?keyword=testuser')
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('发送好友请求应该成功', async () => {
    const response = await request(app)
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        recipientId: user2Id.toString(),
        message: '你好，我想加你为好友'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});