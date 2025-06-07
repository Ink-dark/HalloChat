import React, { useState, useEffect } from 'react';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import GroupChatWindow from './GroupChatWindow';
import Settings from './Settings';
import Login from './Login';
import Logout from './Logout';
import Notification from './Notification';
import './MainWindow.css';

const MainWindow = ({ currentUser, onLoginSuccess }) => {
  const [activeView, setActiveView] = useState(currentUser ? 'contacts' : 'login');
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

  const handleLogout = () => {
    setShowLogout(true);
  };

  const handleConfirmLogout = () => {
    // 登出逻辑
    onLoginSuccess(null);
    setActiveView('login');
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
          设置
        </button>
        <ContactList 
          currentUser={currentUser}
          onContactSelect={(contact) => {
            setSelectedContact(contact);
            setSelectedGroup(null);
            setActiveView('chat');
          }}
          onGroupSelect={(group) => {
            setSelectedGroup(group);
            setSelectedContact(null);
            setActiveView('group-chat');
          }}
        />
      </div>
      
      <div className="content-area">
        {activeView === 'login' && (
          <Login onLoginSuccess={onLoginSuccess} />
        )}
        
        {activeView === 'contacts' && (
          <div className="welcome-view">
            <h2>欢迎使用HalloChat</h2>
            <p>请从左侧选择联系人开始聊天</p>
          </div>
        )}
        
        {showLogout && (
          <Logout 
            onLogoutSuccess={handleConfirmLogout} 
          />
        )}
        
        {activeView === 'chat' && selectedContact && (
          <ChatWindow currentUser={currentUser} contact={selectedContact} />
        )}
        
        {activeView === 'group-chat' && selectedGroup && (
          <GroupChatWindow currentUser={currentUser} group={selectedGroup} />
        )}
        
        {showSettings && (
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