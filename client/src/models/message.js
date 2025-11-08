class Message {
  constructor({ 
    id, 
    senderId, 
    receiverId, 
    content, 
    timestamp, 
    status = 'sent', 
    type = 'text',
    isRecalled = false,
    isEdited = false,
    editHistory = [],
    originalContent = '',
    canBeEdited = false,
    isRead = false,
    isDelivered = false,
    deviceId = '',
    syncStatus = 'pending'
  }) {
    this.id = id;
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.content = content;
    this.timestamp = timestamp || new Date().getTime();
    this.status = status; // sent, delivered, read
    this.type = type; // text, image, audio
    this.isRecalled = isRecalled;
    this.isEdited = isEdited;
    this.editHistory = editHistory;
    this.originalContent = originalContent || content;
    this.canBeEdited = canBeEdited;
    this.isRead = isRead;
    this.isDelivered = isDelivered;
    this.deviceId = deviceId;
    this.syncStatus = syncStatus; // pending, synced, conflict
  }

  // 更新消息状态
  updateStatus(newStatus) {
    this.status = newStatus;
  }
  
  // 撤回消息
  recall() {
    this.isRecalled = true;
    this.content = '[消息已撤回]';
    this.canBeEdited = (new Date().getTime() - this.timestamp) < 120000; // 2分钟内可重新编辑
  }
  
  // 编辑消息
  edit(newContent) {
    if (!this.isRecalled || this.canBeEdited) {
      this.editHistory.push({
        timestamp: new Date().getTime(),
        previousContent: this.content
      });
      this.content = newContent;
      this.isEdited = true;
      this.isRecalled = false;
      this.canBeEdited = false;
      return true;
    }
    return false;
  }
  
  // 标记为已读
  markAsRead() {
    this.isRead = true;
    this.status = 'read';
  }
  
  // 标记为已送达
  markAsDelivered() {
    this.isDelivered = true;
    this.status = 'delivered';
  }
}

export default Message;