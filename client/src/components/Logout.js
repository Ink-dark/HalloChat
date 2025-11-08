import React, { useState } from 'react';
import authService from '../services/authService';
import './Logout.css';

const Logout = ({ onLogoutSuccess }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoutTime, setLogoutTime] = useState('');
  
  const handleLogout = async () => {
    try {
      // 调用authService的登出方法
      await authService.logout();
      
      // 清除本地存储中的用户相关信息
      localStorage.removeItem('halloChat_token');
      localStorage.removeItem('halloChat_user');
      localStorage.removeItem('halloChat_username');
      localStorage.removeItem('halloChat_password');
      
      // 记录登出时间并显示成功消息
      const serverTime = new Date().toLocaleString();
      setLogoutTime(serverTime);
      setShowSuccess(true);
      
      // 延迟2秒后调用成功回调
      setTimeout(() => {
        onLogoutSuccess();
      }, 2000);
    } catch (err) {
      console.error('登出失败:', err);
      // 即使出错也执行回调，确保界面能够正确切换
      setTimeout(() => {
        onLogoutSuccess();
      }, 2000);
    }
  };

  return (
    <div className="logout-container">
      {showSuccess ? (
        <div className="logout-success">
          <h2>您已经成功登出！</h2>
          <p>登出时间: {logoutTime}</p>
        </div>
      ) : (
        <>
          <h2>确定要退出吗？</h2>
          <p>您将无法接收新消息，直到重新登录。</p>
          <div className="button-group">
            <button className="cancel-btn" onClick={() => {
              // 如果取消登出，不需要执行任何操作
              // 这里不调用onLogoutSuccess，让调用方处理取消逻辑
            }}>
              取消
            </button>
            <button className="confirm-btn" onClick={handleLogout}>
              确认退出
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Logout;