import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import GroupChatWindow from './GroupChatWindow';
import Settings from './Settings';
import Logout from './Logout';
import authService from '../services/authService';
import contactService from '../services/contactService';
import './MainWindow.css';

const MainWindow = ({ currentUser, onLoginSuccess, onLogout }) => {
  const { t } = useTranslation();
  const [activeView] = useState('contacts'); // 保留用于视图切换功能
  // const setActiveView = useState('contacts')[1]; // 暂时未使用，保留以备后续视图切换功能使用
  const [selectedContact] = useState(null); // 保留用于联系人选择功能
  // const setSelectedContact = useState(null)[1]; // 暂时未使用，保留以备后续联系人选择功能使用
  const [selectedGroup] = useState(null); // 保留用于群组选择功能
  // const setSelectedGroup = useState(null)[1]; // 暂时未使用，保留以备后续群组选择功能使用
  const [showSettings, setShowSettings] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [settings, setSettings] = useState({
    sidebarStyle: 'default',
    chatListStarred: false,
    chatListPinned: false,
    theme: 'light'
  });

  // 模拟数据（用于演示模式）- 使用 useMemo 缓存以避免重复创建
  const mockContacts = useMemo(() => [
    { id: 'user2', username: 'Sarah Wilson', lastMessage: 'See you tomorrow!', time: '2:30 PM', unread: 2, onlineStatus: true, type: 'user' },
    { id: 'user3', username: 'Mike Johnson', lastMessage: 'Thanks for the update', time: '1:15 PM', onlineStatus: true, type: 'user' },
    { id: 'user4', username: 'Emily Chen', lastMessage: "Let's schedule a meeting", time: '12:45 PM', unread: 1, onlineStatus: true, type: 'user' },
    { id: 'user5', username: 'David Brown', lastMessage: 'Great job on the presentation!', time: '11:30 AM', onlineStatus: true, type: 'user' },
    { id: 'user6', username: 'Lisa Anderson', lastMessage: 'Can you send me the files?', time: 'Yesterday', onlineStatus: false, type: 'user' },
  ], []);

  // 组件挂载时检查用户是否已登录
  useEffect(() => {
    if (!currentUser) {
      // 如果用户未登录，触发登出操作
      if (onLogout) {
        onLogout();
      }
    }
  }, [currentUser, onLogout]);

  // 检测服务器连接状态并加载联系人
  useEffect(() => {
    const checkConnectionAndLoadData = async () => {
      if (!currentUser) return;

      try {
        // 检查服务器连接
        const connectionResult = await authService.checkServerConnection();
        
        if (connectionResult.success) {
          console.log('[服务器连接] 成功，切换到生产模式');
          setServerConnected(true);
          
          // 加载真实联系人数据
          setIsLoadingContacts(true);
          try {
            const friends = await contactService.getFriends();
            const groups = await contactService.getGroups();
            
            // 转换为统一格式
            const formattedContacts = [
              ...friends.map(friend => ({
                id: friend._id || friend.id,
                username: friend.username || friend.name,
                lastMessage: friend.lastMessage || '',
                time: friend.lastMessageTime ? new Date(friend.lastMessageTime).toLocaleTimeString() : '',
                unread: friend.unreadCount || 0,
                onlineStatus: friend.onlineStatus || false,
                type: 'user'
              })),
              ...groups.map(group => ({
                id: group._id || group.id,
                username: group.name,
                lastMessage: group.lastMessage || '',
                time: group.lastMessageTime ? new Date(group.lastMessageTime).toLocaleTimeString() : '',
                unread: group.unreadCount || 0,
                onlineStatus: true,
                type: 'group'
              }))
            ];
            
            setContacts(formattedContacts);
            console.log(`[联系人加载] 成功加载 ${formattedContacts.length} 个联系人`);
          } catch (error) {
            console.error('[联系人加载] 失败，使用模拟数据:', error);
            setContacts(mockContacts);
          } finally {
            setIsLoadingContacts(false);
          }
        } else {
          console.log('[服务器连接] 失败，使用演示模式');
          setServerConnected(false);
          setContacts(mockContacts);
        }
      } catch (error) {
        console.error('[模式检测] 错误，使用演示模式:', error);
        setServerConnected(false);
        setContacts(mockContacts);
      }
    };

    checkConnectionAndLoadData();
  }, [currentUser, mockContacts]); // 添加 mockContacts 作为依赖

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

  // 打开设置窗口
  // const openSettingsWindow = () => {
  //   if (window.Electron) {
  //     window.Electron.ipcRenderer.send('open-settings-window');
  //   }
  // }; // 暂时未使用，保留以备后续设置窗口功能使用

  // 打开服务器选择窗口
  // const openServerSelectionWindow = () => {
  //   if (window.Electron) {
  //     window.Electron.ipcRenderer.send('open-server-selection-window');
  //   }
  // }; // 暂时未使用，保留以备后续服务器选择窗口功能使用

  // 打开聊天窗口
  const openChatWindow = (contact) => {
    if (window.Electron) {
      window.Electron.ipcRenderer.send('open-chat-window', {
        chatId: contact.id,
        chatType: contact.type,
        chatName: contact.username
      });
    }
  };

  return (
    <div className={`main-window ${settings.theme}`}>
      {showSettings ? (
        <Settings 
          currentUser={currentUser}
          onLogout={handleConfirmLogout}
          onSettingsChange={setSettings}
          onBack={() => setShowSettings(false)}
        />
      ) : (
        <>
          <div className="sidebar">
            <ContactList 
              currentUser={currentUser}
              contacts={contacts}
              isLoading={isLoadingContacts}
              serverConnected={serverConnected}
              onSelectContact={(contact) => {
                // 打开新的聊天窗口
                openChatWindow(contact);
              }}
              onStartEncryptedChat={() => console.log('开始加密聊天')}
              onCreateGroup={() => console.log('创建群组')}
              onCreateChannel={() => console.log('创建频道')}
              onShowSettings={() => setShowSettings(true)}
              onLogout={handleLogout}
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
          </div>
        </>
      )}
    </div>
  );
};

export default MainWindow;