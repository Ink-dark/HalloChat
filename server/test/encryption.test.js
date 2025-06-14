const { layeredEncrypt, sessionKeyRotator } = require('../src/middleware/encryption');
const { expect } = require('chai');

describe('分层加密模块测试', () => {
  before(async () => {
    await sessionKeyRotator.init(); // 初始化密钥管理器
  });

  it('应该正确加密并返回包含keyTag的对象', async () => {
    const testMsg = 'Hello HalloChat!';
    const encrypted = await layeredEncrypt(testMsg);
    
    expect(encrypted).to.have.property('payload');
    expect(encrypted).to.have.property('keyTag');
    expect(encrypted.payload).to.not.equal(testMsg); // 确保内容已加密
  });

  it('密钥轮换后应生成新的keyTag', async () => {
    const initialKey = await sessionKeyRotator.getCurrentKey();
    await sessionKeyRotator.rotateKey(); // 手动触发轮换
    const newKey = await sessionKeyRotator.getCurrentKey();
    
    expect(newKey.metadata.keyId).to.not.equal(initialKey.metadata.keyId);
  });
});