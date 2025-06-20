import axios from 'axios';

class AuthService {
  constructor() {
    this.serverAddress = localStorage.getItem('halloChat_server') || 'localhost:3000';
    this.apiUrl = `http://${this.serverAddress}/api`;
  }

  setServerAddress(address) {
    this.serverAddress = address;
    this.apiUrl = `http://${address}/api`;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        username,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('halloChat_token', response.data.token);
      }
      
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || '登录失败，请检查用户名和密码');
    }
  }

  async register(username, password, email) {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/register`, {
        username,
        password,
        email
      });
      
      if (response.data.token) {
        localStorage.setItem('halloChat_token', response.data.token);
      }
      
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || '注册失败，请稍后重试');
    }
  }

  logout() {
    localStorage.removeItem('halloChat_token');
  }

  getCurrentUser() {
    // 在实际应用中，这里可以通过token获取用户信息
    return {
      username: localStorage.getItem('halloChat_username')
    };
  }

  isAuthenticated() {
    return !!localStorage.getItem('halloChat_token');
  }
}

export default new AuthService();