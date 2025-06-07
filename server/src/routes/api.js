const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Message = require('../models/message');

// 用户认证路由
router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email, captcha } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // 验证码验证
    if (!captcha || captcha !== req.session.captcha) {
      return res.status(400).json({ error: '验证码错误' });
    }
    
    // IP限制 - 24小时内最多注册5个账号
    const ipCount = await User.countDocuments({ 
      registrationIp: clientIp,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    if (ipCount >= 5) {
      return res.status(429).json({ error: '该IP注册账号过多，请稍后再试' });
    }
    
    // 验证用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 创建新用户
    const user = new User({ 
      username, 
      email,
      registrationIp: clientIp
    });
    await user.setPassword(password);
    await user.save();
    
    // 生成认证token
    const token = user.generateAuthToken();
    res.status(201).json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !user.validPassword(password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = user.generateAuthToken();
    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 消息发送路由
router.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const message = new Message({ senderId, receiverId, content });
    await message.save();
    
    // 这里可以添加WebSocket推送逻辑
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