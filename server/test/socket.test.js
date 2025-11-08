// 简单的Socket.io测试，专注于核心功能验证
const http = require('http');
const socketIo = require('socket.io');
const { io: clientIo } = require('socket.io-client');

let httpServer;
let io;

// 测试前的设置
beforeAll(() => {
  // 设置必要的环境变量以通过配置验证
  process.env.MONGODB_URI = 'mongodb://localhost/test';
});

describe('Socket.io功能测试', () => {
  beforeEach(async () => {
    // 创建HTTP服务器和Socket.io实例
    httpServer = http.createServer();
    io = socketIo(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // 设置Socket.io事件处理（简化版）
    io.on('connection', (socket) => {
      socket.on('test-event', (data) => {
        socket.emit('test-response', { received: data });
      });
    });
    
    // 启动HTTP服务器
    await new Promise((resolve) => httpServer.listen(3001, resolve));
  });
  
  afterEach(async () => {
    // 关闭Socket.io服务器和HTTP服务器
    if (io) {
      io.close();
    }
    
    if (httpServer) {
      await new Promise(resolve => {
        httpServer.close(err => {
          if (err) console.error('HTTP server close error:', err);
          resolve();
        });
      });
    }
  });
  
  it('should successfully connect to the server', async () => {
    // 创建一个Promise来处理连接事件
    const connectPromise = new Promise((resolve) => {
      const client = clientIo('http://localhost:3001', {
        transports: ['websocket']
      });
      
      client.on('connect', () => {
        client.disconnect();
        resolve();
      });
    });
    
    // 等待连接完成并验证
    await connectPromise;
  });
  
  it('should handle basic event communication', async () => {
    // 创建一个Promise来处理事件响应
    const eventPromise = new Promise((resolve) => {
      const client = clientIo('http://localhost:3001', {
        transports: ['websocket']
      });
      
      client.on('test-response', (response) => {
        expect(response.received).toBe('test-data');
        client.disconnect();
        resolve();
      });
      
      // 发送测试事件
      client.on('connect', () => {
        client.emit('test-event', 'test-data');
      });
    });
    
    // 等待事件处理完成
    await eventPromise;
  });
});