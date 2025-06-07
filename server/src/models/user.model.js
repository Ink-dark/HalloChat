// 引入必要依赖
const { v1: uuidv1 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const saltRounds = 12;

// 初始化数据库连接
let db;
async function initDatabase() {
  try {
    db = await open({ 
      filename: './database/user.db',
      driver: sqlite3.Database 
    });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        user_uuid TEXT NOT NULL,
        random_id TEXT NOT NULL UNIQUE,
        random_id_updated_at DATETIME
      )
    `);
    const logger = require('../utils/logger');
    logger.info('SQLite数据库初始化完成');
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error('数据库初始化失败', { error: err.message });
  }
}
initDatabase();

// 生成8位随机ID
function generateRandomId() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// 用户注册逻辑
async function registerUser(userData) {
  if (!userData.username || !userData.password) {
    throw new Error('用户名和密码不能为空');
  }

  // 支持中文的格式校验（3-20位，允许中文、字母、数字、下划线）
  const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(userData.username)) {
    throw new Error('用户名需为3-20位(支持中文、字母、数字、下划线)');
  }

  try {
    const userUuid = uuidv1();
    let randomId = generateRandomId();
    let existingUser = await db.get('SELECT id FROM users WHERE random_id = ?', [randomId]);
    while (existingUser) {
      randomId = generateRandomId();
      existingUser = await db.get('SELECT id FROM users WHERE random_id = ?', [randomId]);
    }

    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    const result = await db.run(`
      INSERT INTO users (username, password, user_uuid, random_id, random_id_updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      userData.username,
      hashedPassword,
      userUuid,
      randomId,
      new Date().toISOString()
    ]);

    return {
      userId: result.lastID,
      userUuid,
      randomId
    };
  } catch (err) {
    const errorCodes = require('../config/errorCodes');
    if (err.message.includes('UNIQUE constraint failed')) {
      // 密码复杂度校验（8-16位，包含字母、数字和特殊字符）
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;
      if (!passwordRegex.test(userData.password)) {
        const error = new Error(errorCodes.DB['003'].message);
        error.status = 400;
        throw error;
      }
      const error = new Error(errorCodes.DB['002'].message.replace('{username}', userData.username));
      error.code = errorCodes.DB['002'].code;
      throw error;
    }
    throw new Error('注册失败: ' + err.message);
  }
}

// 用户登录验证
async function loginUser(username, plainPassword) {
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) throw new Error('用户不存在');

  const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
  if (!isPasswordValid) throw new Error('密码错误');

  return {
    id: user.id,
    username: user.username,
    userUuid: user.user_uuid,
    randomId: user.random_id
  };
}

module.exports = { registerUser, loginUser };