import React, { useState } from 'react';
import MainWindow from './components/MainWindow';
import './App.css';
import { Modal, Button, Form, Input, message } from 'antd';

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginModalVisible(true);
  };

  const handleDisclaimerClose = () => {
    if (hasAgreed) {
      setShowDisclaimer(false);
      setLoginModalVisible(true); // 显示登录窗口
    }
  };

  const handleLogin = async (values) => {
    // 简单模拟登录验证
    if (values.username && values.password) {
      message.success('登录成功！');
      setCurrentUser({
        id: 'user1',
        username: values.username,
        onlineStatus: true
      });
      setIsAuthenticated(true);
      setLoginModalVisible(false);
    } else {
      message.error('请输入用户名和密码');
    }
  };

  return (
    <div className="App">
      {/* 法律声明弹窗 */}
      <Modal
        title="法律声明"
        visible={showDisclaimer}
        onOk={handleDisclaimerClose}
        onCancel={handleDisclaimerClose}
        closable={false}
        maskClosable={false}
        footer={[
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => {
              setHasAgreed(true);
              handleDisclaimerClose();
            }}
          >
            我已阅读并同意
          </Button>
        ]}
      >
        <p>本程序由墨染柒Darkseven开发，仅供学习交流使用，测试版不代表最终品质。</p>
        <p>1. 用户在使用过程中应遵守当地法律法规，不得用于非法用途。</p>
        <p>2. 开发者不对用户行为承担任何法律责任。</p>
        <p>3. 本软件不收集、存储或传输用户隐私数据。</p>
        <p>4. 使用本软件即表示您同意以上条款。</p>
      </Modal>

      {/* 登录弹窗 */}
      <Modal
        title={isLoginMode ? "用户登录" : "用户注册"}
        visible={loginModalVisible && !isAuthenticated}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <Form
          name="loginForm"
          layout="vertical"
          onFinish={handleLogin}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {isLoginMode ? "登录" : "注册"}
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: '#1890ff', cursor: 'pointer' }}>
              {isLoginMode ? '没有账号？去注册' : '已有账号？去登录'}
            </a>
          </div>
        </Form>
      </Modal>

      {/* 已登录时显示主窗口 */}
      {isAuthenticated && currentUser && <MainWindow currentUser={currentUser} onLoginSuccess={handleLogout} />}
    </div>
  );
}

export default App;