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
  
  // 服务器相关状态
  const [selectedServer, setSelectedServer] = useState(null);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('halloChat_remember') === 'true');
  const [serverAddress, setServerAddress] = useState(localStorage.getItem('halloChat_server') || '');
  
  // 其他状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          setServerAddress(savedServerAddress);
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

  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  // 处理服务器选择
  const handleServerSelected = (server) => {
    setSelectedServer(server);
    setServerAddress(`${server.address}:${server.port}`);
    message.success(`已选择服务器: ${server.name}`);
  };

  // 打开服务器选择窗口
  const openServerSelection = () => {
    setShowServerSelection(true);
  };
      setConnectionStatus('success');
      message.success('服务器连接成功！');
      return true;
    } catch (err) {
      setConnectionStatus('error');
      message.error('服务器连接失败: ' + (err.message || '未知错误'));
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 添加新服务器
  const addServer = async () => {
    if (!newServerName || !newServerAddress || !newServerPort) {
      message.error('请填写服务器名称、地址和端口');
      return;
    }

    // 验证端口号
    const portNum = parseInt(newServerPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      message.error('请输入有效的端口号(1-65535)');
      return;
    }

    // 测试连接
    const isConnected = await testServerConnection(newServerAddress, newServerPort);
    
    if (isConnected) {
      const newServer = {
        id: Date.now().toString(),
        name: newServerName,
        address: newServerAddress,
        port: newServerPort
      };

      const updatedServers = [...servers, newServer];
      setServers(updatedServers);
      
      // 保存到localStorage
      localStorage.setItem('halloChat_servers', JSON.stringify(updatedServers));
      
      // 自动选择新添加的服务器
      setSelectedServer(newServer);
      setServerAddress(newServerAddress);
      setServerPort(newServerPort);
      
      // 关闭添加服务器弹窗
      setIsAddingServer(false);
      setNewServerName('');
      setNewServerAddress('');
      setNewServerPort('3000');
      
      message.success('服务器添加成功！');
    }
  };

  // 处理服务器选择
  const handleServerSelect = (server) => {
    setSelectedServer(server);
    setServerAddress(server.address);
    setServerPort(server.port);
  };

  // 显示添加服务器弹窗
  const showAddServerModal = () => {
    setIsAddingServer(true);
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
      
      let fullAddress = '';
      
      if (selectedServer) {
        fullAddress = `${selectedServer.address}:${selectedServer.port}`;
      } else if (isManualInput) {
        fullAddress = `${serverAddress}:${serverPort}`;
      } else if (foundServers.length > 0) {
        fullAddress = `${foundServers[0].address}:${foundServers[0].port}`;
      } else {
        throw new Error('未找到可用的服务器，请添加服务器或切换到手动输入模式');
      }
      
      // 为所有服务设置服务器地址
      authService.setServerAddress(fullAddress);
      chatService.setServerAddress(fullAddress);
      encryptedChatService.setServerAddress(fullAddress);
      
      const user = await authService.register({ username, password, email });
      
      // 存储服务器地址和名称
      const serverName = selectedServer?.name || serverAddress || foundServers[0]?.name || 'Unknown Server';
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

  // 删除未使用的storageError和safeSetStorage
  // 增强型存储方法已移除，直接使用localStorage.setItem

  // 初始化时读取缓存
  useEffect(() => {
    // 已经在之前的useEffect中加载了服务器配置
  }, []);

  // 服务器表格列定义
  const serverColumns = [
    {
      title: '服务器名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: '类型',
      key: 'type',
      render: (_, record) => {
        return record.isLocal ? (
          <Tag color="green">局域网</Tag>
        ) : (
          <Tag color="blue">已保存</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => handleServerSelect(record)}
          disabled={selectedServer?.id === record.id || selectedServer?.address === record.address}
        >
          {selectedServer?.id === record.id || selectedServer?.address === record.address ? '已选择' : '选择'}
        </Button>
      ),
    },
  ];

  // 合并局域网服务器和已保存服务器
  const combinedServers = [
    ...foundServers.map(server => ({ ...server, isLocal: true, key: `local-${server.address}` })),
    ...servers.map(server => ({ ...server, isLocal: false }))
  ];

  return (
    <div className="login-container">
      <h2>欢迎使用HalloChat</h2>
      {error && <Alert message="错误提示" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {/* 服务器选择区域 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>选择服务器</h3>
        
        {/* 服务器列表 */}
        {combinedServers.length > 0 && (
          <Table 
            columns={serverColumns}
            dataSource={combinedServers}
            pagination={false}
            rowKey="key"
            style={{ marginBottom: 10 }}
          />
        )}
        
        {/* 无服务器提示 */}
        {combinedServers.length === 0 && (
          <div style={{ textAlign: 'center', marginBottom: 10, color: '#999' }}>
            未找到可用服务器
          </div>
        )}
        
        {/* 添加服务器按钮 */}
        <div style={{ textAlign: 'center', marginBottom: 15 }}>
          <Button type="primary" onClick={showAddServerModal}>
            添加服务器
          </Button>
          <Button 
            style={{ marginLeft: 10 }} 
            onClick={() => setIsManualInput(!isManualInput)}
          >
            {isManualInput ? '使用服务器列表' : '手动输入服务器'}
          </Button>
        </div>
        
        {/* 手动输入服务器地址 */}
        {isManualInput && (
          <div style={{ marginBottom: 15, padding: 10, border: '1px solid #e8e8e8', borderRadius: 4 }}>
            <Form layout="inline" style={{ marginBottom: 10 }}>
              <Form.Item label="服务器地址" style={{ flex: 1, marginRight: 10 }}>
                <Input 
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="输入服务器IP或域名"
                />
              </Form.Item>
              <Form.Item label="端口" style={{ flex: 0.5, marginRight: 10 }}>
                <Input 
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  placeholder="3000"
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="link" 
                  onClick={() => testServerConnection(serverAddress, serverPort)}
                  loading={isTestingConnection}
                >
                  测试连接
                </Button>
              </Form.Item>
            </Form>
            {connectionStatus && (
              <Tag 
                color={connectionStatus === 'success' ? 'green' : 'red'} 
                style={{ display: 'block', marginBottom: 0 }}
              >
                {connectionStatus === 'success' ? '连接成功' : '连接失败'}
              </Tag>
            )}
          </div>
        )}
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
      
      {/* 添加服务器弹窗 */}
      <Modal
        title="添加服务器"
        open={isAddingServer}
        onOk={addServer}
        onCancel={() => setIsAddingServer(false)}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ loading: isTestingConnection }}
      >
        <Form layout="vertical">
          <Form.Item label="服务器名称">
            <Input 
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="请输入服务器名称"
            />
          </Form.Item>
          <Form.Item label="服务器地址">
            <Input 
              value={newServerAddress}
              onChange={(e) => setNewServerAddress(e.target.value)}
              placeholder="请输入服务器IP或域名"
            />
          </Form.Item>
          <Form.Item label="服务器端口">
            <Input 
              value={newServerPort}
              onChange={(e) => setNewServerPort(e.target.value)}
              placeholder="默认为7932"
            />
          </Form.Item>
        </Form>
        {connectionStatus && (
          <Tag 
            color={connectionStatus === 'success' ? 'green' : 'red'} 
            style={{ display: 'block', marginTop: 10 }}
          >
            {connectionStatus === 'success' ? '连接成功' : '连接失败'}
          </Tag>
        )}
      </Modal>
    </div>
  )
};


export default Login;