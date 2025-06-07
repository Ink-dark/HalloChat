import { io } from 'socket.io-client';
import Message from '../models/message';
import User from '../models/user';

class ChatService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.serverAddress = 'http://localhost:5000';
    this.messageHandlers = [];
    this.typingHandlers = [];
    this.statusHandlers = [];
    this.recallHandlers = [];
    this.editHandlers = [];
    this.readHandlers = [];
  }

  // 设置服务器地址
  setServerAddress(address) {
    this.serverAddress = address;
  }

  // 初始化连接
  connect(user) {
    this.currentUser = user;
    this.socket = io(this.serverAddress, {
      query: { userId: user.id }
    });

    // 监听消息
    this.socket.on('message', (messageData) => {
      const message = new Message(messageData);
      this.messageHandlers.forEach(handler => handler(message));
    });

    // 监听输入状态
    this.socket.on('typing', ({ userId, isTyping }) => {
      this.typingHandlers.forEach(handler => handler(userId, isTyping));
    });

    // 监听消息状态更新
    this.socket.on('messageStatus', ({ messageId, status }) => {
      this.statusHandlers.forEach(handler => handler(messageId, status));
    });
  }

  // 发送消息
  sendMessage(receiverId, content, type = 'text') {
    const message = new Message({
      senderId: this.currentUser.id,
      receiverId,
      content,
      type
    });
    
    this.socket.emit('sendMessage', {
      ...message,
      timestamp: message.timestamp
    });
    
    return message;
  }

  // 更新输入状态
  setTypingStatus(receiverId, isTyping) {
    this.socket.emit('typing', {
      userId: this.currentUser.id,
      receiverId,
      isTyping
    });
  }

  // 添加消息处理器
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  // 添加输入状态处理器
  addTypingHandler(handler) {
    this.typingHandlers.push(handler);
  }

  // 添加消息状态处理器
  addStatusHandler(handler) {
    this.statusHandlers.push(handler);
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  // 撤回消息
  recallMessage(messageId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('recallMessage', { messageId }, (response) => {
        if (response.success) {
          this.recallHandlers.forEach(handler => handler(messageId));
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }
  
  // 编辑消息
  editMessage(messageId, newContent) {
    return new Promise((resolve, reject) => {
      this.socket.emit('editMessage', { 
        messageId, 
        newContent 
      }, (response) => {
        if (response.success) {
          this.editHandlers.forEach(handler => handler(messageId, newContent));
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }
  
  // 添加撤回消息处理器
  addRecallHandler(handler) {
    this.recallHandlers.push(handler);
  }
  
  // 添加编辑消息处理器
  addEditHandler(handler) {
    this.editHandlers.push(handler);
  }
  
  // 添加已读状态处理器
  addReadHandler(handler) {
    this.readHandlers.push(handler);
  }
  
  // 标记消息为已读
  markAsRead(messageId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('read', { messageId }, (response) => {
        if (response.success) {
          this.readHandlers.forEach(handler => handler(messageId));
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }
}

export default new ChatService();