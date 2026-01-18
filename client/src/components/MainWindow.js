import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import GroupChatWindow from './GroupChatWindow';
import Settings from './Settings';
import Logout from './Logout';
import Notification from './Notification';
import './MainWindow.css';

const MainWindow = ({ currentUser, onLoginSuccess, onLogout }) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('contacts');
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [settings, setSettings] = useState({
    sidebarStyle: 'default',
    chatListStarred: false,
    chatListPinned: false,
    theme: 'light'
  });

  // 组件挂载时检查用户是否已登录
  useEffect(() => {
    if (!currentUser) {
      // 如果用户未登录，触发登出操作
      if (onLogout) {
        onLogout();
      }
    }
  }, [currentUser, onLogout]);

  const handleLogout = () => {
    setShowLogout(true);
  };

  const handleConfirmLogout = () => {
    // 调用父组件传来的登出函数
    if (onLogout) {
      onLogout();
    }
    setShowLogout(false);
  };

  return (
    <div className={`main-window ${settings.theme}`}>
      <Notification currentUser={currentUser} />
      <div className="sidebar">
        <button 
          className="settings-btn"
          onClick={() => setShowSettings(!showSettings)}
        >
          {t('main.settings')}
        </button>
        <ContactList 
          currentUser={currentUser}
          contacts={[
            { id: 'user2', username: '好友1', onlineStatus: true, isStarred: false, isPinned: false, type: 'user' },
            { id: 'user3', username: '好友2', onlineStatus: false, isStarred: true, isPinned: false, type: 'user' },
            { id: 'user4', username: '好友3', onlineStatus: true, isStarred: false, isPinned: true, type: 'user' },
          ]}
          onSelectContact={(contact) => {
            setSelectedContact(contact);
            setSelectedGroup(null);
            setActiveView('chat');
          }}
          onStartEncryptedChat={() => console.log('开始加密聊天')}
          onCreateGroup={() => console.log('创建群组')}
          onCreateChannel={() => console.log('创建频道')}
        />
      </div>
      
      <div className="content-area">
        {!currentUser && (
          <div className="login-required-view">
            <h2>{t('main.pleaseLogin')}</h2>
            <p>{t('main.redirectingToLogin')}</p>
          </div>
        )}
        
        {currentUser && activeView === 'contacts' && (
          <div className="welcome-view">
            <h2>{t('main.welcomeBack')}，{currentUser.username}</h2>
            <p>{t('main.selectContactToChat')}</p>
          </div>
        )}
        
        {currentUser && showLogout && (
          <Logout 
            onLogoutSuccess={handleConfirmLogout} 
          />
        )}
        
        {currentUser && activeView === 'chat' && selectedContact && (
          <ChatWindow currentUser={currentUser} contact={selectedContact} />
        )}
        
        {currentUser && activeView === 'group-chat' && selectedGroup && (
          <GroupChatWindow currentUser={currentUser} group={selectedGroup} />
        )}
        
        {currentUser && showSettings && (
          <Settings 
            currentUser={currentUser}
            onLogout={handleLogout}
            onSettingsChange={setSettings}
          />
        )}
      </div>
    </div>
  );
};

export default MainWindow;