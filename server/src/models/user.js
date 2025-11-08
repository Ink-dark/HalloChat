// 这个文件是为了保持兼容性而存在的
// 实际的用户模型定义在 user.model.js 中
const { User, registerUser, loginUser } = require('./user.model');

// 重新导出所有内容，确保依赖此文件的代码继续工作
module.exports = User;
module.exports.User = User;
module.exports.registerUser = registerUser;
module.exports.loginUser = loginUser;