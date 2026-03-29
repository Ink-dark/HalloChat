# HalloChat 使用与开发指南

## 项目概述

**HalloChat** 是一款基于 React + Electron 的桌面即时通讯应用，采用 Node.js + Express + MongoDB + Redis 架构，提供安全、高效、易用的实时沟通平台。

### 核心功能
- ✅ 用户认证系统（登录/注册/登出）
- ✅ 实时聊天功能（单聊/群聊）
- ✅ 加密聊天（端到端加密）
- ✅ 多语言支持（简体中文、繁体中文、英语、俄语）
- ✅ 服务器发现与配置
- ✅ 好友系统
- ✅ 频道功能
- ✅ 文件传输
- ✅ 消息管理

## 快速开始

### 前提条件
- **Node.js**：16.x+
- **npm**：8.x+
- **MongoDB**：5.0+
- **Redis**：6.0+
- **Electron**：最新版本

### 安装与运行

#### 方法 1：从源代码运行

```bash
# 克隆仓库
git clone https://github.com/Ink-dark/HalloChat.git
cd HalloChat

# 安装服务端依赖
cd server
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等配置

# 启动服务端
npm start

# 新开终端，启动客户端
cd ../client
npm install
npm start
```

#### 方法 2：使用服务管理器（Windows）

```bash
# 运行服务管理器
cd server/manager
python server_manager.py
```

## 使用指南

### 基本操作

#### 1. 用户注册
1. 启动客户端应用
2. 点击"注册"按钮
3. 填写注册信息：
   - **用户名**：3-20个字符，支持中文、字母、数字和下划线
   - **邮箱**：有效的邮箱地址
   - **密码**：6-20个字符，需包含字母、数字和特殊字符
   - **确认密码**：再次输入密码
4. 选择服务器地址
5. 点击"注册"完成注册

#### 2. 用户登录
1. 在登录界面输入用户名和密码
2. 选择服务器地址
3. 可选择"记住我"功能
4. 点击"登录"进入主界面

#### 3. 发送消息
1. 在联系人列表中选择聊天对象
2. 在消息输入框中输入内容
3. 点击发送按钮或按 Enter 键发送
4. 支持表情、文件等附件

#### 4. 管理联系人
- **添加好友**：通过用户名或邮箱搜索并添加
- **创建群组**：选择多个联系人创建群组
- **管理好友**：查看好友列表，进行分组管理

### 高级功能

#### 加密聊天
- **端到端加密**：消息在发送前加密，接收后解密
- **阅后即焚**：设置消息阅读后自动删除
- **安全密钥**：使用强加密算法保护通信

#### 服务器配置
- **服务器发现**：自动发现局域网内的HalloChat服务器
- **手动配置**：手动添加服务器地址和端口
- **历史记录**：保存使用过的服务器地址

#### 多语言支持
- **语言切换**：在设置中选择界面语言
- **实时翻译**：支持4种语言的实时切换
- **本地化**：完整的界面和消息本地化

## 开发指南

### 项目结构

```
HalloChat/
├── client/                 # 客户端代码（React + Electron）
│   ├── public/             # 公共资源
│   │   ├── HalloChat.ico   # 应用图标
│   │   ├── electron.js     # Electron主进程
│   │   └── index.html     # HTML入口
│   ├── src/                # 前端源码
│   │   ├── components/     # React组件
│   │   │   ├── Login.js    # 登录组件
│   │   │   ├── MainWindow.js # 主窗口
│   │   │   ├── ChatWindow.js # 聊天窗口
│   │   │   ├── ContactList.js # 联系人列表
│   │   │   └── Settings.js  # 设置组件
│   │   ├── contexts/       # React Context
│   │   │   └── AuthContext.js # 认证上下文
│   │   ├── i18n/          # 国际化
│   │   │   ├── locales/    # 语言文件
│   │   │   └── config.js   # i18n配置
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务服务
│   │   │   ├── authService.js    # 认证服务
│   │   │   ├── chatService.js    # 聊天服务
│   │   │   ├── contactService.js # 联系人服务
│   │   │   └── encryptedChatService.js # 加密聊天服务
│   │   ├── styles/         # 样式文件
│   │   ├── App.js         # 应用入口
│   │   └── index.js       # React渲染入口
│   ├── .babelrc            # Babel配置
│   ├── craco.config.js     # CRACO配置
│   ├── electron-main.js     # Electron主进程
│   └── package.json        # 前端依赖配置
├── server/                 # 服务端代码（Node.js + Express）
│   ├── src/                # 后端源码
│   │   ├── config/         # 配置文件
│   │   ├── models/         # 数据模型
│   │   │   ├── user.model.js    # 用户模型
│   │   │   ├── message.model.js # 消息模型
│   │   │   ├── friend.model.js  # 好友模型
│   │   │   ├── group.model.js   # 群组模型
│   │   │   └── channel.model.js # 频道模型
│   │   ├── routes/         # API路由
│   │   │   ├── auth.js        # 认证路由
│   │   │   ├── users.js       # 用户路由
│   │   │   ├── messages.js    # 消息路由
│   │   │   ├── friends.js     # 好友路由
│   │   │   ├── groups.js      # 群组路由
│   │   │   └── channels.js    # 频道路由
│   │   ├── services/       # 业务服务
│   │   │   ├── auth.service.js # 认证服务
│   │   │   └── websocket.js   # WebSocket服务
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   ├── app.js          # Express应用
│   │   └── index.js        # 服务入口
│   ├── test/               # 测试代码
│   ├── manager/            # 服务管理器
│   │   └── server_manager.py # Python服务管理器
│   ├── .env.example        # 环境变量模板
│   └── package.json        # 后端依赖配置
└── compass/               # 项目文档
    ├── todolist.md         # 任务清单
    ├── HalloChat-based.md  # 使用指南（本文件）
    └── HalloChat-dev.md   # 开发规划
```

### 核心组件

#### 1. 认证系统（Auth）

**功能**：处理用户登录、注册、登出等认证相关功能

**主要组件**：
- `authService.js`：客户端认证服务
- `auth.service.js`：服务端认证服务
- `AuthContext.js`：React认证上下文
- `auth.js`：认证API路由

**使用示例**：
```javascript
// 客户端登录
import authService from './services/authService';

const user = await authService.login(username, password);
// 用户信息会自动存储到localStorage
```

#### 2. 聊天系统（Chat）

**功能**：处理实时消息发送和接收

**主要组件**：
- `chatService.js`：客户端聊天服务
- `ChatWindow.js`：聊天界面组件
- `websocket.js`：服务端WebSocket处理
- `messages.js`：消息API路由

**使用示例**：
```javascript
// 发送消息
import chatService from './services/chatService';

chatService.sendMessage(receiverId, content);
```

#### 3. 联系人系统（Contact）

**功能**：管理好友和群组

**主要组件**：
- `contactService.js`：客户端联系人服务
- `ContactList.js`：联系人列表组件
- `friends.js`：好友API路由
- `groups.js`：群组API路由

**使用示例**：
```javascript
// 获取好友列表
import contactService from './services/contactService';

const friends = await contactService.getFriends();
```

### 开发流程

#### 1. 环境搭建
1. 安装 **Node.js** 16.x+
2. 安装 **MongoDB** 5.0+
3. 安装 **Redis** 6.0+
4. 克隆代码仓库
5. 安装客户端和服务端依赖

#### 2. 添加新功能

**步骤 1：定义需求**
- 明确功能需求和技术实现方案
- 评估安全性和性能影响

**步骤 2：实现核心逻辑**
- 在对应模块中添加代码
- 遵循项目的编码规范
- 实现前后端接口

**步骤 3：编写测试**
- 添加单元测试
- 添加集成测试

**步骤 4：构建验证**
- 确保代码编译通过
- 运行测试确保功能正常

### 常见问题与解决方案

#### 1. Electron启动问题

**症状**：Electron应用无法启动或异常退出

**解决方案**：
- 检查electron-main.js配置
- 验证React开发服务器和Electron通信
- 检查安全策略设置
- 查看控制台日志获取详细错误信息

#### 2. 数据库连接失败

**症状**：无法连接到MongoDB数据库

**解决方案**：
- 检查MongoDB服务是否运行
- 验证.env文件中的连接字符串
- 确认网络连接和防火墙设置
- 查看数据库日志获取详细错误信息

#### 3. WebSocket连接问题

**症状**：实时消息无法接收

**解决方案**：
- 检查Socket.IO服务是否正常运行
- 验证CORS配置
- 确认JWT token有效性
- 检查网络连接和防火墙设置

#### 4. 消息同步问题

**症状**：消息发送或接收延迟

**解决方案**：
- 检查Redis连接状态
- 验证WebSocket连接稳定性
- 优化消息队列处理
- 检查网络延迟和带宽

## 技术栈

| 类别 | 技术/库 | 版本 | 用途 |
|------|---------|------|------|
| 前端框架 | React | 18.x | 用户界面 |
| 桌面框架 | Electron | 最新 | 桌面应用 |
| 后端框架 | Express | 4.x | Web服务器 |
| 数据库 | MongoDB | 5.0+ | 数据存储 |
| 缓存 | Redis | 6.0+ | 会话和缓存 |
| 实时通信 | Socket.IO | 4.x | WebSocket |
| 认证 | JWT | - | 用户认证 |
| 加密 | CryptoJS | - | 数据加密 |
| 国际化 | i18next | - | 多语言支持 |
| UI组件 | Ant Design | 5.x | React组件库 |

## 性能优化

### 1. 前端优化
- 使用React.memo减少不必要的重渲染
- 实现虚拟列表处理大量消息
- 优化图片加载和缓存
- 使用代码分割减少初始加载时间

### 2. 后端优化
- 使用Redis缓存热点数据
- 实现数据库查询优化
- 使用连接池管理数据库连接
- 实现消息队列处理高并发

### 3. 网络优化
- 使用WebSocket保持长连接
- 实现消息压缩减少传输数据量
- 优化心跳机制减少连接开销
- 实现离线消息缓存

## 安全最佳实践

### 1. 数据安全
- 使用JWT进行用户认证
- 密码使用bcrypt加密存储
- 敏感数据使用HTTPS传输
- 实现输入验证防止注入攻击

### 2. 通信安全
- 使用WebSocket + SSL加密通信
- 实现消息端到端加密
- 使用CORS限制跨域访问
- 实现速率限制防止DDoS攻击

### 3. 代码安全
- 遵循安全编码规范
- 定期进行安全审计
- 使用静态分析工具检查漏洞
- 及时更新依赖库版本

## 部署与分发

### 构建发布版本

```bash
# 构建客户端
cd client
npm run build
electron-builder

# 构建服务端
cd ../server
npm run build
```

### Docker部署

```bash
# 构建Docker镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 安装程序创建
1. 使用electron-builder创建安装包
2. 配置安装选项和快捷方式
3. 添加自动更新功能

## 贡献指南

### 提交代码
1. **Fork** 仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

### 代码规范
- 遵循 **React 编码规范**
- 遵循 **Node.js 编码规范**
- 使用 **ESLint** 检查代码
- 编写清晰的注释

### 报告问题
- 在 GitHub Issues 中提交详细的问题描述
- 包含复现步骤和错误信息
- 提供系统环境信息

## 故障排除

### 日志查看

服务端日志：
```bash
cd server
tail -f logs/app.log
```

客户端日志：
```bash
# 在Electron开发者工具中查看Console
```

### 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|----------|------|----------|
| 0x001 | 数据库连接失败 | 检查MongoDB服务状态 |
| 0x002 | Redis连接失败 | 检查Redis服务状态 |
| 0x003 | 认证失败 | 检查用户名和密码 |
| 0x004 | WebSocket连接失败 | 检查网络和防火墙设置 |

## 联系与支持

### 联系方式
- **GitHub**：[https://github.com/Ink-dark/HalloChat](https://github.com/Ink-dark/HalloChat)
- **Email**：moranqidarkseven@hallochat.cn

### 支持渠道
- GitHub Issues：提交 bug 报告和功能请求
- 讨论区：参与项目讨论和问题解答

## 版本历史

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| v0.2.1 | 2025-11-08 | 添加服务器控制台，客户端优化 |
| v0.2.0 | 2025-09-30 | 登录功能修复，法律声明窗口优化 |
| v0.1.5 | 2025-08-19 | 登录功能修复，法律声明窗口优化 |
| v0.1.4 | 2025-08-02 | 登录功能修复，版本控制优化 |
| v0.1.3 | 2025-07-25 | 添加AuthContext，服务器地址配置 |

---

**HalloChat** - 安全、高效的实时通讯平台

*本指南会定期更新，以反映最新的功能和最佳实践。*