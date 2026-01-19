import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusSquareOutlined, 
  MoreOutlined, 
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import './ContactList.css';

const ContactList = ({ 
  contacts, 
  currentUser, 
  onSelectContact,
  onStartEncryptedChat,
  onCreateGroup,
  onCreateChannel,
  onShowSettings,
  onLogout,
  isLoading = false,
  serverConnected = false,
  settings = {}
}) => {
  const [activeContact, setActiveContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);
  
  useEffect(() => {
    const filtered = (contacts || []).filter(contact => 
      (contact?.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    setFilteredContacts(filtered);
  }, [contacts, searchTerm]);
  
  const handleSelectContact = (contact) => {
    setActiveContact(contact.id);
    onSelectContact(contact);
  };
  
  const handleMenuItemClick = (action) => {
    setShowDropdown(false);
    action();
  };
  
  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h2>Messages</h2>
        <div className="header-actions">
          <button className="action-btn" onClick={onCreateGroup} title="New Message">
            <PlusSquareOutlined style={{ fontSize: '20px' }} />
          </button>
          <div className="dropdown-wrapper" ref={dropdownRef}>
            <button 
              className="action-btn" 
              onClick={() => setShowDropdown(!showDropdown)} 
              title="More"
            >
              <MoreOutlined style={{ fontSize: '20px' }} />
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => handleMenuItemClick(onShowSettings)}>
                  <SettingOutlined /> <span>设置</span>
                </div>
                <div className="dropdown-item" onClick={() => handleMenuItemClick(() => alert('个人资料'))}>  
                  <UserOutlined /> <span>个人资料</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item danger" onClick={() => handleMenuItemClick(onLogout)}>
                  <LogoutOutlined /> <span>退出登录</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="search-container">
        <div className="search-box">
          <SearchOutlined className="search-icon" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="contacts-scroll">
        {isLoading ? (
          <div className="loading-indicator">
            <p>加载中...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="empty-contacts">
            <p>暂无联系人</p>
            {!serverConnected && (
              <p className="demo-mode-tip">当前为演示模式</p>
            )}
          </div>
        ) : (
          (searchTerm ? filteredContacts : contacts || []).map(contact => (
          <div 
            key={contact.id} 
            className={`contact-item ${activeContact === contact.id ? 'active' : ''}`}
            onClick={() => handleSelectContact(contact)}
          >
            <div className="avatar-wrapper">
              <div className="avatar-placeholder">
                {contact?.username?.charAt(0) || '?'}
                <div className={`status-dot ${contact.onlineStatus ? 'online' : 'offline'}`}></div>
              </div>
            </div>
            
            <div className="contact-main">
              <div className="contact-top">
                <span className="contact-name">{contact?.username || 'Unknown'}</span>
                <span className="contact-time">{contact?.time || ''}</span>
              </div>
              <div className="contact-bottom">
                <span className="last-message">{contact?.lastMessage || ''}</span>
                {contact?.unread > 0 && (
                  <span className="unread-badge">{contact.unread}</span>
                )}
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;