import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Settings.css';

/**
 * 设置组件 - 管理应用程序的各种设置选项
 * 在多窗口架构中，设置的更改会通过props传递到主应用
 */
const Settings = ({ currentUser, onLogout, onSettingsChange }) => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({
    sidebarStyle: 'default',
    chatListStarred: false,
    chatListPinned: false,
    theme: 'light',
    messageSound: 'default',
    soundVolume: 50,
    customSound: null,
    customSounds: [],
    soundSchemes: {
      starred: 'default',
      normal: 'default',
      contacts: {},
      getContactSound: (contactId) => {
        return settings.soundSchemes.contacts[contactId] || 
               (settings.soundSchemes.starred === 'custom' ? 'custom' : settings.soundSchemes.starred);
      }
    }
  });

  // 组件挂载时，尝试从本地存储加载设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('halloChat_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        onSettingsChange(parsedSettings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }, [onSettingsChange]);

  /**
   * 处理登出操作
   * 在多窗口架构中，这会触发主窗口的关闭和登录窗口的创建
   */
  const handleLogout = () => {
    onLogout();
  };

  /**
   * 处理设置变更
   * 将更新后的设置保存到本地存储，并通过回调函数通知父组件
   */
  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
    
    // 保存设置到本地存储
    try {
      localStorage.setItem('halloChat_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  /**
   * 处理语言变更
   */
  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="settings-container">
      <h2>{t('settings.title')}</h2>
      {currentUser && <p className="current-user-info">{t('settings.currentUser')}: {currentUser.username}</p>}
      
      <div className="settings-section">
        <h3>{t('settings.languageSelection')}</h3>
        <select 
          value={i18n.language} 
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="zh-CN">简体中文</option>
          <option value="zh-TW">繁體中文</option>
          <option value="en-US">English</option>
          <option value="ru-RU">Русский</option>
        </select>
      </div>
      
      <div className="settings-section">
        <h3>{t('settings.notification')}</h3>
        <div className="setting-item">
          <label>{t('settings.messageSound')}</label>
          <select 
            value={settings.messageSound}
            onChange={(e) => setSettings({...settings, messageSound: e.target.value})}
          >
            <option value="default">{t('settings.soundDefault')}</option>
            <option value="ding">{t('settings.soundDing')}</option>
            <option value="bell">{t('settings.soundBell')}</option>
            <option value="chime">{t('settings.soundChime')}</option>
            <option value="custom">{t('settings.soundCustom')}</option>
          </select>
        </div>
        <div className="setting-item">
          <label>{t('settings.soundVolume')}: {settings.soundVolume}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={settings.soundVolume}
            onChange={(e) => setSettings({...settings, soundVolume: e.target.value})}
          />
        </div>
        {settings.messageSound === 'custom' && (
          <div className="setting-item">
            <label>{t('settings.selectLocalSound')}</label>
            <input
              type="file"
              accept=".wav,.mp3"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (file.size > 2 * 1024 * 1024) {
                  alert('文件大小不能超过2MB');
                  return;
                }
                
                // 验证文件类型
                if (!['audio/wav','audio/mp3','audio/mpeg'].includes(file.type)) {
                  alert('仅支持.wav或.mp3格式的音频文件');
                  return;
                }
                
                const audio = new Audio();
                audio.src = URL.createObjectURL(file);
                audio.onloadedmetadata = () => {
                  if (audio.duration > 2) {
                    alert('铃声时长不能超过2秒');
                    return;
                  }
                  const soundLabel = prompt(`已选择铃声: ${file.name} (${(file.size/1024).toFixed(1)}KB, ${audio.duration.toFixed(1)}秒)\n请输入铃声标签(最多20个字符):`, '');
                  if (soundLabel === null) return;
                  if (soundLabel !== null) {
                    const trimmedLabel = soundLabel.substring(0, 20);
                    const confirmed = window.confirm(`确认使用铃声: ${trimmedLabel} (原文件名: ${file.name})?`);
                    if (confirmed === null) {
                      return; // 用户点击了取消
                    }
                    const customSoundsCount = settings.customSounds.length;
                    if (customSoundsCount >= 5) {
                      alert('最多只能添加5首自定义铃声');
                      return;
                    }
                    if (confirmed) {
                      setSettings({
                        ...settings, 
                        customSound: file,
                        customSounds: [...settings.customSounds, {
                          file,
                          label: trimmedLabel
                        }],
                        soundSchemes: {
                          ...settings.soundSchemes,
                          customLabel: trimmedLabel
                        }
                      });
                    }
                  }
                };
                audio.onerror = () => {
                  alert('无法加载音频文件，请检查格式是否正确');
                };
                
                // 设置超时处理
                setTimeout(() => {
                  if (!audio.duration) {
                    alert('无法读取音频文件，可能格式不受支持');
                  }
                }, 2000);
              }}
            />
          </div>
        )}
      </div>
      
      <div className="settings-section">
        <h3>{t('settings.sidebarStyle')}</h3>
        <select 
          value={settings.sidebarStyle} 
          onChange={(e) => handleSettingChange('sidebarStyle', e.target.value)}
        >
          <option value="default">{t('settings.default')}</option>
          <option value="compact">{t('settings.compact')}</option>
          <option value="qq9">{t('settings.qq9Style')}</option>
        </select>
      </div>
      
      <div className="settings-section">
        <h3>{t('settings.chatList')}</h3>
        <label>
          <input 
            type="checkbox" 
            checked={settings.chatListStarred}
            onChange={(e) => handleSettingChange('chatListStarred', e.target.checked)}
          />
          {t('settings.showStarredContacts')}
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={settings.chatListPinned}
            onChange={(e) => handleSettingChange('chatListPinned', e.target.checked)}
          />
          {t('settings.showPinnedChats')}
        </label>
      </div>
      
      <div className="settings-section">
        <h3>{t('settings.theme')}</h3>
        <select 
          value={settings.theme} 
          onChange={(e) => handleSettingChange('theme', e.target.value)}
        >
          <option value="light">{t('settings.light')}</option>
          <option value="dark">{t('settings.dark')}</option>
        </select>
      </div>
      
      <div className="settings-section">
        <h3>{t('settings.soundScheme')}</h3>
        <div className="setting-item">
          <label>{t('settings.starredContactSound')}</label>
          <select 
            value={settings.soundSchemes.starred}
            onChange={(e) => handleSettingChange('soundSchemes', {
              ...settings.soundSchemes,
              starred: e.target.value
            })}
          >
            <option value="default">{t('settings.soundDefault')}</option>
            <option value="ding">{t('settings.soundDing')}</option>
            <option value="bell">{t('settings.soundBell')}</option>
            <option value="chime">{t('settings.soundChime')}</option>
            <option value="custom">{t('settings.soundCustom')}</option>
          </select>
        </div>
        <div className="setting-item">
          <label>{t('settings.normalContactSound')}</label>
          <select 
            value={settings.soundSchemes.normal}
            onChange={(e) => handleSettingChange('soundSchemes', {
              ...settings.soundSchemes,
              normal: e.target.value
            })}
          >
            <option value="default">{t('settings.soundDefault')}</option>
            <option value="ding">{t('settings.soundDing')}</option>
            <option value="bell">{t('settings.soundBell')}</option>
            <option value="chime">{t('settings.soundChime')}</option>
            <option value="custom">{t('settings.soundCustom')}</option>
          </select>
        </div>
      </div>
      
      <div className="settings-actions">
        <button className="logout-btn" onClick={handleLogout}>{t('settings.logout')}</button>
      </div>
    </div>
  );
};

export default Settings;