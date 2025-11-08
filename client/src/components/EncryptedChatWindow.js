import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import Message from '../models/message';
import encryptedChatService from '../services/encryptedChatService';
import './ChatWindow.css';

const EncryptedChatWindow = ({ currentUser, contact, encryptionKey }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  
  useEffect(() => {
    // 初始化加密聊天服务
    encryptedChatService.connect(currentUser, encryptionKey);
    
    // 添加消息处理器
    encryptedChatService.addMessageHandler((message) => {
      if (message?.senderId === contact?.id || message?.receiverId === contact?.id) {
        setMessages(prev => [...prev, message]);
      }
    });
    
    // 添加销毁处理器
    encryptedChatService.addDestructHandler((messageId) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });
    
    return () => {
      encryptedChatService.disconnect();
    };
  }, [currentUser, contact, encryptionKey]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = encryptedChatService.sendEncryptedMessage(
          contact?.id || '', 
          newMessage,
          true // 阅后即焚
        );
      
      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="chat-window encrypted">
      <div className="chat-header">
        <h3>{contact?.username || '未知用户'} 🔒</h3>
        <div className="security-indicator">
          {isSecure ? '端到端加密' : '不安全'}
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message?.senderId === currentUser?.id ? 'sent' : 'received'}`}
          >
            <p>{message.content}</p>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.isSelfDestruct && ' ⏳'}
            </span>
          </div>
        ))}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="输入加密消息..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>发送</button>
      </div>
    </div>
  );
};

export default EncryptedChatWindow;