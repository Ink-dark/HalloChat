import axios from 'axios';
import authService from './authService';

class MessageService {
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

  // 获取与某个用户的聊天历史
  async getChatHistory(contactId, limit = 50, offset = 0) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/messages/history/${contactId}`,
        {
          headers: this.getAuthHeaders(),
          params: { limit, offset }
        }
      );
      return response.data?.data || [];
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      throw error;
    }
  }

  // 发送消息
  async sendMessage(receiverId, content, type = 'text') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/messages/send`,
        { receiverId, content, type },
        { headers: this.getAuthHeaders() }
      );
      return response.data?.data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 标记消息为已读
  async markAsRead(messageId) {
    try {
      const response = await axios.put(
        `${this.apiUrl}/messages/${messageId}/read`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('标记消息已读失败:', error);
      throw error;
    }
  }

  // 获取群组聊天历史
  async getGroupChatHistory(groupId, limit = 50, offset = 0) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/messages/group/${groupId}`,
        {
          headers: this.getAuthHeaders(),
          params: { limit, offset }
        }
      );
      return response.data?.data || [];
    } catch (error) {
      console.error('获取群组聊天历史失败:', error);
      throw error;
    }
  }

  // 发送群组消息
  async sendGroupMessage(groupId, content, type = 'text') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/messages/group/${groupId}`,
        { content, type },
        { headers: this.getAuthHeaders() }
      );
      return response.data?.data;
    } catch (error) {
      console.error('发送群组消息失败:', error);
      throw error;
    }
  }
}

const messageService = new MessageService();
export default messageService;
