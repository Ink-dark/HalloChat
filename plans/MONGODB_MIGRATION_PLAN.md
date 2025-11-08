# 🔄 SQLite → MongoDB 迁移计划

## 📋 迁移概述

将项目从SQLite + Sequelize迁移到MongoDB + Mongoose，需要修改以下部分：

## 🎯 需要修改的文件清单

### 1. 配置文件
- [ ] `server/config/config.json` - 数据库连接配置
- [ ] `server/package.json` - 依赖包替换
- [ ] `server/.env.example` - MongoDB连接字符串

### 2. 数据模型
- [ ] `server/src/models/user.js` - 用户模型 (Sequelize → Mongoose)
- [ ] `server/src/models/channel.js` - 频道模型
- [ ] `server/src/models/group.js` - 群组模型
- [ ] `server/src/models/message.js` - 消息模型

### 3. 数据库初始化
- [ ] `server/models/index.js` - Sequelize初始化 → Mongoose初始化
- [ ] 移除Sequelize迁移文件

### 4. 业务逻辑
- [ ] 所有使用Sequelize查询的地方需要改为Mongoose
- [ ] 更新关联关系处理
- [ ] 修改事务处理逻辑

## 🔧 迁移步骤

### 步骤1: 依赖包替换
```bash
# 移除Sequelize相关依赖
npm uninstall sequelize sequelize-cli sqlite3 sqlite

# 安装MongoDB相关依赖
npm install mongoose mongodb
```

### 步骤2: 配置更新
- 更新数据库连接配置
- 修改环境变量模板
- 更新配置文件

### 步骤3: 模型转换
- 将Sequelize模型转换为Mongoose模式
- 更新字段定义和验证规则
- 重构实例方法和静态方法

### 步骤4: 代码重构
- 更新所有数据库查询语句
- 修改关联关系处理
- 调整错误处理逻辑

## 📊 模型映射表

| SQLite(Sequelize) | MongoDB(Mongoose) | 备注 |
|-------------------|-------------------|------|
| INTEGER | Number | 自增ID → ObjectId |
| STRING | String | 字符串类型 |
| TEXT | String | 长文本 |
| BOOLEAN | Boolean | 布尔值 |
| DATE | Date | 日期时间 |
| JSON | Mixed/Schema | JSON数据 |

## 🚨 注意事项

1. **主键变化**: SQLite的自增ID → MongoDB的ObjectId
2. **关联关系**: Sequelize的关联 → Mongoose的引用或嵌套
3. **事务处理**: SQLite事务 → MongoDB事务
4. **查询语法**: Sequelize查询 → Mongoose查询
5. **迁移工具**: Sequelize CLI → MongoDB工具

## 🎯 开始迁移

让我们开始逐步迁移...