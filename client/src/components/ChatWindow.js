import React, { useState, useEffect, useRef } from 'react';
import Message from '../models/message';
import chatService from '../services/chatService';
import './ChatWindow.css';

function ChatWindow({ currentUser, contact }) {
    const [editContent, setEditContent] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [isGroupChat, setIsGroupChat] = useState(false);

    const messageMenuRef = useRef(null);

    // 初始化聊天类型（单聊或群聊）
    useEffect(() => {
        setIsGroupChat(contact && contact.type === 'group');
    }, [contact]);

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
        if (!currentUser || !contact) return;

        // 初始化聊天服务
        chatService.connect(currentUser);

        // 添加消息处理器
        chatService.addMessageHandler((message) => {
            // 确保消息属于当前聊天
            const isMessageForCurrentChat = 
                (!isGroupChat && (message.senderId === contact.id || message.receiverId === contact.id)) ||
                (isGroupChat && message.groupId === contact.id);

            if (isMessageForCurrentChat) {
                setMessages(prev => [...prev, message]);

                // 自动标记接收到的消息为已读
                if (message.senderId !== currentUser.id) {
                    chatService.markAsRead(message.id);
                }
            }
        });

        // 添加已读状态处理器
        chatService.addReadHandler((messageId, receiverId) => {
            setMessages(prev => prev.map(msg => msg.id === messageId ? {
                ...msg,
                isRead: true,
                receiverId,
                syncStatus: 'synced'
            } : msg
            ));
        });

        // 添加同步状态处理器
        chatService.addSyncHandler((messageId, status) => {
            setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, syncStatus: status } : msg
            ));
        });

        // 添加输入状态处理器
        chatService.addTypingHandler((userId, typingStatus) => {
            if (!isGroupChat && userId === contact.id) {
                setIsTyping(typingStatus);
            }
        });

        // 添加撤回消息处理器
        chatService.addRecallHandler((messageId) => {
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    const recalledMessage = new Message({
                        ...msg,
                        isRecalled: true,
                        content: '[消息已撤回]',
                        originalContent: msg.content,
                        canBeEdited: (new Date().getTime() - msg.timestamp) < 120000
                    });
                    recalledMessage.recall();
                    return recalledMessage;
                }
                return msg;
            }));
        });

        // 添加编辑消息处理器
        chatService.addEditHandler((messageId, newContent) => {
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? {
                    ...msg,
                    content: newContent,
                    isEdited: true,
                    timestamp: new Date().getTime()
                } : msg
            ));
        });

        // 监听消息状态更新
        chatService.addStatusHandler((messageId, status) => {
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, status } : msg
            ));
        });

        // 加载历史消息 - 将函数移到内部以避免依赖问题
        const loadHistoryMessages = async () => {
            try {
                // 这里应该调用API获取历史消息
                // 暂时使用模拟数据
                console.log('加载历史消息:', contact.id);
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
        if (!newMessage.trim()) {
            setError('发送内容不能为空');
            return;
        }

        try {
            setError(null);
            let message;
            
            if (isGroupChat) {
                // 发送群组消息
                message = chatService.sendGroupMessage(contact.id, newMessage);
            } else {
                // 发送单聊消息
                message = chatService.sendMessage(contact.id, newMessage);
            }
            
            setMessages(prev => [...prev, message]);
            setNewMessage('');
            
            // 发送后停止输入状态
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

    const handleRecallMessage = async (messageId) => {
        try {
            setError(null);
            await chatService.recallMessage(messageId);
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
            
            await chatService.editMessage(messageId, editContent);
            setEditingMessageId(null);
        } catch (err) {
            setError('编辑消息失败: ' + err.message);
        }
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
                {messages.length === 0 ? (
                    <div className="no-messages">
                        暂无消息，开始聊天吧！
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={message.id || index}
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(message.id)} />
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
                                {message.status === 'sending' && ' ↻'}
                                {message.status === 'error' && ' ⚠'}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="message-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="输入消息..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                <button onClick={handleSendMessage}>发送</button>
            </div>
        </div>
    );
};

export default ChatWindow;