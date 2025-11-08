import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import authService from '../services/authService';
import chatService from '../services/chatService';
import encryptedChatService from '../services/encryptedChatService';
import ServerSelectionWindow from './ServerSelectionWindow';
import './Login.css';
import { Form, Input, Button, Checkbox, Alert, message } from 'antd';

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
  
  // 服务器相关状态
  const [selectedServer, setSelectedServer] = useState(null);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('halloChat_remember') === 'true');
  
  // 其他状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // 从localStorage加载上次使用的服务器信息
    const loadLastUsedServer = () => {
      try {
        const savedServerAddress = localStorage.getItem('halloChat_server');
        const savedServerName = localStorage.getItem('halloChat_server_name');
        
        if (savedServerAddress && !selectedServer) {
          // 解析服务器地址
          const [address, port] = savedServerAddress.split(':');
          setSelectedServer({
            address: address,
            port: port || '3000',
            name: savedServerName || address
          });
        }
      } catch (err) {
        console.log('加载上次使用的服务器失败:', err);
      }
    };

    loadLastUsedServer();
  }, [selectedServer]);

  const handleLogin = async (e) => {
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

      // 检查是否已选择服务器
      if (!selectedServer) {
        throw new Error('请先选择服务器');
      }

      const fullAddress = `${selectedServer.address}:${selectedServer.port}`;
      const serverName = selectedServer.name || selectedServer.address;

      if (rememberMe) {
        localStorage.setItem('halloChat_username', username);
        // 使用环境变量或安全存储的密钥
        const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'fallback-key-change-in-production';
        const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
        localStorage.setItem('halloChat_password', encrypted);
        localStorage.setItem('halloChat_password_time', Date.now().toString());
        localStorage.setItem('halloChat_server', fullAddress);
        localStorage.setItem('halloChat_server_name', serverName);
        localStorage.setItem('halloChat_remember', 'true');
      } else {
        localStorage.removeItem('halloChat_username');
        localStorage.removeItem('halloChat_password');
        localStorage.removeItem('halloChat_password_time');
      }
      
      // 无论是否记住我，都保存服务器地址信息，方便下次连接
      localStorage.setItem('halloChat_server', fullAddress);
      localStorage.setItem('halloChat_server_name', serverName);
      
      console.log('使用服务器地址:', fullAddress);
      // 为所有服务设置服务器地址
      authService.setServerAddress(fullAddress);
      chatService.setServerAddress(fullAddress);
      encryptedChatService.setServerAddress(fullAddress);
      
      const user = await authService.login(username, password);
      
      // 检查是否有token存储
      const token = localStorage.getItem('halloChat_token');
      if (token) {
        console.log('登录成功，token已存储');
      } else {
        console.warn('登录成功，但未找到存储的token');
      }
      
      // 调用回调函数通知父组件登录成功
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!username || !password || !email) {
        throw new Error('请填写所有必填字段');
      }
      
      if (password !== confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }
      
      // 检查是否已选择服务器
      if (!selectedServer) {
        throw new Error('请先选择服务器');
      }

      const fullAddress = `${selectedServer.address}:${selectedServer.port}`;
      const serverName = selectedServer.name || selectedServer.address;
      
      // 为所有服务设置服务器地址
      authService.setServerAddress(fullAddress);
      chatService.setServerAddress(fullAddress);
      encryptedChatService.setServerAddress(fullAddress);
      
      const user = await authService.register({ username, password, email });
      
      // 存储服务器地址和名称
      localStorage.setItem('halloChat_server', fullAddress);
      localStorage.setItem('halloChat_server_name', serverName);
      
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

  // 处理服务器选择
  const handleServerSelected = (server) => {
    setSelectedServer(server);
    const fullAddress = `${server.address}:${server.port}`;
    message.success(`已选择服务器: ${server.name} (${fullAddress})`);
  };

  // 打开服务器选择窗口
  const openServerSelection = () => {
    setShowServerSelection(true);
  };

  return (
    <div className="login-container">
      <h2>欢迎使用HalloChat</h2>
      {error && <Alert message="错误提示" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {/* 服务器选择区域 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>服务器</h3>
        
        {/* 当前选择的服务器 */}
        {selectedServer ? (
          <div style={{ 
            padding: '10px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '4px',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ marginBottom: '6px' }}>
              <strong>服务器名称: </strong> 
              <span style={{ fontFamily: 'monospace' }}>{selectedServer.name}</span>
            </div>
            <div>
              <strong>服务器地址: </strong> 
              <span style={{ fontFamily: 'monospace' }}>{selectedServer.address}:{selectedServer.port}</span>
            </div>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '10px', 
            color: '#999',
            padding: '10px',
            border: '1px dashed #e8e8e8',
            borderRadius: '4px'
          }}>
            未选择服务器
          </div>
        )}
        
        {/* 选择服务器按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Button type="primary" onClick={openServerSelection}>
            {selectedServer ? '更换服务器' : '选择服务器'}
          </Button>
        </div>
      </div>
      
      {/* 登录/注册表单 */}
      {isRegistering ? (
        <Form onFinish={handleRegister} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' },
              { pattern: /^[一-龥a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含中文、字母、数字、下划线，长度3-20位' }]}
          >
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password value={password} onChange={(e) => setPassword(e.target.value)} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请确认密码' }]}
          >
            <Input.Password value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            已有账号？<Button type="link" onClick={() => setIsRegistering(false)}>立即登录</Button>
          </div>
        </Form>
      ) : (
        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' },
              { pattern: /^[一-龥a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含中文、字母、数字、下划线，长度3-20位' }]}
          >
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password value={password} onChange={(e) => setPassword(e.target.value)} />
          </Form.Item>
          <Form.Item>
            <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
              记住我
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              登录
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            没有账号？<Button type="link" onClick={() => setIsRegistering(true)}>去注册</Button>
          </div>
        </Form>
      )}
      
      {/* 服务器选择窗口 */}
      <ServerSelectionWindow
        visible={showServerSelection}
        onClose={() => setShowServerSelection(false)}
        onServerSelected={handleServerSelected}
      />
    </div>
  );
};

export default Login;