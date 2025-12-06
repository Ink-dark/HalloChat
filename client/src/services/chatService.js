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

  // 保存消息到本地存储
  saveMessageToLocal(message) {
    try {
      const key = `messages_${this.currentUser.id}_${message.type === 'group' ? message.groupId : message.receiverId || message.senderId}`;
      const messages = this.getMessagesFromLocal(key);
      const existingMessageIndex = messages.findIndex(m => m.id === message.id);
      
      if (existingMessageIndex >= 0) {
        // 更新现有消息
        messages[existingMessageIndex] = message;
      } else {
        // 添加新消息
        messages.push(message);
      }
      
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('保存消息到本地存储失败:', error);
    }
  }

  // 从本地存储获取消息
  getMessagesFromLocal(key) {
    try {
      const messages = localStorage.getItem(key);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('从本地存储获取消息失败:', error);
      return [];
    }
  }

  // 获取与特定联系人/群组的聊天记录
  getChatHistory(contactId, isGroup = false) {
    const key = `messages_${this.currentUser.id}_${isGroup ? contactId : contactId}`;
    return this.getMessagesFromLocal(key);
  }

  // 同步未发送成功的消息
  syncPendingMessages() {
    try {
      // 遍历所有本地存储的消息，查找状态为pending的消息
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`messages_${this.currentUser.id}_`)) {
          const messages = this.getMessagesFromLocal(key);
          const pendingMessages = messages.filter(m => m.syncStatus === 'pending' || m.status === 'sending');
          
          pendingMessages.forEach(message => {
            console.log(`重新发送消息: ${message.id}`);
            // 更新消息状态为sending
            message.status = 'sending';
            this.saveMessageToLocal(message);
            
            // 重新发送消息到服务器
            if (message.type === 'group' || message.groupId) {
              this.socket.emit('message', {
                content: message.content,
                type: message.type,
                receiverId: message.receiverId,
                groupId: message.groupId,
                channelId: message.channelId
              });
            } else {
              this.socket.emit('message', {
                content: message.content,
                type: message.type,
                receiverId: message.receiverId,
                groupId: message.groupId,
                channelId: message.channelId
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('同步未发送消息失败:', error);
    }
  }

  // 设置服务器地址
  setServerAddress(address) {
    this.serverAddress = address;
  }

  // 初始化连接
  connect(user) {
    this.currentUser = user;
    this.socket = io(this.serverAddress, {
      query: { userId: user.id },
      reconnection: true,           // 启用自动重连
      reconnectionAttempts: Infinity, // 无限次重连尝试
      reconnectionDelay: 1000,       // 重连延迟（毫秒）
      reconnectionDelayMax: 5000,    // 最大重连延迟（毫秒）
      timeout: 20000,               // 连接超时时间（毫秒）
      transports: ['websocket']      // 使用websocket传输
    });

    // 监听消息
    this.socket.on('message', (messageData) => {
      const message = new Message(messageData);
      // 保存接收的消息到本地存储
      this.saveMessageToLocal(message);
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

    // 监听连接成功
    this.socket.on('connect', () => {
      console.log('WebSocket连接成功');
      // 重新同步未发送成功的消息
      this.syncPendingMessages();
    });

    // 监听连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket连接断开:', reason);
    });

    // 监听重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket重连尝试 #${attemptNumber}`);
    });

    // 监听重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket重连成功，尝试次数: ${attemptNumber}`);
      // 重新同步未发送成功的消息
      this.syncPendingMessages();
    });

    // 监听重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket重连失败');
    });

    // 监听连接超时
    this.socket.on('connect_timeout', (timeout) => {
      console.error(`WebSocket连接超时: ${timeout}ms`);
    });

    // 监听错误
    this.socket.on('error', (error) => {
      console.error('WebSocket错误:', error);
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
    
    // 保存消息到本地存储
    this.saveMessageToLocal(message);
    
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