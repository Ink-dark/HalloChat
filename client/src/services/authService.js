import axios from 'axios';

class AuthService {
  constructor() {
    this.serverAddress = localStorage.getItem('halloChat_server') || 'localhost:7932';
    // 确保URL格式正确，不重复添加http://前缀
    this.apiUrl = this.serverAddress.startsWith('http://') || this.serverAddress.startsWith('https://')
      ? `${this.serverAddress}/api`
      : `http://${this.serverAddress}/api`;
  }

  setServerAddress(address) {
    this.serverAddress = address;
    // 确保URL格式正确，不重复添加http://前缀和/api后缀
    if (address.startsWith('http://') || address.startsWith('https://')) {
      this.apiUrl = address.includes('/api') ? address : `${address}/api`;
    } else {
      this.apiUrl = `http://${address}/api`;
    }
  }

  async login(username, password) {
    try {
      console.log('authService.login: 准备发送登录请求', { username });
      console.log('登录请求URL:', `${this.apiUrl}/auth/login`);
      
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        username,
        password
      });
      
      console.log('authService.login: 收到服务器响应', { 
        status: response.status,
        hasToken: !!response.data?.data?.token,
        responseDataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // 修复token路径问题：从response.data.data.token获取token
      if (response.data?.data?.token) {
        console.log('authService.login: 发现token，正在存储到localStorage');
        localStorage.setItem('halloChat_token', response.data.data.token);
        console.log('authService.login: token存储成功');
      } else {
        console.warn('authService.login: 响应中没有token字段');
      }
      
      // 修复用户数据路径问题：从response.data.data.user获取用户数据
      const userData = response.data?.data?.user || {};
      // 移除密码字段 - 重命名避免与参数冲突
      const { password: userPassword, ...userWithoutPassword } = userData;
      console.log('authService.login: 返回用户数据', { userWithoutPassword });
      return userWithoutPassword;
    } catch (error) {
      console.error('authService.login: 登录请求失败', { 
        error: error.message,
        response: error.response ? { 
          status: error.response.status,
          data: error.response.data 
        } : null
      });
      throw new Error(error.response?.data?.message || '登录失败，请检查用户名和密码');
    }
  }

  async register(userData) {
    try {
      console.log('发送注册请求到URL:', `${this.apiUrl}/auth/register`);
      const response = await axios.post(`${this.apiUrl}/auth/register`, userData);
      console.log('注册成功，服务器响应:', response.data);
      
      // 修复token路径问题：从response.data.data.token获取token
      if (response.data?.data?.token) {
        localStorage.setItem('halloChat_token', response.data.data.token);
      }
      
      // 修复用户数据路径问题：从response.data.data.user获取用户数据
      return response.data?.data?.user || {};
    } catch (error) {
      console.error('注册请求错误:', error);
      console.error('错误响应:', error.response);
      throw new Error(`注册失败: ${error.message || error.response?.data?.message || '未知错误'}`);
    }
  }

  logout() {
    localStorage.removeItem('halloChat_token');
  }

  async getCurrentUser() {
    const token = localStorage.getItem('halloChat_token');
    if (!token) return null;
    
    try {
      const response = await axios.get(`${this.apiUrl}/users/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('[用户信息获取失败]', error);
      this.logout();
      return null;
    }
  }

  isAuthenticated() {
    return !!localStorage.getItem('halloChat_token');
  }

  // 检查服务器连接状态
  async checkServerConnection() {
    try {
      console.log('[连接验证] 正在测试服务器连接:', this.apiUrl);
      const startTime = Date.now();
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      const latency = Date.now() - startTime;
      console.log(`[连接验证] 服务器连接成功! 响应时间: ${latency}ms, 状态: ${response.status}`);
      return { success: true, latency, status: response.status };
    } catch (error) {
      console.error('[连接验证] 服务器连接失败:', error.message || '未知错误');
      return { success: false, error: error.message || '未知错误' };
    }
  }

  // 用于登录界面的服务器连接测试
  async testConnection() {
    try {
      const result = await this.checkServerConnection();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;