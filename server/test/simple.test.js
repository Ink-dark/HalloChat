// 在测试开始前设置环境变量
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '7933';
process.env.LOG_LEVEL = 'error';

const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/app');
const app = server.app; // 获取Express应用实例
const User = require('../src/models/user.model');

// 测试前准备
describe('简单测试', () => {
  beforeAll(async () => {
    // 增加超时时间
    jest.setTimeout(30000);
    
    // 清空测试数据
    await User.deleteMany({});
    
    // 创建测试用户
    await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  test('健康检查应该成功', async () => {
    const response = await request(app)
      .get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  
  test('登录应该成功', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});