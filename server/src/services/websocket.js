const WebSocket = require('ws');
const Message = require('../models/message');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
    
    this.wss.on('connection', (ws, req) => {
      const userId = req.headers['user-id'];
      if (!userId) {
        return ws.close(4001, '未提供用户ID');
      }
      
      this.clients.set(userId, ws);
      
      ws.on('message', async (message) => {
        try {
          const { type, data } = JSON.parse(message);
          
          switch (type) {
            case 'message':
              const { receiverId, content } = data;
              const newMessage = new Message({
                senderId: userId,
                receiverId,
                content
              });
              await newMessage.save();
              
              // 推送消息给接收者
              if (this.clients.has(receiverId)) {
                this.clients.get(receiverId).send(JSON.stringify({
                  type: 'message',
                  data: newMessage
                }));
              }
              break;
              
            case 'typing':
              if (this.clients.has(data.receiverId)) {
                this.clients.get(data.receiverId).send(JSON.stringify({
                  type: 'typing',
                  data: { senderId: userId, typing: data.typing }
                }));
              }
              break;
              
            case 'read':
              if (this.clients.has(data.senderId)) {
                this.clients.get(data.senderId).send(JSON.stringify({
                  type: 'read',
                  data: { messageId: data.messageId }
                }));
              }
              break;
          }
        } catch (err) {
          console.error('WebSocket消息处理错误:', err);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(userId);
      });
    });
  }
}

module.exports = WebSocketService;