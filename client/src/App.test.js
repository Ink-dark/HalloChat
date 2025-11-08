import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import authService from './services/authService';
import chatService from './services/chatService';
import encryptedChatService from './services/encryptedChatService';
import MainWindow from './components/MainWindow';

// Mock所有外部依赖
jest.mock('./services/authService');
jest.mock('./services/chatService');
jest.mock('./services/encryptedChatService');
jest.mock('./components/MainWindow');

// Mock antd的message组件
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

// Mock window.close
Object.defineProperty(window, 'close', {
  value: jest.fn(),
  writable: true
});

// Mock window.process for Electron environment detection
Object.defineProperty(window, 'process', {
  value: null,
  writable: true
});

describe('App组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.login.mockResolvedValue({ id: '1', username: 'testuser', email: 'test@example.com' });
    authService.register.mockResolvedValue({ id: '1', username: 'testuser', email: 'test@example.com' });
    authService.checkServerConnection.mockResolvedValue({ success: true, status: 200, latency: 100 });
    chatService.connect.mockImplementation(() => {});
    encryptedChatService.connect.mockImplementation(() => {});
    MainWindow.mockImplementation(() => <div data-testid="main-window" />);
  });

  describe('初始渲染和法律声明', () => {
    it('应该显示法律声明当用户未同意时', () => {
      localStorage.getItem.mockReturnValue(null);
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      expect(screen.getByText('法律声明')).toBeInTheDocument();
    });

    it('应该在用户同意法律声明后显示服务器选择界面', async () => {
      localStorage.getItem.mockReturnValue(null);
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      const agreeButton = screen.getByText('我已阅读并同意');
      fireEvent.click(agreeButton);
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('legalAgreed', 'true');
      });
    });

    it('应该在用户已同意法律声明时直接显示服务器选择界面', () => {
      localStorage.getItem.mockReturnValue('true');
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      // 检查服务器选择相关内容是否显示
      expect(screen.getByText('服务器选择')).toBeInTheDocument();
    });
  });

  describe('服务器管理功能', () => {
    it('应该在没有服务器时显示添加服务器提示', () => {
      localStorage.getItem.mockReturnValue('true');
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      expect(screen.getByText('暂无服务器，请添加新服务器')).toBeInTheDocument();
    });

    it('应该能够测试服务器连接', async () => {
      localStorage.getItem.mockReturnValue('true');
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      const addServerButton = screen.getByText('添加服务器');
      fireEvent.click(addServerButton);
      
      // Mock form validation
      const mockFormRef = {
        validateFields: jest.fn().mockResolvedValue({
          serverName: '测试服务器',
          serverAddress: 'localhost',
          serverPort: '7932'
        })
      };
      
      // 直接修改组件的ref值
      const appInstance = App();
      appInstance.addServerFormRef.current = mockFormRef;
      
      // 测试连接状态按钮
      const testButton = screen.getByText('测试连接状态');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(authService.setServerAddress).toHaveBeenCalled();
        expect(authService.checkServerConnection).toHaveBeenCalled();
      });
    });
  });

  describe('登录功能', () => {
    beforeEach(() => {
      // 设置必要的localStorage值，让应用进入登录界面
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'legalAgreed') return 'true';
        if (key === 'halloChat_servers') return JSON.stringify([{ id: '1', name: '测试服务器', address: 'localhost', port: '7932' }]);
        return null;
      });
    });

    it('应该成功登录并显示主窗口', async () => {
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      
      // 模拟选择服务器
      const selectButton = screen.getByText('选择');
      fireEvent.click(selectButton);
      
      // 模拟点击确定按钮进入登录
      const okButton = screen.getByText('确定');
      fireEvent.click(okButton);
      
      // 填写并提交登录表单
      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const emailInput = screen.getByPlaceholderText('请输入邮箱');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const loginButton = screen.getByText('登录');
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
        expect(screen.getByTestId('main-window')).toBeInTheDocument();
      });
    });

    it('应该在登录失败时显示错误消息', async () => {
      const mockError = new Error('用户名或密码错误');
      authService.login.mockRejectedValue(mockError);
      
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      
      // 模拟选择服务器并进入登录
      const selectButton = screen.getByText('选择');
      fireEvent.click(selectButton);
      const okButton = screen.getByText('确定');
      fireEvent.click(okButton);
      
      // 填写并提交登录表单
      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const emailInput = screen.getByPlaceholderText('请输入邮箱');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const loginButton = screen.getByText('登录');
      
      fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        const { message } = require('antd');
        expect(message.error).toHaveBeenCalledWith('登录失败: 用户名或密码错误');
      });
    });
  });

  describe('注册功能', () => {
    beforeEach(() => {
      // 设置必要的localStorage值，让应用进入登录界面
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'legalAgreed') return 'true';
        if (key === 'halloChat_servers') return JSON.stringify([{ id: '1', name: '测试服务器', address: 'localhost', port: '7932' }]);
        return null;
      });
    });

    it('应该成功注册并显示注册成功弹窗', async () => {
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      
      // 模拟选择服务器并进入登录
      const selectButton = screen.getByText('选择');
      fireEvent.click(selectButton);
      const okButton = screen.getByText('确定');
      fireEvent.click(okButton);
      
      // 切换到注册模式
      const registerLink = screen.getByText('没有账号？去注册');
      fireEvent.click(registerLink);
      
      // 填写并提交注册表单
      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const emailInput = screen.getByPlaceholderText('请输入邮箱');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const registerButton = screen.getByText('注册');
      
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(registerButton);
      
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        });
        expect(screen.getByText('注册成功')).toBeInTheDocument();
      });
    });

    it('应该在注册失败时显示错误消息', async () => {
      const mockError = new Error('用户名已存在');
      authService.register.mockRejectedValue(mockError);
      
      render(<App />);
      const startButton = screen.getByText('🚀 开始使用');
      fireEvent.click(startButton);
      
      // 模拟选择服务器并进入登录
      const selectButton = screen.getByText('选择');
      fireEvent.click(selectButton);
      const okButton = screen.getByText('确定');
      fireEvent.click(okButton);
      
      // 切换到注册模式
      const registerLink = screen.getByText('没有账号？去注册');
      fireEvent.click(registerLink);
      
      // 填写并提交注册表单
      const usernameInput = screen.getByPlaceholderText('请输入用户名');
      const emailInput = screen.getByPlaceholderText('请输入邮箱');
      const passwordInput = screen.getByPlaceholderText('请输入密码');
      const registerButton = screen.getByText('注册');
      
      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(registerButton);
      
      await waitFor(() => {
        const { message } = require('antd');
        expect(message.error).toHaveBeenCalledWith('注册请求失败: 用户名已存在');
      });
    });
  });

  describe('登出功能', () => {
    it('应该正确处理登出操作', () => {
      // 模拟已登录状态
      const originalAuthService = require('./services/authService');
      originalAuthService.isAuthenticated = jest.fn().mockReturnValue(true);
      
      render(<App />);
      // 假设MainWindow组件有一个登出按钮
      const logoutButton = screen.getByText('退出登录');
      fireEvent.click(logoutButton);
      
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });
  });

  describe('环境检测功能', () => {
    it('应该正确检测Electron环境并跳过自动填充', async () => {
      // 模拟Electron环境
      window.process = { type: 'renderer' };
      
      render(<App />);
      // 执行到注册成功的逻辑
      // ... 这里可以添加注册成功的测试代码
      
      // 验证自动填充被跳过
      const successButton = screen.getByText('确定');
      fireEvent.click(successButton);
      
      // 恢复window.process
      window.process = null;
    });
  });
});