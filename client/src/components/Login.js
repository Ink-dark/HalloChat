import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import CryptoJS from 'crypto-js';
import ServerItem from './ServerItem'; // 假设ServerItem在同一目录下
import authService from '../services/authService';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(localStorage.getItem('halloChat_username') || '');
  const [serverPort, setServerPort] = useState('3000');
  const [foundServers, setFoundServers] = useState([]);
  const [password, setPassword] = useState(() => {
  const savedPassword = localStorage.getItem('halloChat_password');
  const savedTime = localStorage.getItem('halloChat_password_time');
  if (savedPassword && savedTime && Date.now() - parseInt(savedTime) > 90 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem('halloChat_password');
    localStorage.removeItem('halloChat_password_time');
    return '';
  }
  return savedPassword || '';
});
  const [isManualInput, setIsManualInput] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('halloChat_remember') === 'true');
  const [serverAddress, setServerAddress] = useState(localStorage.getItem('halloChat_server') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchLocalServers = async () => {
      setIsSearching(true);
      try {
        // 使用MDNS协议搜索局域网服务器
        try {
          const servers = await window.Electron.ipcRenderer.invoke('discover-servers');
          setFoundServers(servers);
          setIsSearching(false);
        } catch (err) {
          setError('搜索服务器失败: ' + err.message);
          setIsSearching(false);
        }
      } catch (err) {
        setError('搜索服务器失败');
        setIsSearching(false);
      }
    };

    if (!isManualInput) {
      searchLocalServers();
    }
  }, [isManualInput]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{3,20}$/;
  if (!username || !password) {
    throw new Error('请输入用户名和密码');
  }
  if (!usernameRegex.test(username)) {
    throw new Error('用户名只能包含中文、字母、数字、下划线，长度3-20位');
  }

      if (isManualInput) {
        if (!serverAddress || !serverPort) {
          throw new Error('请输入服务器地址和端口');
        }
        
        // 验证IP地址格式
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // 验证域名格式
        const domainRegex = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
        
        // 验证端口号
        const portNum = parseInt(serverPort);
        
        if (!ipRegex.test(serverAddress) && !domainRegex.test(serverAddress)) {
          throw new Error('请输入有效的IP地址或域名');
        }
        
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          throw new Error('请输入有效的端口号(1-65535)');
        }
      }

      const fullAddress = isManualInput 
        ? `${serverAddress}:${serverPort}`
        : foundServers.length > 0 
          ? `${foundServers[0].address}:${foundServers[0].port}`
          : '';

      if (rememberMe) {
        localStorage.setItem('halloChat_username', username);
        // 使用环境变量或安全存储的密钥
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-key-change-in-production';
const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
localStorage.setItem('halloChat_password', encrypted);
localStorage.setItem('halloChat_password_time', Date.now().toString());
        localStorage.setItem('halloChat_server', fullAddress);
        localStorage.setItem('halloChat_server_name', foundServers[0]?.name || serverAddress);
        localStorage.setItem('halloChat_remember', 'true');
      } else {
        localStorage.removeItem('halloChat_username');
        localStorage.removeItem('halloChat_password');
        localStorage.removeItem('halloChat_server');
        localStorage.removeItem('halloChat_remember');
      }
      
      authService.setServerAddress(fullAddress);
      const user = await authService.login(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (!username || !password || !email) {
        throw new Error('请填写所有必填字段');
      }
      
      if (password !== confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }
      
      const fullAddress = isManualInput 
        ? `${serverAddress}:${serverPort}`
        : foundServers.length > 0 
          ? `${foundServers[0].address}:${foundServers[0].port}`
          : '';
          
      authService.setServerAddress(fullAddress);
      const user = await authService.register(username, password, email);
      onLoginSuccess(user);
    } catch (err) {
      const errorCode = err.response?.data?.code;
        const errorMsg = errorCode
          ? `错误码 ${errorCode}：${err.response.data.message}`
          : (err.message || '注册失败');
        setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加存储状态错误提示
  const [storageError, setStorageError] = useState('');

  // 增强型存储方法
  const safeSetStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
      setStorageError('');
      window.electron.ipcRenderer.send('log', 'info', '配置存储成功');
    } catch (err) {
      const errorMsg = `本地存储失败: ${err.message}`;
      setStorageError(errorMsg);
      window.electron.ipcRenderer.send('log', 'error', errorMsg);
      
      // 通过IPC触发错误弹窗
      window.electron.ipcRenderer.send('show-error-box',
        '存储异常',
        '无法保存服务器配置，请检查浏览器存储权限或清理空间'
      );
    }
  };


  // 初始化时读取缓存
  useEffect(() => {
    const cached = localStorage.getItem('serverConfig');
    if (cached) {
      try {
        const { ip, port } = JSON.parse(cached);
        setServerAddress(ip);
        setServerPort(String(port));
      } catch {}
    }
  }, []);

  // 更新端口验证逻辑

  return (
    <div className="login-container">
      <h2>欢迎使用HalloChat</h2>
      {isRegistering ? (
        <form onSubmit={handleRegister}>
          {/* 注册表单内容 */}
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required />
          </div>
          {/* 其他登录表单字段 */}
        </form>
      )}
      {/* 服务器选择等其他内容 */}
    </div>
  )
};


export default Login;