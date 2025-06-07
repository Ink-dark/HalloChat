class User {
  constructor({ 
    id, 
    username, 
    avatar, 
    onlineStatus = false, 
    lastSeen = null 
  }) {
    this.id = id;
    this.username = username;
    this.avatar = avatar;
    this.onlineStatus = onlineStatus;
    this.lastSeen = lastSeen || new Date().getTime();
    this.typingStatus = false;
  }

  // 更新在线状态
  updateOnlineStatus(status) {
    this.onlineStatus = status;
    this.lastSeen = new Date().getTime();
  }

  // 更新输入状态
  updateTypingStatus(isTyping) {
    this.typingStatus = isTyping;
  }
}

export default User;