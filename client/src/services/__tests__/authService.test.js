import axios from 'axios';
import authService from '../authService';

// Mock axios
jest.mock('axios');

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置authService实例
    delete require.cache[require.resolve('../authService')];
  });

  describe('构造函数和setServerAddress', () => {
    it('应该使用localStorage中的服务器地址初始化', () => {
      localStorage.getItem.mockReturnValue('test-server:8080');
      const mockAuthService = new (require('../authService').default.constructor)();
      expect(mockAuthService.serverAddress).toBe('test-server:8080');
      expect(mockAuthService.apiUrl).toBe('http://test-server:8080/api');
    });

    it('应该使用默认地址初始化当localStorage中没有服务器地址', () => {
      localStorage.getItem.mockReturnValue(null);
      const mockAuthService = new (require('../authService').default.constructor)();
      expect(mockAuthService.serverAddress).toBe('localhost:7932');
      expect(mockAuthService.apiUrl).toBe('http://localhost:7932/api');
    });

    it('应该正确处理包含http://前缀的地址', () => {
      const mockAuthService = new (require('../authService').default.constructor)();
      mockAuthService.setServerAddress('http://test-server:8080');
      expect(mockAuthService.serverAddress).toBe('http://test-server:8080');
      expect(mockAuthService.apiUrl).toBe('http://test-server:8080/api');
    });
  });

  describe('login方法', () => {
    it('应该成功登录并返回用户信息（不包含密码）', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      };
      const mockResponse = {
        data: {
          token: 'test-token',
          user: mockUser
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.login('testuser', 'password123');

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:7932/api/auth/login',
        { username: 'testuser', password: 'password123' }
      );
      expect(localStorage.setItem).toHaveBeenCalledWith('halloChat_token', 'test-token');
      expect(result).toEqual({ id: '1', username: 'testuser', email: 'test@example.com' });
    });

    it('应该在登录失败时抛出错误', async () => {
      const mockError = {
        response: {
          data: {
            message: '用户名或密码错误'
          }
        }
      };
      axios.post.mockRejectedValue(mockError);

      await expect(authService.login('wronguser', 'wrongpass')).rejects.toThrow('用户名或密码错误');
    });

    it('应该在没有响应数据时抛出默认错误', async () => {
      const mockError = { message: 'Network Error' };
      axios.post.mockRejectedValue(mockError);

      await expect(authService.login('testuser', 'password123')).rejects.toThrow('登录失败，请检查用户名和密码');
    });
  });

  describe('register方法', () => {
    it('应该成功注册并返回用户信息', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      };
      const mockResponse = {
        data: {
          token: 'new-user-token',
          user: {
            id: '2',
            username: 'newuser',
            email: 'new@example.com'
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:7932/api/auth/register',
        userData
      );
      expect(localStorage.setItem).toHaveBeenCalledWith('halloChat_token', 'new-user-token');
      expect(result).toEqual({ id: '2', username: 'newuser', email: 'new@example.com' });
    });

    it('应该在注册失败时抛出错误', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      };
      const mockError = {
        response: {
          data: {
            message: '用户名已存在'
          }
        }
      };
      axios.post.mockRejectedValue(mockError);

      await expect(authService.register(userData)).rejects.toThrow('注册失败: 用户名已存在');
    });
  });

  describe('logout方法', () => {
    it('应该清除localStorage中的token', () => {
      authService.logout();
      expect(localStorage.removeItem).toHaveBeenCalledWith('halloChat_token');
    });
  });

  describe('isAuthenticated方法', () => {
    it('应该在有token时返回true', () => {
      localStorage.getItem.mockReturnValue('test-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('应该在没有token时返回false', () => {
      localStorage.getItem.mockReturnValue(null);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser方法', () => {
    it('应该在有token时返回当前用户信息', async () => {
      localStorage.getItem.mockReturnValue('test-token');
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com'
      };
      axios.get.mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:7932/api/users/current',
        { headers: { 'Authorization': 'Bearer test-token' } }
      );
      expect(result).toEqual(mockUser);
    });

    it('应该在没有token时返回null', async () => {
      localStorage.getItem.mockReturnValue(null);
      const result = await authService.getCurrentUser();
      expect(result).toBe(null);
    });

    it('应该在获取用户信息失败时登出并返回null', async () => {
      localStorage.getItem.mockReturnValue('test-token');
      axios.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await authService.getCurrentUser();

      expect(authService.logout).toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });

  describe('checkServerConnection方法', () => {
    it('应该在连接成功时返回成功状态和延迟信息', async () => {
      axios.get.mockResolvedValue({ status: 200 });

      const result = await authService.checkServerConnection();

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:7932/api/health',
        { timeout: 5000 }
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result).toHaveProperty('latency');
    });

    it('应该在连接失败时返回失败状态和错误信息', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));

      const result = await authService.checkServerConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });
  });
});