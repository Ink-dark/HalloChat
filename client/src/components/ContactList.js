import React, { useState, useEffect } from 'react';
import './ContactList.css';

const ContactList = ({ 
  contacts, 
  currentUser, 
  onSelectContact,
  onStartEncryptedChat,
  onCreateGroup,
  onCreateChannel,
  settings = {}
}) => {
  const handleSettingChange = (contactId, settings) => {
    // 处理联系人设置变更的逻辑
    console.log('Contact settings changed:', contactId, settings);
  };

  const [localContacts, setLocalContacts] = useState([
    { id: 'user2', username: '好友1', onlineStatus: true, isStarred: false, isPinned: false },
    { id: 'user3', username: '好友2', onlineStatus: false, isStarred: true, isPinned: false },
    { id: 'user4', username: '好友3', onlineStatus: true, isStarred: false, isPinned: true },
  ]);
  
  const toggleStar = (contactId) => {
    const starredCount = localContacts.filter(c => c.isStarred).length;
    const contact = localContacts.find(c => c.id === contactId);
    
    if (!contact.isStarred && starredCount >= 15) {
      alert('星标用户已达上限(15人)');
      return;
    }
    
    setLocalContacts(localContacts.map(contact => 
      contact.id === contactId 
        ? { ...contact, isStarred: !contact.isStarred } 
        : contact
    ));
  };
  
  const togglePin = (contactId) => {
    setLocalContacts(localContacts.map(contact => 
      contact.id === contactId 
        ? { ...contact, isPinned: !contact.isPinned } 
        : contact
    ));
  };
  const [activeContact, setActiveContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  
  useEffect(() => {
    const filtered = (contacts || []).filter(contact => 
      (contact?.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (contact?.uniqueId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    setFilteredContacts(filtered);
  }, [contacts, searchTerm]);
  
  const handleSelectContact = (contact) => {
    setActiveContact(contact.id);
    onSelectContact(contact);
  };
  
  const handleEncryptedChat = (e, contact) => {
    e.stopPropagation();
    setActiveContact(contact.id);
    onStartEncryptedChat(contact);
  };

  return (
    <div className="contact-list">
      <div className="user-profile">
        <div className="avatar">{currentUser?.username?.charAt(0) || '?'}</div>
        <div className="user-info">
          <h3>{currentUser?.username || '未登录'}</h3>
          <p className={currentUser?.onlineStatus ? 'online' : 'offline'}>
            {currentUser?.onlineStatus ? '在线' : '离线'}
          </p>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="btn-primary" 
          onClick={onCreateGroup}
          title="创建新的群组聊天"
        >
          新建群组
        </button>
        <button 
          className="btn-secondary" 
          onClick={onCreateChannel}
          title="创建新的频道"
        >
          创建频道
        </button>
      </div>
      
      <div className="contacts">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索联系人ID或名称"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="contact-list-header">
        <h4>联系人</h4>
        <div className="contact-list-filters">
          {settings.chatListStarred && <span>⭐</span>}
          {settings.chatListPinned && <span>📌</span>}
        </div>
      </div>
        <div className="contacts-scroll">
          {(searchTerm ? filteredContacts : contacts || []).filter(contact => {
    if (settings.chatListStarred && !contact.isStarred) return false;
    if (settings.chatListPinned && !contact.isPinned) return false;
    return true;
  }).map(contact => (
            <div 
              key={contact.id} 
              className={`contact-item ${activeContact === contact.id ? 'active' : ''}`}
              onClick={() => handleSelectContact(contact)}
            >
              <div className="avatar">{contact?.username?.charAt(0) || '?'}</div>
              <div className="contact-info">
                <h4>{contact?.username || '未知用户'}</h4>
                <p className={contact?.onlineStatus ? 'online' : 'offline'}>
                  {contact?.onlineStatus ? '在线' : `最后在线: ${contact?.lastOnlineTime ? new Date(contact.lastOnlineTime).toLocaleString() : '未知'}`}
                </p>
              </div>
              <div className="contact-actions">
                <button 
                  className="sound-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const sound = prompt(`设置${contact?.username || '未知用户'}的消息铃声:
1. 默认
2. 叮咚
3. 铃声
4. 钟声
5. 自定义`, (settings?.soundSchemes?.contacts?.[contact.id] || 'default'));
                    if (sound) {
                      const newSoundSchemes = {
                        ...settings.soundSchemes,
                        contacts: {
                          ...settings.soundSchemes.contacts,
                          [contact.id]: sound
                        }
                      };
                      handleSettingChange('soundSchemes', newSoundSchemes);
                    }
                  }}
                  title="设置消息铃声"
                >
                  🔔
                </button>
                <button 
                  className="star-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(contact.id);
                  }}
                >
                  {contact.isStarred ? '★' : '☆'}
                </button>
                <button 
                  className="pin-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(contact.id);
                  }}
                >
                  {contact.isPinned ? '📌' : '📍'}
                </button>
                <button 
                  className="encrypted-btn"
                  onClick={(e) => handleEncryptedChat(e, contact)}
                  title="开始端到端加密聊天"
                >
                  🔒 加密
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContactList;