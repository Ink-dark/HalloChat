const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const redis = require('redis');

// MySQL 连接池
const mysqlPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your-mysql-password',
  database: 'hallo_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// MongoDB 客户端
const mongoClient = new MongoClient('mongodb://localhost:27017');
await mongoClient.connect();
const mongoDb = mongoClient.db('hallo_chat');

// Redis 客户端
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

module.exports = {
  mysqlPool,
  mongoDb,
  redisClient
};