// 错误码常量定义（分类清晰，便于扩展）
module.exports = {
  AUTH: {
    '001': { code: 'AUTH_001', message: '用户名不存在' },
    '002': { code: 'AUTH_002', message: '密码错误（剩余尝试次数：{remaining}' },
    '003': { code: 'AUTH_003', message: '会话过期（Token失效）' },
    '004': { code: 'AUTH_004', message: '未登录访问受限接口' },
    '005': { code: 'AUTH_005', message: '用户权限不足（如非管理员）' },
  },
  DB: {
    '001': { code: 'DB_001', message: '数据库连接失败' },
    '002': { code: 'DB_002', message: '数据插入失败（用户名已存在）' },
    '003': { code: 'DB_003', message: '数据查询为空（用户/消息不存在）' },
    '004': { code: 'DB_004', message: '数据更新失败（记录已删除）' },
    '005': { code: 'DB_005', message: '数据删除失败（关联数据存在）' },
  },
  NET: {
    '001': { code: 'NET_001', message: '请求超时（服务器无响应）' },
    '002': { code: 'NET_002', message: '无效的请求格式（参数缺失）' },
    '003': { code: 'NET_003', message: '参数格式错误（如密码长度不足）' },
    '004': { code: 'NET_004', message: '接口不存在（路径错误）' },
    '005': { code: 'NET_005', message: '跨域请求被拒绝' },
  },
  FILE: {
    '001': { code: 'FILE_001', message: '上传文件过大（限制{maxSize}MB）' },
    '002': { code: 'FILE_002', message: '文件类型不支持（仅允许{allowedTypes}）' },
    '003': { code: 'FILE_003', message: '文件下载失败（资源已删除）' },
    '004': { code: 'FILE_004', message: '文件读写权限不足' },
  },
  SYS: {
    '001': { code: 'SYS_001', message: '服务器内部错误' },
    '002': { code: 'SYS_002', message: '配置文件缺失（如config.json）' },
    '003': { code: 'SYS_003', message: '依赖库未安装（如sqlite3），请运行npm install sqlite3安装' }
  }
};