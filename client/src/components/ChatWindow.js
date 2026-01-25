import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  AppstoreOutlined,
  PaperClipOutlined,
  SmileOutlined,
  SendOutlined
} from '@ant-design/icons';
// import Message from '../models/message'; // 暂时未使用，保留以备后续消息模型扩展使用
import chatService from '../services/chatService';
import './ChatWindow.css';

function ChatWindow({ currentUser, contact }) {
    // const [editContent, setEditContent] = useState(''); // 暂时未使用，保留以备后续消息编辑功能使用
    // const [editingMessageId, setEditingMessageId] = useState(null); // 暂时未使用，保留以备后续消息编辑功能使用
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    // const [isTyping, setIsTyping] = useState(false); // 暂时未使用，保留以备后续 typing 状态显示使用
    // const [error, setError] = useState(null); // 暂时未使用，保留以备后续错误处理使用
    // 暂时添加 setError 函数以避免编译错误
    const setError = (err) => console.error('Error:', err);
    const [isGroupChat, setIsGroupChat] = useState(false);

    // const messageMenuRef = useRef(null); // 暂时未使用，保留以备后续消息菜单功能使用
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 初始化聊天类型（单聊或群聊）
    useEffect(() => {
        setIsGroupChat(contact && contact.type === 'group');
    }, [contact]);

    // const handleEditMessage = (messageId, content) => {
    //     setEditingMessageId(messageId);
    //     setEditContent(content);
    // }; // 暂时未使用，保留以备后续消息编辑功能使用

    // const showMessageMenu = (e, message) => {
    //     const menu = messageMenuRef.current;
    //     if (menu) {
    //         menu.style.display = 'block';
    //         menu.style.left = `${e.clientX}px`;
    //         menu.style.top = `${e.clientY}px`;

    //         // 设置当前选中的消息
    //         menu.setAttribute('data-message-id', message.id);
    //         menu.setAttribute('data-message-content', message.content);

    //         // 点击其他地方关闭菜单
    //         const closeMenu = () => {
    //             menu.style.display = 'none';
    //             document.removeEventListener('click', closeMenu);
    //         };
    //         document.addEventListener('click', closeMenu);
    //     }
    // }; // 暂时未使用，保留以备后续消息菜单功能使用

    useEffect(() => {
        if (!currentUser || !contact) return;

        // 初始化聊天服务
        chatService.connect(currentUser);

        // 添加消息处理器
        chatService.addMessageHandler((message) => {
            const isMessageForCurrentChat = 
                (!isGroupChat && (message.senderId === contact.id || message.receiverId === contact.id)) ||
                (isGroupChat && message.groupId === contact.id);

            if (isMessageForCurrentChat) {
                setMessages(prev => [...prev, message]);
                if (message.senderId !== currentUser.id) {
                    chatService.markAsRead(message.id);
                }
            }
        });

        // 加载历史消息
        const loadHistoryMessages = async () => {
            try {
                const mockHistoryMessages = [
                    {
                        id: 'msg1',
                        senderId: contact.id,
                        receiverId: currentUser.id,
                        content: 'Can you send me the files?',
                        type: 'text',
                        timestamp: Date.now() - 3600000,
                        isRead: true,
                        isDelivered: true,
                        status: 'delivered',
                        syncStatus: 'synced'
                    }
                ];
                setMessages(mockHistoryMessages);
            } catch (err) {
                setError('加载历史消息失败: ' + err.message);
            }
        };
        
        loadHistoryMessages();

        return () => {
            chatService.disconnect();
        };
    }, [currentUser, contact, isGroupChat]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        try {
            setError(null);
            let message;
            
            if (isGroupChat) {
                message = chatService.sendGroupMessage(contact.id, newMessage);
            } else {
                message = chatService.sendMessage(contact.id, newMessage);
            }
            
            setMessages(prev => [...prev, message]);
            setNewMessage('');
            
            if (isGroupChat) {
                chatService.setGroupTypingStatus(contact.id, false);
            } else {
                chatService.setTypingStatus(contact.id, false);
            }
        } catch (err) {
            setError('发送消息失败: ' + err.message);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        const typingStatus = e.target.value.length > 0;
        
        if (isGroupChat) {
            chatService.setGroupTypingStatus(contact.id, typingStatus);
        } else {
            chatService.setTypingStatus(contact.id, typingStatus);
        }
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="contact-info">
                    <div className="chat-avatar">
                        {contact.username?.charAt(0)}
                    </div>
                    <div className="chat-name-wrapper">
                        <h3>{contact.username}</h3>
                        <span className="chat-status">{contact.onlineStatus ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                <div className="chat-header-actions">
                    <button className="icon-btn"><PhoneOutlined /></button>
                    <button className="icon-btn"><VideoCameraOutlined /></button>
                    <button className="icon-btn"><AppstoreOutlined /></button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((message, index) => (
                    <div
                        key={message.id || index}
                        className={`message-wrapper ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
                    >
                        <div className="message-bubble">
                            <p>{message.content}</p>
                            <span className="message-time">
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-footer">
                <div className="input-actions">
                    <button className="icon-btn"><PaperClipOutlined /></button>
                    <button className="icon-btn"><SmileOutlined /></button>
                </div>
                <div className="message-input-wrapper">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                </div>
                <button className="send-btn" onClick={handleSendMessage}>
                    <SendOutlined />
                </button>
            </div>
        </div>
    );
}

export default ChatWindow;