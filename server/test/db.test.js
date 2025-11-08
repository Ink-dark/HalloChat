const mongoose = require('mongoose');

// 设置测试超时时间
jest.setTimeout(30000);

describe('数据库连接测试', () => {
  beforeAll(async () => {
    // 设置测试用的MongoDB URI
    process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
    
    // 连接数据库
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('数据库连接成功');
    } catch (error) {
      console.error('数据库连接失败:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已断开');
  });

  test('数据库连接应该成功', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 表示已连接
  });

  test('应该能够执行简单的数据库操作', async () => {
    // 创建一个临时的集合来测试
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    
    // 插入一条测试数据
    const testDoc = new TestModel({ name: 'test' });
    await testDoc.save();
    
    // 查询测试数据
    const foundDoc = await TestModel.findOne({ name: 'test' });
    expect(foundDoc).toBeTruthy();
    expect(foundDoc.name).toBe('test');
    
    // 清理测试数据
    await TestModel.deleteMany({ name: 'test' });
  });
});