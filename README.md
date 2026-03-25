# HalloChat

HalloChat 是一款实时聊天应用，客户端版本：v0.2.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 新项目友链
**我们正在开发以Dear Imgui + C++的HalloChat客户端，使用GNU-LGPL许可证！**
新仓库链接：[HalloChat-DearImgui](https://github.com/Ink-dark/HalloChat-cpp-on-imgui)

## 特别须知
1. 本项目尚处于测试版本，存在已知问题和功能缺失，且不定期更新，如果有发现问题请及时提交issues联系我，感谢支持。
2. 本项目使用GitHub Actions 进行企业微信机器人通知（仅Push事件），用于通知项目维护者有新的代码提交。
   - 企业微信机器人Webhook URL：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${{ secrets.WECHAT_QIYE_WEBHOOK_URL }}`
   - 请将上述URL添加到您的项目的GitHub Actions Secrets 中，名称为 `WECHAT_QIYE_WEBHOOK_URL`。

## 📄 许可证
本项目采用 [MIT License](LICENSE) 开源许可证，允许自由使用、修改和分发。详细信息请查看 [LICENSE](LICENSE) 文件。
我们鼓励但不强制要求您在使用本项目的部分或全部代码时保留原作者的版权声明和许可证信息。
例如：
```
// 本项目基于 HalloChat 客户端 v0.2.0 开发
// 版权所有 © 2025 Ink-dark（墨染柒DarkSeven）
// 遵循 MIT 开源许可证
```
## 项目开发者
### 墨染柒DarkSeven
- 邮箱：moranqidarkseven@hallochat.cn
- 个人博客：[墨染柒的个人博客-GitHub Pages（可能停止更新）](Ink-dark.github.io)

### SANYOU （LUCA.NEX)
- 邮箱：you.san1@icloud.com
- 个人网站:[lucanex.top](https://www.lucanex.top/)

## 联系我们
- 项目仓库：[HalloChat](https://github.com/Ink-dark/HalloChat)
- 问题反馈：[Issues](https://github.com/Ink-dark/HalloChat/issues)
- 邮件联系：
  1. dev@hallochat.cn（项目开发团队）
  2. moranqidarkseven@hallochat.cn（项目开发者Ink-dark/墨染柒DarkSeven）
  3. 企业微信：（正在配置中）

## 项目概述
即时通讯软件，包含以下功能模块：
1. 基础单聊功能（文字/语音/图片）
2. 加密聊天（端到端加密+阅后即焚）
3. 多人群组（Telegram风格）
4. 频道功能（类似Telegram/QQ频道）

## 版本信息
- 发布版本：v0.2.1（测试版）
- 发布状态：测试中

### 开发状态
#### 已发布功能
- 基础单聊（文字消息）
- 用户认证系统（登录/注册）
- 服务端基础框架（Node.js + Socket.IO）
- 日志系统集成（Winston结构化日志）
- 前后端输入校验（用户名/密码规则）
- 法律声明窗口交互优化

#### 测试中功能（优先实现）
暂无

#### 规划中功能
- 语音/图片消息发送
- 端到端加密聊天
- 多人群组（Telegram风格）
- 频道功能（类似Telegram/QQ频道）
- 阅后即焚功能

## 服务器控制台说明
- 使用Python制作
- 目前只有Windows适配
- 功能：启动/关闭服务器 下载/启动/关闭MongoDB 查看端口 IP

## 项目启动
1. **先启动服务端**：
  windows:
   直接双击打包好的server_manager.py
   或者使用python环境进行启动
   ```bash
   cd "服务端根目录"
   python server_manager.py
   ```
   linux:
    ```bash
   cd "服务端根目录"
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
  ### v0.2.1（2025-11-08）「小型更新」
  - **主要更新服务端**：
    - 增加由Python制作的服务器控制台（半成品）
      - 实现启动/关闭服务器功能
      - 实现下载/启动/关闭MongoDB功能
      - 支持查看端口和IP信息

  
  ### v0.2.0（2025-09-30）
  - **登录功能修复**：
    - 修复authService.js文件中getCurrentUser方法实现问题
    - 移除authService.js文件中重复的axios导入语句
    - 修复authService.js文件中getCurrentUser方法返回值问题
  - **法律声明窗口优化**：
    - 调整展示流程：法律声明窗口在用户点击"开始使用"按钮后显示，而非应用启动时自动弹出
  - **服务器地址配置**：
    - 新增服务器地址配置功能，用户可在登录前选择连接的服务器实例
  - **跨域请求支持**：
    - 增加CORS支持以解决跨域问题，允许客户端与不同域名的服务器进行通信
  - **错误处理改进**：
    - 优化登录/注册表单的错误提示逻辑，提供更友好的用户反馈
    - 增强跨域请求的错误处理，防止因跨域问题导致的应用崩溃


  ### v0.1.5（2025-08-19）
- **登录功能修复**：
  - 修复authService.js文件中getCurrentUser方法实现问题
  - 移除authService.js文件中重复的axios导入语句
  - 修复authService.js文件中getCurrentUser方法返回值问题
- **法律声明窗口优化**：
  - 调整展示流程：法律声明窗口在用户点击"开始使用"按钮后显示，而非应用启动时自动弹出
  - 状态管理改进：实现法律声明仅需用户同意一次的逻辑
  - 交互流程优化：用户同意法律声明后自动显示服务器选择界面
  - 按钮逻辑完善：恢复"开始使用"按钮的条件检查，已同意用户直接进入服务器选择界面

### v0.1.4（2025-08-02）
- **登录功能修复**：
  - 替换客户端app.js文件中handleLogin函数的硬编码用户对象模拟登录，实现真实JWT登录调用
  - 修复authService.js文件缺少axios模块引入的问题
  - 解决authService.js文件中getCurrentUser方法实现问题
  - 移除authService.js文件中重复的axios导入语句
- **版本控制优化**：
  - 扩展.gitignore文件，添加客户端和服务器的构建产物、依赖目录、日志文件、Redis相关文件等忽略规则
  - 确保仓库清洁，避免提交不必要的文件

### v0.1.3（2025-07-25）
- 由于不可抗力因素，项目继续以Electron架构开发
- **添加AuthContext全局状态管理**：
  - 部分实现登录/注册表单及逻辑
  - 增加服务器地址配置功能
  - 添加CORS支持以解决跨域问题
- **优化错误处理和用户反馈**：
  - 改进登录/注册表单的错误提示逻辑
  - 增强跨域请求的错误处理

### v0.1.2（2025-06-27）
- 项目停止维护，已迁移至Qt框架继续开发，新仓库地址：[GitHub](https://github.com/Ink-dark/HalloChat-Qt)、[Gitee](https://gitee.com/moranqidarkseven/HalloChat-Qt)（两仓库同步更新）

### v0.1.1（2025-06-21）
- **前端修复**：解决App.js中多处TypeScript错误（TS1005括号不匹配、TS1308异步函数缺失等）
- **功能优化**：实现登录/注册模态框切换逻辑，动态更新表单标题与交互链接
- **文档完善**：合并README.md中重复的「开发进度」与「目录结构」章节，优化文档结构

### v0.1.0（2025-06-15）
- **用户认证**：实现完整登录流程（服务端用户查询/密码验证+客户端表单处理/Token存储）
- **安全配置**：添加JWT密钥管理（.env文件）及.gitignore忽略规则
- **版本控制**：修复Git合并冲突并优化提交流程

### v0.0.2（2025-06-14）
- **服务端授权**：服务端停止授权至GitHub

### v0.0.1（2025-05-25）
- **日志系统**：服务端集成Winston结构化日志，支持多级别记录与文件存储
- **输入校验**：
  - 服务端：新增密码复杂度校验（8-16位，含字母/数字/特殊字符）
  - 客户端：重建`Login.js`并添加前端实时校验（用户名3-20位，支持中文/字母/数字/下划线；密码8-20位，含字母/数字/特殊字符）
- **文件修复**：恢复丢失的`client/src/Login.js`文件并完善功能

## 开发时间线
- 2025-05-01：启动项目，完成技术选型（React/Electron + Node.js + Socket.IO）
- 2025-05-10：实现用户认证系统（登录/注册接口）
- 2025-05-20：完成基础单聊（文字消息）功能联调
- 2025-05-23：服务端日志系统集成
- 2025-05-24：前后端输入校验功能开发
- 2025-06-14：服务端停止授权至GitHub
- 2025-06-15：发布v0.1.0，完善用户认证系统和安全配置
- 2025-06-21：发布v0.1.1，修复前端错误，优化登录/注册交互
- 2025-06-27：项目停止维护，迁移至Qt框架
- 2025-07-25：项目继续使用Electron架构开发，发布v0.1.3
- 2025-08-02：发布v0.1.4，修复登录功能和优化版本控制
- 2025-08-19：发布v0.1.5，优化法律声明窗口交互
- 2025-09-30：发布v0.2.0，见上
- 2025-11-08：发布0.2.1
  1. 增加Windows服务器的GUI控制台（Linux版本正在开发中）
  2. 对客户端进行优化

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
│   ├── .npmrc              # NPM配置
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
│   ├── manager/            # 服务端管理工具
│   ├── server_manager.py   # 服务器控制台（Python）
│   ├── .env.example        # 环境变量配置模板
│   └── package.json        # 后端依赖配置
├── HalloChat.ico           # 应用图标
├── .gitignore              # Git忽略规则
└── README.md               # 项目说明
```

## 主要功能  
✔ 安全加密通信  
✔ 服务器自动发现与历史记录  
✔ 跨平台客户端支持

## 技术栈  
- 前端：React + Electron  
- 后端：Node.js + Express  
- 数据库：MongoDB

## 环境配置
需要在服务端创建`.env`文件，可参考`.env.example`文件：
```bash
CLIENT_PORT=3000
SERVER_PORT=7932

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/hallo-chat

# 安全配置
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## 测试配置
1. **运行客户端测试**：
   ```bash
   cd client
   npm test
   ```

2. **运行服务端测试**：
   ```bash
   cd server
   npm test
   ```

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

> **注意**：上述所有命令需在管理员模式下的PowerShell中执行。

## 加入我们

注意：因企业微信企业账号封禁，我们已改用飞书进行协作。飞书的企业名称为“比特火炬”。

如果你对HalloChat项目感兴趣，欢迎加入我们的开发团队。你可以通过以下方式联系我们，我们会在一定时间内回复，请在邮件中包含以下信息：
- 你的姓名（可以不要求真实姓名，昵称即可）
- 你的邮箱（用于回复和项目合作）
- 你对HalloChat项目的兴趣和建议
当你获得内测资格/进入团队后，你会获得：
- 项目代码仓库的访问权限
- 与项目开发团队的直接沟通渠道
- 参与项目的技术讨论和决策
- 项目进度的及时更新通知
- 项目相关的技术支持和帮助
- 项目团队飞书（要求提供手机号，用于加入项目团队）

当你做好了以上准备，你可以通过以下方式联系我们：
  1. dev@hallochat.cn（项目开发团队）
  2. moranqidarkseven@hallochoat.cn（项目开发者Ink-dark/墨染柒DarkSeven）

再次感谢每一个为项目做出贡献的开发者！

