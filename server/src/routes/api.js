const express = require('express');
const router = express.Router();
const Message = require('../models/message.model');

// 健康检查接口
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hallo-chat-server'
  });
});

// 消息发送路由
router.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const message = new Message({ senderId, receiverId, content });
    await message.save();
    
    // WebSocket推送逻辑
    const io = req.app.get('io');
    if (io) {
      // 向接收者发送消息
      io.to(receiverId).emit('newMessage', message);
      // 向发送者确认消息已发送
      io.to(senderId).emit('messageSent', message);
    }
    
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取消息历史
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 撤回消息
router.put('/messages/:messageId/recall', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        isRecalled: true,
        originalContent: req.body.originalContent,
        canBeEdited: true
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: '消息未找到' });
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 编辑消息
router.put('/messages/:messageId/edit', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        content,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: '消息未找到' });
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新消息已读状态
router.put('/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: '消息未找到' });
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;