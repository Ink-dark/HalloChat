require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 3000,
  maxConnections: process.env.MAX_CONNECTIONS || 1000,
  forceLogoutEnabled: process.env.FORCE_LOGOUT_ENABLED === 'true' || false,
  
  // 数据库配置
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/hallo-chat',
  mongoOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  
  // CORS配置
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // JWT配置
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // 安全配置
  bcrypt: {
    saltRounds: process.env.BCRYPT_SALT_ROUNDS || 10
  },
  
  // 文件上传配置
  uploads: {
    maxSize: process.env.UPLOAD_MAX_SIZE || '10mb',
    directory: process.env.UPLOAD_DIRECTORY || './uploads'
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true' || true
  },
  
  // 速率限制配置
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15分钟
    max: process.env.RATE_LIMIT_MAX || 100 // 每个IP每窗口最多100个请求
  },
  
  // WebSocket配置
  websocket: {
    pingInterval: process.env.WS_PING_INTERVAL || 25000,
    pingTimeout: process.env.WS_PING_TIMEOUT || 5000
  },
  
  // 消息配置
  messages: {
    maxLength: process.env.MESSAGE_MAX_LENGTH || 2000,
    recallTimeout: process.env.MESSAGE_RECALL_TIMEOUT || 120000, // 2分钟
    editTimeout: process.env.MESSAGE_EDIT_TIMEOUT || 900000 // 15分钟
  },
  
  // 搜索配置
  search: {
    pageSize: process.env.SEARCH_PAGE_SIZE || 20
  },
  
  // MDNS配置
  mdns: {
    enabled: process.env.MDNS_ENABLED !== 'false' && true,
    serviceName: process.env.MDNS_SERVICE_NAME || 'hallo-chat',
    displayName: process.env.MDNS_DISPLAY_NAME || 'Hallo Chat Server',
    serviceType: 'tcp'
  }
};