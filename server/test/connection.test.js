const mongoose = require('mongoose');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hallochat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// 设置测试超时时间
jest.setTimeout(30000);

describe('MongoDB连接测试', () => {
  test('MongoDB连接应该成功', async () => {
    try {
      // 连接MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
      });
      
      console.log('MongoDB连接成功！');
      expect(mongoose.connection.readyState).toBe(1); // 1表示已连接
      
      // 断开连接
      await mongoose.connection.close();
      console.log('MongoDB连接已断开！');
    } catch (error) {
      console.error('MongoDB连接失败:', error.message);
      throw error;
    }
  });

  test('数据库操作应该成功', async () => {
    try {
      // 连接MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
      });
      
      // 获取数据库列表
      const adminDb = mongoose.connection.db.admin();
      const databases = await adminDb.listDatabases();
      
      console.log('可用数据库:', databases.databases.map(db => db.name));
      expect(Array.isArray(databases.databases)).toBe(true);
      
      // 断开连接
      await mongoose.connection.close();
    } catch (error) {
      console.error('数据库操作失败:', error.message);
      throw error;
    }
  });
});