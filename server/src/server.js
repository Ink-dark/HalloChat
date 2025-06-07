const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const WebSocketService = require('./services/websocket');
const apiRoutes = require('./routes/api');
const mdns = require('mdns');
const config = require('../config.json');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(express.json());
app.use('/api', apiRoutes);

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hallochat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// WebSocket服务
new WebSocketService(server);

const PORT = config.port || process.env.PORT || 5000;

// 启用MDNS服务广播
if (config.mdns.enabled) {
  const ad = mdns.createAdvertisement(mdns.tcp(config.mdns.serviceName), PORT, {
    name: config.mdns.displayName
  });
  ad.start();
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));