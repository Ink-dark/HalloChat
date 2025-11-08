const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const authenticateToken = require('../middleware/auth');
const { RESPONSE } = require('../../utils/constants');

// 获取用户信息
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(RESPONSE.ERROR.NOT_FOUND).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '获取用户信息成功',
      data: user
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 搜索用户
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword || keyword.trim().length < 2) {
      return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ]
    }).select('username avatar email status').limit(20);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '搜索用户成功',
      data: users
    });
    
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新用户信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, avatar } = req.body;
    
    // 检查权限
    if (id !== req.user.id) {
      return res.status(RESPONSE.ERROR.FORBIDDEN).json({
        success: false,
        message: '无权修改其他用户信息'
      });
    }
    
    const updateData = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '用户信息更新成功',
      data: user
    });
    
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;