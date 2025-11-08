// 设置测试环境变量（必须在导入app之前设置）
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '7933';
process.env.LOG_LEVEL = 'error';

const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/app');
const app = server.app;
const User = require('../src/models/user.model');

// 设置测试超时时间
jest.setTimeout(30000);

describe('基础功能测试', () => {
  let user1Token, user2Token;
  let user1Id, user2Id;

  beforeAll(async () => {
    // 清空测试数据
    await User.deleteMany({});
    
    // 创建测试用户
    const user1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    });
    
    const user2 = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });
    
    user1Id = user1._id;
    user2Id = user2._id;
    
    // 获取用户token
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test1@example.com',
        password: 'password123'
      });
    user1Token = res1.body.data.token;
    
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'password123'
      });
    user2Token = res2.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('健康检查应该成功', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('登录应该成功', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test1@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  test('获取用户信息应该成功', async () => {
    const response = await request(app)
      .get('/api/users/profile')
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
        recipientId: user2Id,
        message: '你好，我想加你为好友'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.requester._id.toString()).toBe(user1Id.toString());
    expect(response.body.data.recipient._id.toString()).toBe(user2Id.toString());
  });
});