import React, { useState, useEffect } from 'react';
import Message from '../models/message';
import chatService from '../services/chatService';
import './ChatWindow.css';

const ChannelWindow = ({ currentUser, channel }) => {
  const [messages, setMessages] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // 初始化聊天服务
    chatService.connect(currentUser);
    
    // 检查用户权限
    setIsAdmin(channel.creator === currentUser.id);
    
    // 添加消息处理器
    chatService.addMessageHandler((message) => {
      if (message.channelId === channel.id) {
        setMessages(prev => [...prev, message]);
      }
    });
    
    // 加载历史消息
    chatService.socket.emit('getChannelMessages', {
      channelId: channel.id,
      limit: 50
    });
    
    return () => {
      chatService.disconnect();
    };
  }, [currentUser, channel]);

  const handleSendPost = () => {
    if (newPost.trim() && (isAdmin || !channel.adminOnlyPost)) {
      const message = new Message({
        senderId: currentUser.id,
        channelId: channel.id,
        content: newPost,
        type: 'text'
      });
      
      chatService.socket.emit('sendChannelMessage', {
        ...message,
        timestamp: message.timestamp
      });
      
      setMessages(prev => [...prev, message]);
      setNewPost('');
    }
  };

  return (
    <div className="chat-window channel">
      <div className="chat-header">
        <h3># {channel.name}</h3>
        <div className="channel-description">
          {channel.description}
        </div>
      </div>
      
      <div className="messages-container">
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
      
      {(isAdmin || !channel.adminOnlyPost) && (
        <div className="message-input">
          <input
            type="text"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="发布频道消息..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendPost()}
          />
          <button onClick={handleSendPost}>发布</button>
        </div>
      )}
    </div>
  );
};

export default ChannelWindow;