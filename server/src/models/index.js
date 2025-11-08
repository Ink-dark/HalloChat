const mongoose = require('mongoose');

// 导入所有模型
const User = require('./user.model');
const Message = require('./message.model');
const Group = require('./group.model');
const Channel = require('./channel.model');
const File = require('./file.model');

// 模型映射
const models = {
  User,
  Message,
  Group,
  Channel,
  File
};

// 初始化模型
const initializeModels = async () => {
  try {
    // 确保所有模型都已注册
    const registeredModels = Object.keys(mongoose.models);
    console.log('已注册的模型:', registeredModels);
    
    // 验证模型索引
    for (const [name, model] of Object.entries(models)) {
      try {
        await model.createIndexes();
        console.log(`✅ ${name} 模型索引创建成功`);
      } catch (error) {
        console.error(`❌ ${name} 模型索引创建失败:`, error.message);
      }
    }
    
    console.log('✅ 所有模型初始化完成');
  } catch (error) {
    console.error('❌ 模型初始化失败:', error);
    throw error;
  }
};

// 导出所有模型和工具函数
module.exports = {
  ...models,
  initializeModels,
  
  // 获取所有模型名称
  getModelNames: () => Object.keys(models),
  
  // 获取模型实例
  getModel: (name) => models[name] || mongoose.models[name],
  
  // 清理数据库（测试用）
  cleanupDatabase: async () => {
    if (process.env.NODE_ENV === 'test') {
      for (const [name, model] of Object.entries(models)) {
        await model.deleteMany({});
        console.log(`🧹 清理了 ${name} 集合`);
      }
    }
  },
  
  // 验证模型关联
  validateAssociations: async () => {
    const validations = [
      { model: 'Message', field: 'sender', ref: 'User' },
      { model: 'Message', field: 'receiver', ref: 'User' },
      { model: 'Message', field: 'group', ref: 'Group' },
      { model: 'Message', field: 'channel', ref: 'Channel' },
      { model: 'Message', field: 'file', ref: 'File' },
      { model: 'Group', field: 'creator', ref: 'User' },
      { model: 'Group', field: 'members.user', ref: 'User' },
      { model: 'Group', field: 'channels', ref: 'Channel' },
      { model: 'Group', field: 'lastMessage', ref: 'Message' },
      { model: 'Channel', field: 'group', ref: 'Group' },
      { model: 'Channel', field: 'creator', ref: 'User' },
      { model: 'Channel', field: 'lastMessage', ref: 'Message' },
      { model: 'File', field: 'owner', ref: 'User' },
      { model: 'File', field: 'message', ref: 'Message' },
      { model: 'File', field: 'group', ref: 'Group' },
      { model: 'File', field: 'channel', ref: 'Channel' }
    ];

    console.log('🔍 验证模型关联...');
    
    for (const validation of validations) {
      try {
        const Model = mongoose.models[validation.model];
        if (Model) {
          const count = await Model.countDocuments({});
          console.log(`${validation.model}: ${count} 条记录`);
        }
      } catch (error) {
        console.error(`验证 ${validation.model}.${validation.field} 失败:`, error.message);
      }
    }
  }
};