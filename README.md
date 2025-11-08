# HalloChat

HalloChat 是一款实时聊天应用，客户端版本：v0.2.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**注意：** 
1. 本项目尚处于测试期，存在多个已知问题和功能缺失，且不定期更新，如果有发现问题请及时提交issues或发邮件联系我们，感谢支持。
2. 近期更新了企业邮箱地址，新地址为：dev@hallochat.cn，请使用新地址进行联系。
3. 近期因个人原因可能导致更新不定时，敬请谅解。
4. 由于企业微信认证原因，需等到2027年本人才能进行认证（？），故协作者分配的企业微信会显示为“未认证”状态。（后续可能因为企业微信认证而收取费用，该部分年审认证费可能源自项目经费/捐助）
5. 我们目前尚未进行任何所谓“HalloChat商业付费版本”提供，如果有发现软件倒卖，欢迎举报。
6. 项目组急缺协作者，此项目虽然为业余制作，却已经耗费了我大量的业余时间。作为一名高二的学生，我能做到的只有每周六下午-周日上午更新，若有能力贡献代码或提供技术支持，欢迎联系我们。
7. 我们欢迎赞助，赞助我们可以让我们走得更远。
## 📄 许可证
本项目采用 [MIT License](LICENSE) 开源许可证，允许自由使用、修改和分发。
我们鼓励但不强制要求您在使用本项目的部分或全部代码时保留原作者的版权声明和许可证信息。
例如：
```
// 本项目基于 HalloChat 客户端 vx.x.x 开发
// 版权所有 © 2025 Ink-dark（墨染柒DarkSeven）/Hallochat-dev Team
// 遵循 MIT 开源许可证
```
## 联系我们
- 项目仓库：[HalloChat](https://github.com/Ink-dark/HalloChat)[Gitee](https://gitee.com/moranqidarkseven/HalloChat)
- 问题反馈：[Issues](https://github.com/Ink-dark/HalloChat/issues)[Gitee](https://gitee.com/moranqidarkseven/HalloChat/issues)
- 邮件联系：
  1. dev@hallochat.cn（项目开发团队）
  2. moranqidarkseven@hallochat.cn（项目开发者Ink-dark/墨染柒DarkSeven）
  3. 企业微信：（暂未上线）

## 项目概述
即时通讯软件，包含以下功能模块：
1. 基础单聊功能（文字/语音/图片）
2. 加密聊天（端到端加密+阅后即焚）
3. 多人群组（Telegram风格）
4. 频道功能（类似Telegram/QQ频道）

## 版本信息
- 客户端版本：v0.2.0（测试版）
- 发布状态：测试中

### 开发状态
#### 已部分实现的功能
- 基础单聊（文字消息）
- 用户认证系统（登录/注册）
- 服务端基础框架（Node.js + Socket.IO）
- 日志系统集成（Winston结构化日志）
- 前后端输入校验（用户名/密码规则）
- 法律声明窗口交互优化

#### 规划中功能
- 语音/图片消息发送
- 端到端加密聊天
- 多人群组（Telegram风格）
- 频道功能（类似Telegram/QQ频道）
- 阅后即焚功能

## 项目启动
1. **先启动服务端**：
   ```bash
   cd server
   npm start
   ```

2. **再启动客户端**：
   ```bash
   cd client
   npm start
   ```
3. 如果遇到electron安装问题，请尝试使用cnpm安装（见下文）：
   ```bash
   cnpm install -g electron
   ```
   当然，如果您是使用者，我们后续会推出预编译的客户端版本，无需使用命令行。


## 版本历史
（暂未发布任何正式版本）

## 开发时间线
（正在开发中，开始时间为2025-05-01）

## 目录结构
```
HalloChat/
├── client/                 # 客户端代码（React/Electron）
│   ├── public/             # 公共资源
│   ├── src/                # 前端源码
│   │   ├── components/     # React组件
│   │   │   ├── Login.js    # 登录组件
│   │   │   ├── MainWindow.js # 主窗口组件
│   │   │   └── ...
│   │   ├── App.js          # 应用入口组件
│   │   ├── index.js        # React渲染入口
│   │   └── ...
│   ├── .babelrc            # Babel配置
│   ├── .npmrc              # npm配置（国内镜像加速用，如果你不处于国内环境可以选择删除）
│   ├── config-overrides.js # 配置覆盖
│   ├── craco.config.js     # CRACO配置
│   ├── electron-main.js    # Electron主进程
│   ├── main.js             # 应用主入口
│   └── package.json        # 前端依赖配置
├── server/                 # 服务端代码（Node.js）
│   ├── config/             # 配置文件
│   ├── models/             # 数据模型
│   ├── src/                # 后端源码
│   │   ├── index.js        # 服务启动入口
│   │   └── ...
│   ├── test/               # 测试代码
│   ├── .env.example        # 环境变量配置模板
│   └── package.json        # 后端依赖配置
├── HalloChat.ico           # 应用图标
├── .gitignore              # Git忽略规则
└── README.md               # 项目说明
```

## 主要功能  
✔ 安全加密通信  
✔ 服务器自动发现与历史记录  
✔ 跨平台客户端支持（基于Electron）

## 技术栈  
- 前端：React + Electron  
- 后端：Node.js + Express  
- 数据库：MongoDB/EloqDoc

## 环境配置
需要在服务端创建`.env`文件，可参考`.env.example`文件。


## 特别提醒：Electron安装问题
若在安装Electron过程中遇到失败情况，请使用cnpm进行安装。具体操作步骤如下：

1. 首先安装cnpm：
   ```bash
   npm install -g cnpm --registry=https://registry.npmmirror.com
   ```

2. 然后使用cnpm安装Electron：
   ```bash
   cnpm install -g electron
   ```

> **注意**：上述所有命令需在管理员模式下的PowerShell中执行，否则可能会安装失败。

## 加入我们
如果你对HalloChat项目感兴趣，欢迎加入我们的开发团队。
当你获得内测资格/进入团队后，你会获得：
- 项目代码仓库的访问权限
- 与项目开发团队的直接沟通渠道
- 参与项目的技术讨论和决策
- 项目进度的及时更新通知
- 项目相关的技术支持和帮助
- 项目团队企业微信（要求提供手机号，用于加入项目团队）

当你做好了以上准备，你可以通过以下方式联系我们：
  moranqidarkseven@hallochat.cn（项目开发者Ink-dark/墨染柒DarkSeven）



