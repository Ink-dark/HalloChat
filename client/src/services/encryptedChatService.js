import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';
import Message from '../models/message';

class EncryptedChatService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.encryptionKey = null;
    this.messageHandlers = [];
    this.destructHandlers = [];
  }

  // 初始化加密连接
  connect(user, encryptionKey) {
    this.currentUser = user;
    this.encryptionKey = encryptionKey;
    this.socket = io('http://localhost:5000/encrypted', {
      query: { 
        userId: user.id,
        isEncrypted: true
      }
    });

    // 监听加密消息
    this.socket.on('encryptedMessage', (encryptedData) => {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData.content, this.encryptionKey);
        const decryptedContent = bytes.toString(CryptoJS.enc.Utf8);
        
        const message = new Message({
          ...encryptedData,
          content: decryptedContent,
          isEncrypted: true
        });
        
        this.messageHandlers.forEach(handler => handler(message));
        
        // 阅后即焚处理
        if (encryptedData.isSelfDestruct) {
          setTimeout(() => {
            this.destructHandlers.forEach(handler => handler(message.id));
          }, 5000); // 5秒后销毁
        }
      } catch (error) {
        console.error('解密失败:', error);
      }
    });
  }

  // 发送加密消息
  sendEncryptedMessage(receiverId, content, isSelfDestruct = false) {
    try {
      const encryptedContent = CryptoJS.AES.encrypt(content, this.encryptionKey).toString();
      
      const message = new Message({
        senderId: this.currentUser.id,
        receiverId,
        content: encryptedContent,
        isEncrypted: true,
        isSelfDestruct,
        type: 'text'
      });
      
      this.socket.emit('sendEncryptedMessage', {
        ...message,
        timestamp: message.timestamp
      });
      
      return message;
    } catch (error) {
      console.error('加密失败:', error);
      return null;
    }
  }

  // 添加消息处理器
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  // 添加销毁处理器
  addDestructHandler(handler) {
    this.destructHandlers.push(handler);
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new EncryptedChatService();