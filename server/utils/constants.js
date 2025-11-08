// 应用常量定义

// 用户相关常量
const USER = {
  // 用户名规则
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
    MESSAGE: '用户名只能包含中文、字母、数字和下划线'
  },
  
  // 密码规则
 PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
    // 修改后的密码规则：至少包含大小写字母、数字、特定符号中的三种
    PATTERN: /^(?:(?=.*[a-z])(?=.*[A-Z])(?=.*\d)|(?=.*[a-z])(?=.*[A-Z])(?=.*[~!@#$%^&*()_+-])|(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^&*()_+-])|(?=.*[a-z])(?=.*\d)(?=.*[~!@#$%^&*()_+-]))[A-Za-z\d~!@#$%^&*()_+-]{6,20}$/,
    MESSAGE: '密码必须包含大写字母、小写字母、数字、特殊符号（~!@#$%^&*()_+-）中的至少三种，长度为6-20个字符'
 },
  
  // 邮箱规则
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: '请输入有效的邮箱地址'
  }
};

// 消息相关常量
const MESSAGE = {
  // 消息类型
  TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    FILE: 'file',
    SYSTEM: 'system'
  },
  
  // 消息状态
  STATUS: {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
  },
  
  // 内容限制
  CONTENT: {
    MAX_LENGTH: 5000,
    MIN_LENGTH: 1
  }
};

// 聊天相关常量
const CHAT = {
  // 聊天类型
  TYPES: {
    PRIVATE: 'private',
    GROUP: 'group',
    CHANNEL: 'channel'
  },
  
  // 群组角色
  ROLES: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member'
  }
};

// 系统常量
const SYSTEM = {
  // 分页
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
  
  // 缓存
  CACHE: {
    TTL: 3600, // 1小时
    USER_TTL: 1800, // 30分钟
    MESSAGE_TTL: 300 // 5分钟
  },
  
  // 文件上传
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mp3',
      'audio/wav',
      'video/mp4',
      'application/pdf',
      'text/plain'
    ]
  }
};

// 响应状态码
const RESPONSE = {
  SUCCESS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202
  },
  ERROR: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  }
};

// Socket事件
const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // 认证事件
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  
  // 用户事件
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_TYPING: 'user:typing',
  USER_STOP_TYPING: 'user:stop_typing',
  
  // 消息事件
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_EDIT: 'message:edit',
  
  // 群组事件
  GROUP_JOIN: 'group:join',
  GROUP_LEAVE: 'group:leave',
  GROUP_UPDATE: 'group:update',
  
  // 错误事件
  ERROR: 'error'
};

// 日志级别
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// 环境类型
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

module.exports = {
  USER,
  MESSAGE,
  CHAT,
  SYSTEM,
  RESPONSE,
  SOCKET_EVENTS,
  LOG_LEVELS,
  ENVIRONMENTS
};