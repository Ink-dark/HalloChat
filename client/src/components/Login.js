import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import './Login.css';
import { ipcRenderer } from 'electron';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(localStorage.getItem('halloChat_username') || '');
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
  const [isManualInput, _setIsManualInput] = useState(false); // eslint-disable-line
  const [rememberMe, _setRememberMe] = useState(localStorage.getItem('halloChat_remember') === 'true'); // eslint-disable-line
  const [serverAddress, _setServerAddress] = useState(localStorage.getItem('halloChat_server') || ''); // eslint-disable-line
  const [serverPort, _setServerPort] = useState('3000'); // eslint-disable-line
  const [isSearching, _setIsSearching] = useState(false); // eslint-disable-line
  const [foundServers, setFoundServers] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchLocalServers = async () => {
      setIsSearching(true);
      try {
        // 使用MDNS协议搜索局域网服务器
        try {
          const servers = await window.electron.ipcRenderer.invoke('discover-servers');
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

  const handleSubmit = async (e) => {
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
        localStorage.setItem('halloChat_password', password);
localStorage.setItem('halloChat_password_time', Date.now().toString());
        localStorage.setItem('halloChat_server', fullAddress);
        localStorage.setItem('halloChat_server_name', serverName || customConnectionName || serverAddress);
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
  );
};

export default Login;


function Login() {
  // 登录按钮点击事件
  const handleLogin = async () => {
    try {
      // ...登录逻辑
      ipcRenderer.send('log-info', '用户登录成功：' + username);
    } catch (err) {
      ipcRenderer.send('log-error', '登录失败：' + err.message);
    }
  };
}

const handleServerSelect = (selected) => {
  try {
    localStorage.setItem('serverConfig', JSON.stringify({
      ip: selected.ip,
      port: selected.port,
      lastUsed: Date.now()
    }));
  } catch (err) {
    console.warn('本地存储失败:', err);
  }
  setServerAddress(selected.ip);
  setServerPort(String(selected.port)); // 显式转换为字符串
  setIsManualInput(true);
  setError(''); // 清空错误状态
};

// 更新端口验证逻辑
const portNum = parseInt(serverPort, 10);
{foundServers.map(yyserver => (
  <ServerItem 
    key={yyserver.id} 
    onClick={() => handleServerSelect(server)}
  >
    {yyserver.name}
  </ServerItem>
))}

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


// 添加存储状态错误提示
const [storageError, setStorageError] = useState('');

// 增强型存储方法
const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    setStorageError('');
    window.electron.log.info('配置存储成功');
  } catch (err) {
    const errorMsg = `本地存储失败: ${err.message}`;
    setStorageError(errorMsg);
    window.electron.log.error(errorMsg);
    
    // 触发错误弹窗
    window.electron.dialog.showErrorBox({
      title: '存储异常',
      content: '无法保存服务器配置，请检查浏览器存储权限或清理空间',
      buttons: ['知道了']
    });
  }
};

// 更新存储调用方式
safeSetStorage('serverConfig', encrypted);

// 在渲染层添加错误提示
{storageError && (
  <Alert type="warning" message={storageError} />
)}

// 移除2FA相关状态
const [code, setCode] = useState('');
{/* 删除双因素认证表单 */}
<FormControl>
  <InputLabel>验证码</InputLabel>
  <Input
    value={code}
    onChange={(e) => setCode(e.target.value)}
  />
</FormControl>
{/* 其他表单 */}