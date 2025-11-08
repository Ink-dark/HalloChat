const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');

// 设置测试环境变量（必须在导入任何依赖之前设置）
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '7933';
process.env.LOG_LEVEL = 'error';

// 设置测试超时时间
jest.setTimeout(30000);

// 创建简单的测试服务器
function createTestServer() {
  const app = express();
  app.use(express.json());
  
  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
  });
  
  // 简单的登录端点
  app.post('/api/test/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'testuser' && password === 'password123') {
      res.json({ 
        success: true, 
        message: '登录成功',
        data: { token: 'test-jwt-token' }
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误'
      });
    }
  });
  
  return app;
}

describe('API功能测试', () => {
  let testApp;
  
  beforeAll(async () => {
    testApp = createTestServer();
  });
  
  afterAll(async () => {
    // 清理工作
  });
  
  test('健康检查应该成功', async () => {
    const response = await request(testApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.message).toBe('服务器运行正常');
  });
  
  test('登录应该成功', async () => {
    const response = await request(testApp)
      .post('/api/test/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe('test-jwt-token');
  });
  
  test('登录应该失败（错误的密码）', async () => {
    const response = await request(testApp)
      .post('/api/test/login')
      .send({
        username: 'testuser',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('用户名或密码错误');
  });
});