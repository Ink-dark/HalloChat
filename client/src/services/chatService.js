import { io } from 'socket.io-client';
import Message from '../models/message';

class ChatService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    // 默认从localStorage获取服务器地址，没有则为空
    this.serverAddress = localStorage.getItem('halloChat_server') || '';
    this.messageHandlers = [];
    this.typingHandlers = [];
    this.statusHandlers = [];
    this.recallHandlers = [];
    this.editHandlers = [];
    this.readHandlers = [];
    this.syncHandlers = []; // 用于同步状态
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

    // 监听已读状态更新
    this.socket.on('read', ({ messageId, receiverId }) => {
      this.readHandlers.forEach(handler => handler(messageId, receiverId));
    });

    // 监听消息撤回
    this.socket.on('recallMessage', ({ messageId }) => {
      this.recallHandlers.forEach(handler => handler(messageId));
    });

    // 监听消息编辑
    this.socket.on('editMessage', ({ messageId, newContent }) => {
      this.editHandlers.forEach(handler => handler(messageId, newContent));
    });

    // 监听同步状态（用于处理消息发送/接收的状态同步）
    this.socket.on('syncStatus', ({ messageId, status }) => {
      this.syncHandlers.forEach(handler => handler(messageId, status));
    });

    // 监听错误
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  // 发送消息
  sendMessage(receiverId, content, type = 'text', groupId = null, channelId = null) {
    const message = new Message({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 临时ID
      senderId: this.currentUser.id,
      receiverId,
      content,
      type,
      timestamp: new Date().getTime(),
      status: 'sending',
      syncStatus: 'pending'
    });
    
    // 发送消息到服务器
    this.socket.emit('message', {
      content,
      type,
      receiverId,
      groupId,
      channelId
    });
    
    return message;
  }

  // 发送群组消息
  sendGroupMessage(groupId, content, type = 'text', channelId = null) {
    return this.sendMessage(null, content, type, groupId, channelId);
  }

  // 更新输入状态
  setTypingStatus(receiverId, isTyping) {
    this.socket.emit('typing', {
      receiverId,
      isTyping
    });
  }

  // 更新群组输入状态
  setGroupTypingStatus(groupId, isTyping) {
    this.socket.emit('typing', {
      groupId,
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

  // 添加同步状态处理器
  addSyncHandler(handler) {
    this.syncHandlers.push(handler);
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
      this.socket.emit('recallMessage', { messageId });
      
      // 监听服务器响应
      const handleResponse = (response) => {
        if (response.success) {
          this.recallHandlers.forEach(handler => handler(messageId));
          resolve(response);
        } else {
          reject(response.error);
        }
        // 移除临时监听器
        this.socket.off('recallMessageResponse', handleResponse);
      };
      
      this.socket.on('recallMessageResponse', handleResponse);
      
      // 设置超时处理
      setTimeout(() => {
        this.socket.off('recallMessageResponse', handleResponse);
        reject(new Error('撤回消息超时'));
      }, 5000);
    });
  }
  
  // 编辑消息
  editMessage(messageId, newContent) {
    return new Promise((resolve, reject) => {
      this.socket.emit('editMessage', { 
        messageId, 
        newContent 
      });
      
      // 监听服务器响应
      const handleResponse = (response) => {
        if (response.success) {
          this.editHandlers.forEach(handler => handler(messageId, newContent));
          resolve(response);
        } else {
          reject(response.error);
        }
        // 移除临时监听器
        this.socket.off('editMessageResponse', handleResponse);
      };
      
      this.socket.on('editMessageResponse', handleResponse);
      
      // 设置超时处理
      setTimeout(() => {
        this.socket.off('editMessageResponse', handleResponse);
        reject(new Error('编辑消息超时'));
      }, 5000);
    });
  }
  
  // 标记消息为已读
  markAsRead(messageId) {
    // 服务端不返回确认，直接执行
    this.socket.emit('read', { messageId });
    
    // 立即更新本地状态
    this.readHandlers.forEach(handler => handler(messageId));
    
    return Promise.resolve({ success: true });
  }
}

const chatService = new ChatService();
export default chatService;