import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import MainWindow from './components/MainWindow';
import Login from './components/Login';
import './App.css';
import './index.css';
import authService from './services/authService';
import encryptedChatService from './services/encryptedChatService';
import chatService from './services/chatService';



function App() {
  // 根据URL参数决定显示的视图
  const [activeView, setActiveView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化时检查认证状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam) {
          setActiveView(viewParam);
        }

        // 检查用户是否已认证
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser();
          if (user) {
            setCurrentUser(user);
          setIsAuthenticated(true);
          // 设置聊天服务的用户信息
          // 先断开现有连接（如果存在）
          if (chatService.disconnect) {
            chatService.disconnect();
          }
          chatService.connect(user);
          // 注意：encryptedChatService需要encryptionKey参数，但这里没有提供
          // 可以在实际使用加密聊天功能时再连接
            return;
          }
        }

        // 如果未认证，强制显示登录视图
        setActiveView('login');
      } catch (error) {
        console.error('初始化应用失败:', error);
        setActiveView('login');
      }
    };

    checkAuthStatus();
  }, []);

  // 处理登录成功
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    // 登录成功后切换到主界面
    setActiveView('main');
    
    // 设置聊天服务的用户信息
    // 先断开现有连接（如果存在）
    if (chatService.disconnect) {
      chatService.disconnect();
    }
    chatService.connect(userData);
    // 注意：encryptedChatService需要encryptionKey参数，但这里没有提供
    // 可以在实际使用加密聊天功能时再连接
    
    // 发送IPC消息通知主进程
    if (window.Electron) {
      window.Electron.ipcRenderer.send('login-success', userData);
    }
  };

  // 处理登出
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveView('login');
    
    // 断开聊天服务连接
    if (chatService.disconnect) {
      chatService.disconnect();
    }
    
    // 发送IPC消息通知主进程
    if (window.Electron) {
      window.Electron.ipcRenderer.send('logout');
    }
  };

  return (
    <Router>
      <div className="app-layout">
        {activeView === 'main' && isAuthenticated && currentUser ? (
          <MainWindow 
            currentUser={currentUser} 
            onLogout={handleLogout}
          />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </Router>
  );
}

export default App;
