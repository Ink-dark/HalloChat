/**
 * 数据库迁移脚本：为现有用户添加 UID 字段
 * 
 * 运行方式：
 * node scripts/migrate-add-uid.js
 */

const mongoose = require('mongoose');
const User = require('../src/models/user.model');

// 从环境变量或配置文件读取数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hallochat';

async function migrateUsers() {
  try {
    console.log('[迁移] 连接数据库...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[迁移] 数据库连接成功！');

    // 获取所有没有 UID 的用户
    const usersWithoutUID = await User.find({ uid: { $exists: false } });
    console.log(`[迁移] 找到 ${usersWithoutUID.length} 个需要迁移的用户`);

    if (usersWithoutUID.length === 0) {
      console.log('[迁移] 所有用户已经有 UID，无需迁移');
      return;
    }

    // 检查是否存在管理员用户（通过 role 或 username 判断）
    const adminUser = usersWithoutUID.find(
      user => user.role === 'admin' || user.username.toLowerCase() === 'admin'
    );

    let successCount = 0;
    let failCount = 0;

    // 为管理员用户设置特殊 UID
    if (adminUser) {
      try {
        adminUser.uid = 'ADMIN';
        await adminUser.save();
        console.log(`[迁移] ✅ 管理员用户 ${adminUser.username} 已设置 UID: ADMIN`);
        successCount++;
      } catch (error) {
        console.error(`[迁移] ❌ 管理员用户 ${adminUser.username} UID 设置失败:`, error.message);
        failCount++;
      }
    }

    // 为其他用户生成 UID
    for (const user of usersWithoutUID) {
      if (user.uid) continue; // 跳过已经设置过的（如管理员）

      try {
        const uid = await User.generateUniqueUID();
        user.uid = uid;
        await user.save();
        console.log(`[迁移] ✅ 用户 ${user.username} 已生成 UID: ${uid}`);
        successCount++;
      } catch (error) {
        console.error(`[迁移] ❌ 用户 ${user.username} UID 生成失败:`, error.message);
        failCount++;
      }
    }

    console.log('\n[迁移] ==================== 迁移完成 ====================');
    console.log(`[迁移] 成功: ${successCount} 个用户`);
    console.log(`[迁移] 失败: ${failCount} 个用户`);
    console.log('[迁移] ===================================================\n');

  } catch (error) {
    console.error('[迁移] 发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[迁移] 数据库连接已关闭');
  }
}

// 运行迁移
migrateUsers()
  .then(() => {
    console.log('[迁移] 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('[迁移] 脚本执行失败:', error);
    process.exit(1);
  });
