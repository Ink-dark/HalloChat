const express = require('express');
const morgan = require('morgan');
const logger = require('./utils/logger');

const app = express();
// 将Morgan日志输出重定向到Winston
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// 应用配置：端口
app.listen(config.port, () => {
  console.log(`服务已启动，端口：${config.port}`);
});

// 应用配置：最大连接数（示例，实际需根据框架调整）
app.set('maxConnections', config.maxConnections);

// 强制下线接口（根据config.forceLogoutEnabled控制是否启用）
if (config.forceLogoutEnabled) {
  app.post('/api/force-logout', (req, res) => {
    // 实现强制下线逻辑（如清除用户会话）
    res.send({ success: true, message: "用户已强制下线" });
  });
}