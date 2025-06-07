import React from 'react';
import authService from '../services/authService';
import './Logout.css';

const Logout = ({ onLogoutSuccess }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoutTime, setLogoutTime] = useState('');
  
  const handleLogout = async () => {
    try {
      await authService.logout();
      const serverTime = new Date().toLocaleString();
      setLogoutTime(serverTime);
      setShowSuccess(true);
      
      setTimeout(() => {
        onLogoutSuccess();
      }, 2000);
    } catch (err) {
      console.error('登出失败:', err);
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
            <button className="cancel-btn" onClick={() => onLogoutSuccess(false)}>
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