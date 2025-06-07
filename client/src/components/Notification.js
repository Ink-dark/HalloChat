import React, { useState, useEffect } from 'react';
import chatService from '../services/chatService';
import './Notification.css';

const Notification = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    sound: true,
    vibration: false,
    preview: true,
    desktop: true
  });

  useEffect(() => {
    if (!currentUser) return;
    
    // 初始化消息状态处理器
    chatService.addStatusHandler((messageId, status) => {
      if (status === 'read') {
        setNotifications(prev => prev.filter(n => n.messageId !== messageId));
      }
    });
    
    // 初始化已读状态处理器
    chatService.addReadHandler((messageId) => {
      setNotifications(prev => prev.filter(n => n.messageId !== messageId));
    });
    
    return () => {
      // 清理处理器
      chatService.addStatusHandler(() => {});
      chatService.addReadHandler(() => {});
    };
  }, [currentUser]);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <div className="notification-container">
      <button 
        className="notification-settings-btn" 
        onClick={toggleSettings}
      >
        通知设置
      </button>
      
      {showSettings && (
        <div className="notification-settings">
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.sound} 
                onChange={() => handleSettingChange('sound')}
              />
              声音提醒
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.vibration} 
                onChange={() => handleSettingChange('vibration')}
              />
              震动提醒
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.preview} 
                onChange={() => handleSettingChange('preview')}
              />
              消息预览
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.desktop} 
                onChange={() => handleSettingChange('desktop')}
              />
              桌面通知
            </label>
          </div>
        </div>
      )}
      
      <div className="notification-list">
        {notifications.map((notification, index) => (
          <div key={index} className="notification-item">
            <p>{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;