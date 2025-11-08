// 简单的密码验证规则测试脚本

const { body, validationResult } = require('express-validator');
const { USER } = require('../utils/constants');

// 模拟请求对象
function createMockRequest(bodyData) {
  return { body: bodyData };
}

// 测试密码验证函数
async function testPasswordValidation(password) {
  const mockReq = createMockRequest({ password });
  
  // 提取密码验证规则
  const passwordValidator = body('password')
    .isLength({ min: USER.PASSWORD.MIN_LENGTH, max: USER.PASSWORD.MAX_LENGTH })
    .withMessage(`密码长度必须在${USER.PASSWORD.MIN_LENGTH}-${USER.PASSWORD.MAX_LENGTH}个字符之间`)
    .matches(USER.PASSWORD.PATTERN)
    .withMessage(USER.PASSWORD.MESSAGE);
  
  // 执行验证
  await passwordValidator.run(mockReq);
  
  // 获取验证结果
  const errors = validationResult(mockReq);
  
  return {
    isValid: errors.isEmpty(),
    errors: errors.array(),
    password: password,
    pattern: USER.PASSWORD.PATTERN.toString()
  };
}

// 运行各种密码测试用例
async function runPasswordTests() {
  console.log('开始测试密码验证规则...');
  console.log('密码正则表达式:', USER.PASSWORD.PATTERN.toString());
  console.log('最小长度:', USER.PASSWORD.MIN_LENGTH);
  console.log('最大长度:', USER.PASSWORD.MAX_LENGTH);
  console.log('---------------------------');
  
  const testCases = [
    { name: '有效的密码 - 包含字母、数字和允许的特殊字符', password: 'Valid123!' },
    { name: '有效的密码 - 包含多种允许的特殊字符', password: 'Abc123!@$' },
    { name: '无效的密码 - 太短', password: 'Ab1!' },
    { name: '无效的密码 - 太长', password: 'A'.repeat(USER.PASSWORD.MAX_LENGTH + 1) },
    { name: '无效的密码 - 缺少字母', password: '123456!' },
    { name: '无效的密码 - 缺少数字', password: 'Password!' },
    { name: '无效的密码 - 缺少特殊字符', password: 'Password123' },
    { name: '无效的密码 - 包含不允许的特殊字符 #', password: 'Abc123!#' },
    { name: '无效的密码 - 包含不允许的特殊字符 ^', password: 'Abc123!^' },
  ];
  
  for (const testCase of testCases) {
    try {
      const result = await testPasswordValidation(testCase.password);
      console.log(`测试: ${testCase.name}`);
      console.log(`密码: "${testCase.password}"`);
      console.log(`验证结果: ${result.isValid ? '通过' : '失败'}`);
      if (!result.isValid) {
        console.log('错误信息:', result.errors.map(e => e.msg).join(', '));
      }
      console.log('---------------------------');
    } catch (error) {
      console.error(`测试 "${testCase.name}" 发生错误:`, error);
      console.log('---------------------------');
    }
  }
  
  console.log('密码验证测试完成!');
}

// 运行测试
runPasswordTests().catch(err => {
  console.error('测试执行失败:', err);
});