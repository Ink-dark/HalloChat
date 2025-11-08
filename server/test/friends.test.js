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
const Friend = require('../src/models/Friend');

// 测试用户数据
const testUsers = {
  user1: {
    username: 'testuser1',
    email: 'test1@example.com',
    password: 'password123'
  },
  user2: {
    username: 'testuser2',
    email: 'test2@example.com',
    password: 'password123'
  },
  user3: {
    username: 'testuser3',
    email: 'test3@example.com',
    password: 'password123'
  }
};

let user1Token, user2Token, user3Token;
let user1Id, user2Id, user3Id;

// 测试前准备
describe('好友功能测试', () => {
  beforeAll(async () => {
    // 增加超时时间
    jest.setTimeout(30000);
    
    // 清空测试数据
    await User.deleteMany({});
    await Friend.deleteMany({});
    
    // 创建测试用户
    const user1 = await User.create(testUsers.user1);
    const user2 = await User.create(testUsers.user2);
    const user3 = await User.create(testUsers.user3);
    
    user1Id = user1._id;
    user2Id = user2._id;
    user3Id = user3._id;
    
    // 获取用户token
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.user1.email,
        password: testUsers.user1.password
      });
    user1Token = res1.body.data.token;
    
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.user2.email,
        password: testUsers.user2.password
      });
    user2Token = res2.body.data.token;
    
    const res3 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.user3.email,
        password: testUsers.user3.password
      });
    user3Token = res3.body.data.token;
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('发送好友请求', () => {
    test('应该成功发送好友请求', async () => {
      const response = await request(app)
        .post('/friends/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          message: '你好，我想加你为好友'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requester._id.toString()).toBe(user1Id.toString());
      expect(response.body.data.recipient._id.toString()).toBe(user2Id.toString());
      expect(response.body.data.status).toBe('pending');
    });
    
    test('不能重复发送好友请求', async () => {
      const response = await request(app)
        .post('/friends/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user2Id,
          message: '重复请求'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
    
    test('不能添加自己为好友', async () => {
      const response = await request(app)
        .post('/friends/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: user1Id,
          message: '添加自己'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    test('缺少recipientId应该返回错误', async () => {
      const response = await request(app)
        .post('/friends/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: '测试消息'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('获取待处理的好友请求', () => {
    test('应该成功获取待处理的好友请求', async () => {
      const response = await request(app)
        .get('/friends/requests/pending')
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const request = response.body.data[0];
      expect(request.recipient._id.toString()).toBe(user2Id.toString());
      expect(request.status).toBe('pending');
    });
    
    test('没有待处理请求时返回空数组', async () => {
      const response = await request(app)
        .get('/friends/requests/pending')
        .set('Authorization', `Bearer ${user3Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });
  
  describe('接受好友请求', () => {
    let friendRequestId;
    
    beforeAll(async () => {
      // 获取待处理的请求ID
      const response = await request(app)
        .get('/friends/requests/pending')
        .set('Authorization', `Bearer ${user2Token}`);
      
      friendRequestId = response.body.data[0]._id;
    });
    
    test('应该成功接受好友请求', async () => {
      const response = await request(app)
        .put(`/friends/requests/${friendRequestId}/accept`)
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
    });
    
    test('无权接受他人的好友请求', async () => {
      const response = await request(app)
        .put(`/friends/requests/${friendRequestId}/accept`)
        .set('Authorization', `Bearer ${user3Token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
    
    test('接受不存在的请求应该返回错误', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/friends/requests/${fakeId}/accept`)
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('获取好友列表', () => {
    test('应该成功获取好友列表', async () => {
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const friend = response.body.data[0];
      expect(friend.friend).toBeDefined();
      expect(friend.friend._id.toString()).toBe(user2Id.toString());
    });
    
    test('新用户的好友列表应该为空', async () => {
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${user3Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });
  
  describe('搜索用户', () => {
    test('应该成功搜索用户', async () => {
      const response = await request(app)
        .get('/friends/search?keyword=testuser')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // 搜索结果应该排除自己
      const hasSelf = response.body.data.some(user => user._id.toString() === user1Id.toString());
      expect(hasSelf).toBe(false);
    });
    
    test('关键词太短应该返回错误', async () => {
      const response = await request(app)
        .get('/friends/search?keyword=t')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    test('没有搜索结果时返回空数组', async () => {
      const response = await request(app)
        .get('/friends/search?keyword=nonexistent')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });
  
  describe('删除好友', () => {
    let friendId;
    
    beforeAll(async () => {
      // 获取好友关系ID
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${user1Token}`);
      
      friendId = response.body.data[0].id;
    });
    
    test('应该成功删除好友', async () => {
      const response = await request(app)
        .delete(`/friends/${friendId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('好友关系已删除');
    });
    
    test('删除不存在的朋友关系应该返回错误', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/friends/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('更新好友备注', () => {
    let friendId;
    
    beforeAll(async () => {
      // 重新建立好友关系
      await Friend.sendFriendRequest(user1Id, user2Id, '重新添加');
      await Friend.acceptFriendRequest((await Friend.findOne({ requester: user1Id, recipient: user2Id }))._id, user2Id);
      
      // 获取好友关系ID
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${user1Token}`);
      
      friendId = response.body.data[0].id;
    });
    
    test('应该成功更新好友备注', async () => {
      const response = await request(app)
        .put(`/friends/${friendId}/alias`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          alias: '测试好友备注'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alias).toBe('测试好友备注');
    });
    
    test('备注为空应该返回错误', async () => {
      const response = await request(app)
        .put(`/friends/${friendId}/alias`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          alias: ''
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    test('备注过长应该返回错误', async () => {
      const longAlias = 'a'.repeat(51);
      const response = await request(app)
        .put(`/friends/${friendId}/alias`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          alias: longAlias
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('星标好友', () => {
    let friendId;
    
    beforeAll(async () => {
      // 获取好友关系ID
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${user1Token}`);
      
      friendId = response.body.data[0].id;
    });
    
    test('应该成功星标好友', async () => {
      const response = await request(app)
        .put(`/friends/${friendId}/star`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          isStarred: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('好友已星标');
    });
    
    test('应该成功取消星标好友', async () => {
      const response = await request(app)
        .put(`/friends/${friendId}/star`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          isStarred: false
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('好友已取消星标');
    });
    
    test('无权操作他人的好友关系', async () => {
      const response = await request(app)
        .put(`/friends/${friendId}/star`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          isStarred: true
        });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});