const express = require('express');
const router = express.Router();
const Friend = require('../models/friend.model');
const User = require('../models/user.model');
const authenticateToken = require('../middleware/auth');
const { RESPONSE } = require('../../utils/constants');

// 发送好友请求
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const requesterId = req.user.id;
    
    // 验证参数
    if (!recipientId) {
      return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
        success: false,
        message: 'recipientId 是必填参数'
      });
    }
    
    // 检查接收者是否存在
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(RESPONSE.ERROR.NOT_FOUND).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 发送好友请求
    const friendRequest = await Friend.sendFriendRequest(requesterId, recipientId, message);
    
    res.status(RESPONSE.SUCCESS.CREATED).json({
      success: true,
      message: '好友请求发送成功',
      data: friendRequest
    });
    
  } catch (error) {
    console.error('发送好友请求错误:', error);
    
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取待处理的好友请求
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const pendingRequests = await Friend.getPendingRequests(userId);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '获取待处理好友请求成功',
      data: pendingRequests
    });
    
  } catch (error) {
    console.error('获取待处理好友请求错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 接受好友请求
router.put('/requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    const friendRequest = await Friend.acceptFriendRequest(requestId, userId);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '好友请求已接受',
      data: friendRequest
    });
    
  } catch (error) {
    console.error('接受好友请求错误:', error);
    
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 拒绝好友请求
router.put('/requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    const friendRequest = await Friend.rejectFriendRequest(requestId, userId);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: false,
      message: '好友请求已拒绝',
      data: friendRequest
    });
    
  } catch (error) {
    console.error('拒绝好友请求错误:', error);
    
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取好友列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const friends = await Friend.getFriends(userId);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '获取好友列表成功',
      data: friends
    });
    
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 搜索用户（用于添加好友）
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { keyword } = req.query;
    const userId = req.user.id;
    
    if (!keyword || keyword.trim().length < 2) {
      return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }
    
    // 搜索用户（排除自己）
    const users = await User.find({
      $and: [
        { _id: { $ne: userId } },
        {
          $or: [
            { username: { $regex: keyword, $options: 'i' } },
            { email: { $regex: keyword, $options: 'i' } }
          ]
        }
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

// 删除好友
router.delete('/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;
    
    const result = await Friend.removeFriend(friendId, userId);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: result.message,
      data: null
    });
    
  } catch (error) {
    console.error('删除好友错误:', error);
    
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新好友备注
router.put('/:friendId/alias', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { alias } = req.body;
    const userId = req.user.id;
    
    if (!alias || alias.trim().length === 0) {
      return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
        success: false,
        message: '备注不能为空'
      });
    }
    
    if (alias.trim().length > 50) {
      return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
        success: false,
        message: '备注长度不能超过50个字符'
      });
    }
    
    const friend = await Friend.updateFriendAlias(friendId, userId, alias);
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: '好友备注更新成功',
      data: friend
    });
    
  } catch (error) {
    console.error('更新好友备注错误:', error);
    
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 星标/取消星标好友
router.put('/:friendId/star', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { isStarred } = req.body;
    const userId = req.user.id;
    
    const friend = await Friend.findById(friendId);
    
    if (!friend) {
      return res.status(RESPONSE.ERROR.NOT_FOUND).json({
        success: false,
        message: '好友关系不存在'
      });
    }
    
    // 检查权限
    if (!friend.isUserInvolved(userId)) {
      return res.status(RESPONSE.ERROR.FORBIDDEN).json({
        success: false,
        message: '无权操作此好友关系'
      });
    }
    
    friend.isStarred = isStarred === true;
    friend.updatedAt = new Date();
    await friend.save();
    
    res.status(RESPONSE.SUCCESS.OK).json({
      success: true,
      message: isStarred ? '好友已星标' : '好友已取消星标',
      data: friend
    });
    
  } catch (error) {
    console.error('星标好友错误:', error);
    res.status(RESPONSE.ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;