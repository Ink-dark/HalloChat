import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CryptoJS from 'crypto-js';
import authService from '../services/authService';
import chatService from '../services/chatService';
import encryptedChatService from '../services/encryptedChatService';
import ServerSelectionWindow from './ServerSelectionWindow';
import './Login.css';
import { Form, Input, Button, Checkbox, Alert, message, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, CloudServerOutlined, CheckCircleOutlined, GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

const Login = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
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

  const handleLogin = async (values) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { username, password } = values;

      // 检查是否已选择服务器
      if (!selectedServer) {
        throw new Error(t('login.pleaseSelectServer'));
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

  const handleRegister = async (values) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { username, email, password } = values;
      
      // 检查是否已选择服务器
      if (!selectedServer) {
        throw new Error(t('login.pleaseSelectServer'));
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
      const errorMsg = err.response?.data?.message 
        || err.message 
        || '注册失败';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理服务器选择
  const handleServerSelected = (server) => {
    setSelectedServer(server);
    const fullAddress = `${server.address}:${server.port}`;
    message.success(t('login.selectServer') + `: ${server.name} (${fullAddress})`);
  };

  // 打开服务器选择窗口
  const openServerSelection = () => {
    setShowServerSelection(true);
  };

  // 处理语言切换
  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
  };

  // 获取语言显示名称
  const getLanguageLabel = (lang) => {
    const labels = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en-US': 'English',
      'ru-RU': 'Русский'
    };
    return labels[lang] || lang;
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* 语言切换按钮 */}
        <div className="language-selector">
          <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            suffixIcon={<GlobalOutlined />}
            bordered={false}
            dropdownMatchSelectWidth={false}
            className="language-select"
          >
            <Option value="zh-CN">🇨🇳 简体中文</Option>
            <Option value="zh-TW">🇭🇰 繁體中文</Option>
            <Option value="en-US">🇬🇧 English</Option>
            <Option value="ru-RU">🇷🇺 Русский</Option>
          </Select>
        </div>
        
        {/* Logo 和标题区域 */}
        <div className="login-header">
          <div className="login-logo">
            <img src="/HalloChat.ico" alt="HalloChat Logo" className="login-logo-img" />
          </div>
          <h2>{t('login.title')}</h2>
          <p className="login-subtitle">{t('login.subtitle')}</p>
        </div>

        {error && <Alert message={t('login.errorTitle')} description={error} type="error" showIcon closable />}
        
        {/* 服务器选择区域 */}
        <div className="server-section">
          <div className="server-section-title">
            <CloudServerOutlined />
            {t('login.serverConfig')}
          </div>
          
          {/* 当前选择的服务器 */}
          {selectedServer ? (
            <div className="server-info-card">
              <div className="server-info-item">
                <CheckCircleOutlined style={{ color: '#667eea' }} />
                <span className="server-info-label">{t('login.serverName')}:</span>
                <span className="server-info-value">{selectedServer.name}</span>
              </div>
              <div className="server-info-item">
                <CloudServerOutlined style={{ color: '#667eea' }} />
                <span className="server-info-label">{t('login.serverAddress')}:</span>
                <span className="server-info-value">{selectedServer.address}:{selectedServer.port}</span>
              </div>
            </div>
          ) : (
            <div className="server-placeholder">
              {t('login.noServerSelected')}
            </div>
          )}
          
          {/* 选择服务器按钮 */}
          <Button 
            type="primary" 
            onClick={openServerSelection}
            icon={<CloudServerOutlined />}
            className="server-select-btn"
          >
            {selectedServer ? t('login.changeServer') : t('login.selectServer')}
          </Button>
        </div>
        
        {/* 登录/注册表单 */}
        {isRegistering ? (
          <Form onFinish={handleRegister} layout="vertical" className="login-form">
            <Form.Item
              name="email"
              label={t('login.email')}
              rules={[{ required: true, type: 'email', message: t('login.pleaseEnterEmail') }]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.email')}
                size="large"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </Form.Item>
            <Form.Item
              name="username"
              label={t('login.username')}
              rules={[
                { required: true, message: t('login.pleaseEnterUsername') },
                { pattern: /^[一-龥a-zA-Z0-9_]{3,20}$/, message: t('login.usernameFormat') }
              ]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.username')}
                size="large"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('login.password')}
              rules={[
                { required: true, message: t('login.pleaseEnterPassword') },
                { 
                  pattern: /^(?:(?=.*[a-z])(?=.*[A-Z])(?=.*\d)|(?=.*[a-z])(?=.*[A-Z])(?=.*[~!@#$%^&*()_+-])|(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^&*()_+-])|(?=.*[a-z])(?=.*\d)(?=.*[~!@#$%^&*()_+-]))[A-Za-z\d~!@#$%^&*()_+-]{6,20}$/, 
                  message: t('login.passwordFormat') 
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.password')}
                size="large"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('login.confirmPassword')}
              dependencies={['password']}
              rules={[
                { required: true, message: t('login.pleaseConfirmPassword') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('login.passwordNotMatch')));
                  },
                }),
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.confirmPassword')}
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={isLoading}
                className="login-submit-btn"
              >
                {t('login.registerButton')}
              </Button>
            </Form.Item>
            <div className="toggle-form-link">
              {t('login.hasAccount')}<Button type="link" onClick={() => setIsRegistering(false)}>{t('login.goLogin')}</Button>
            </div>
          </Form>
        ) : (
          <Form onFinish={handleLogin} layout="vertical" className="login-form">
            <Form.Item
              name="username"
              label={t('login.username')}
              rules={[
                { required: true, message: t('login.pleaseEnterUsername') },
                { pattern: /^[一-龥a-zA-Z0-9_]{3,20}$/, message: t('login.usernameFormat') }
              ]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.username')}
                size="large"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('login.password')}
              rules={[{ required: true, message: t('login.pleaseEnterPassword') }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder={t('login.password')}
                size="large"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </Form.Item>
            <Form.Item>
              <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                {t('login.rememberMe')}
              </Checkbox>
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={isLoading}
                className="login-submit-btn"
              >
                {t('login.loginButton')}
              </Button>
            </Form.Item>
            <div className="toggle-form-link">
              {t('login.noAccount')}<Button type="link" onClick={() => setIsRegistering(true)}>{t('login.goRegister')}</Button>
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
    </div>
  );
};

export default Login;