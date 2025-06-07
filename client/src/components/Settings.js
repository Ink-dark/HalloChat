import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ currentUser, onLogout, onSettingsChange }) => {
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

  const handleLogout = () => {
    onLogout();
  };

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="settings-container">
      <h2>设置</h2>
      <div className="settings-section">
        <h3>消息通知</h3>
        <div className="setting-item">
          <label>消息提示音</label>
          <select 
            value={settings.messageSound}
            onChange={(e) => setSettings({...settings, messageSound: e.target.value})}
          >
            <option value="default">默认</option>
            <option value="ding">叮咚</option>
            <option value="bell">铃声</option>
            <option value="chime">钟声</option>
            <option value="custom">自定义铃声</option>
          </select>
        </div>
        <div className="setting-item">
          <label>音量: {settings.soundVolume}%</label>
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
            <label>选择本地铃声(.wav/.mp3)</label>
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
        <h3>侧边栏样式</h3>
        <select 
          value={settings.sidebarStyle} 
          onChange={(e) => handleSettingChange('sidebarStyle', e.target.value)}
        >
          <option value="default">默认</option>
          <option value="compact">紧凑</option>
          <option value="qq9">QQ9风格</option>
        </select>
      </div>
      
      <div className="settings-section">
        <h3>聊天列表</h3>
        <label>
          <input 
            type="checkbox" 
            checked={settings.chatListStarred}
            onChange={(e) => handleSettingChange('chatListStarred', e.target.checked)}
          />
          显示星标联系人
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={settings.chatListPinned}
            onChange={(e) => handleSettingChange('chatListPinned', e.target.checked)}
          />
          显示置顶聊天
        </label>
      </div>
      
      <div className="settings-section">
        <h3>主题</h3>
        <select 
          value={settings.theme} 
          onChange={(e) => handleSettingChange('theme', e.target.value)}
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
      
      <div className="settings-section">
        <h3>联系人铃声方案</h3>
        <div className="setting-item">
          <label>星标联系人铃声</label>
          <select 
            value={settings.soundSchemes.starred}
            onChange={(e) => handleSettingChange('soundSchemes', {
              ...settings.soundSchemes,
              starred: e.target.value
            })}
          >
            <option value="default">默认</option>
            <option value="ding">叮咚</option>
            <option value="bell">铃声</option>
            <option value="chime">钟声</option>
            <option value="custom">自定义铃声</option>
          </select>
        </div>
        <div className="setting-item">
          <label>普通联系人铃声</label>
          <select 
            value={settings.soundSchemes.normal}
            onChange={(e) => handleSettingChange('soundSchemes', {
              ...settings.soundSchemes,
              normal: e.target.value
            })}
          >
            <option value="default">默认</option>
            <option value="ding">叮咚</option>
            <option value="bell">铃声</option>
            <option value="chime">钟声</option>
            <option value="custom">自定义铃声</option>
          </select>
        </div>
      </div>
      
      <div className="settings-actions">
        <button className="logout-btn" onClick={handleLogout}>登出</button>
      </div>
    </div>
  );
};

export default Settings;