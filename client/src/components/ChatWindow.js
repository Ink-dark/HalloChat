import React, { useState, useEffect, useRef } from 'react';
import Message from '../models/message';
import chatService from '../services/chatService';
import './ChatWindow.css';

const ChatWindow = ({ currentUser, contact }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState(null);

  const messageMenuRef = useRef(null);

  const handleEditMessage = (messageId, content) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };
  
  const showMessageMenu = (e, message) => {
    const menu = messageMenuRef.current;
    if (menu) {
      menu.style.display = 'block';
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      
      // 设置当前选中的消息
      menu.setAttribute('data-message-id', message.id);
      menu.setAttribute('data-message-content', message.content);
      
      // 点击其他地方关闭菜单
      const closeMenu = () => {
        menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      };
      document.addEventListener('click', closeMenu);
    }
  };
  
  useEffect(() => {
    // 初始化聊天服务
    chatService.connect(currentUser);
    
    // 添加消息处理器
    chatService.addMessageHandler((message) => {
      if (message.senderId === contact.id || message.receiverId === contact.id) {
        setMessages(prev => [...prev, message]);
        
        // 自动标记接收到的消息为已读
        if (message.senderId === contact.id) {
          chatService.markAsRead(message.id);
        }
      }
    });
    
    // 添加已读状态处理器
    chatService.addReadHandler((messageId, deviceId) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { 
          ...msg, 
          isRead: true,
          deviceId,
          syncStatus: 'synced'
        } : msg
      ));
    });
    
    // 添加同步状态处理器
    chatService.addSyncHandler((messageId, status) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, syncStatus: status } : msg
      ));
    });
    
    // 添加输入状态处理器
    chatService.addTypingHandler((userId, typingStatus) => {
      if (userId === contact.id) {
        setIsTyping(typingStatus);
      }
    });
    
    return () => {
      chatService.disconnect();
    };
  }, [currentUser, contact]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      setError('发送内容不能为空');
      return;
    }
    
    const message = chatService.sendMessage(contact.id, newMessage);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    chatService.setTypingStatus(contact.id, e.target.value.length > 0);
  };



  return (
    <div className="chat-window">
      {error && <div className="error-message">{error}</div>}
      <div className="message-menu" ref={messageMenuRef}>
        <button onClick={() => handleRecallMessage(messageMenuRef.current.getAttribute('data-message-id'))}>
          撤回消息
        </button>
        <button onClick={() => handleEditMessage(
          messageMenuRef.current.getAttribute('data-message-id'),
          messageMenuRef.current.getAttribute('data-message-content')
        )}>
          编辑消息
        </button>
      </div>
      
      <div className="chat-header">
        <h3>{contact.username}</h3>
        <div className="status-indicator">
          {contact.onlineStatus ? '在线' : '离线'}
          {isTyping && <span className="typing-indicator">正在输入...</span>}
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
            onContextMenu={(e) => {
              e.preventDefault();
              if (message.senderId === currentUser.id) {
                showMessageMenu(e, message);
              }
            }}
          >
            {editingMessageId === message.id ? (
              <>
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(message.id)}
                />
                <button onClick={() => handleEditSubmit(message.id)}>保存</button>
                <button onClick={() => setEditingMessageId(null)}>取消</button>
              </>
            ) : (
              <p>
                {message.isRecalled ? (
                  <>
                    [消息已撤回]
                    {message.canBeEdited && (
                      <button 
                        className="edit-recalled-btn"
                        onClick={() => handleEditMessage(message.id, message.originalContent)}
                      >
                        重新编辑
                      </button>
                    )}
                  </>
                ) : message.content}
              </p>
            )}
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.isEdited && ' (已编辑)'}
              {message.isRead && ' ✓✓'}
              {message.isDelivered && !message.isRead && ' ✓'}
              {message.syncStatus === 'synced' && ' ↻'}
              {message.syncStatus === 'conflict' && ' ⚠'}
            </span>
          </div>
        ))}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="输入消息..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>发送</button>
      </div>
    </div>
  );
};





  const [error, setError] = useState(null);

  const handleRecallMessage = async (messageId) => {
    try {
      setError(null);
      const success = await chatService.recallMessage(messageId);
      if (success) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const message = new Message({
              ...msg,
              isRecalled: true,
              content: '[消息已撤回]',
              originalContent: msg.content,
              canBeEdited: (new Date().getTime() - msg.timestamp) < 120000
            });
            message.recall();
            return message;
          }
          return msg;
        }));
      }
    } catch (err) {
      setError('撤回消息失败: ' + err.message);
    }
  };







  const handleEditSubmit = async (messageId) => {
    try {
      setError(null);
      if (!editContent.trim()) {
        setError('编辑内容不能为空');
        return;
      }
      
      const success = await chatService.editMessage(messageId, editContent);
      if (success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            content: editContent, 
            isEdited: true,
            timestamp: new Date().toISOString() 
          } : msg
        ));
        setEditingMessageId(null);
      } else {
        setError('编辑消息失败: 服务器未响应');
      }
    } catch (err) {
      setError('编辑消息失败: ' + err.message);
      console.error('编辑消息失败:', err);
    }
  };





export default ChatWindow;