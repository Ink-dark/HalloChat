import React, { useState, useEffect } from 'react';
import Message from '../models/message';
import chatService from '../services/chatService';
import './ChatWindow.css';

const GroupChatWindow = ({ currentUser, group }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // 初始化聊天服务
    chatService.connect(currentUser);
    
    // 添加消息处理器
    chatService.addMessageHandler((message) => {
      if (message.groupId === group.id) {
        setMessages(prev => [...prev, message]);
        setUnreadCount(prev => prev + 1);
      }
    });
    
    return () => {
      chatService.disconnect();
    };
  }, [currentUser, group]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = new Message({
        senderId: currentUser.id,
        groupId: group.id,
        content: newMessage,
        type: 'text'
      });
      
      chatService.socket.emit('sendGroupMessage', {
        ...message,
        timestamp: message.timestamp
      });
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleMarkAsRead = () => {
    setUnreadCount(0);
    // 通知服务器已读
    chatService.socket.emit('markGroupAsRead', {
      groupId: group.id,
      userId: currentUser.id
    });
  };

  return (
    <div className="chat-window group">
      <div className="chat-header">
        <h3>{group.name}</h3>
        <div className="unread-indicator">
          {unreadCount > 0 && `${unreadCount}条未读`}
        </div>
      </div>
      
      <div className="messages-container" onClick={handleMarkAsRead}>
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
          >
            <p>{message.content}</p>
            <span className="message-sender">
              {message.senderId === currentUser.id ? '你' : message.senderId}
            </span>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="输入群消息..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>发送</button>
      </div>
    </div>
  );
};

export default GroupChatWindow;