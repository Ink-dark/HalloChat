import axios from 'axios';
import authService from './authService';

class ContactService {
  constructor() {
    this.apiUrl = authService.apiUrl;
  }

  getToken() {
    return localStorage.getItem('halloChat_token');
  }

  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // 获取好友列表
  async getFriends() {
    try {
      const response = await axios.get(`${this.apiUrl}/friends`, {
        headers: this.getAuthHeaders()
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('获取好友列表失败:', error);
      throw error;
    }
  }

  // 添加好友
  async addFriend(friendUsername) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/friends/add`,
        { friendUsername },
        { headers: this.getAuthHeaders() }
      );
      return response.data?.data;
    } catch (error) {
      console.error('添加好友失败:', error);
      throw error;
    }
  }

  // 删除好友
  async removeFriend(friendId) {
    try {
      const response = await axios.delete(
        `${this.apiUrl}/friends/${friendId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('删除好友失败:', error);
      throw error;
    }
  }

  // 获取群组列表
  async getGroups() {
    try {
      const response = await axios.get(`${this.apiUrl}/groups`, {
        headers: this.getAuthHeaders()
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('获取群组列表失败:', error);
      throw error;
    }
  }

  // 创建群组
  async createGroup(groupData) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/groups`,
        groupData,
        { headers: this.getAuthHeaders() }
      );
      return response.data?.data;
    } catch (error) {
      console.error('创建群组失败:', error);
      throw error;
    }
  }
}

const contactService = new ContactService();
export default contactService;
