// 简单的邮箱验证规则测试脚本
const express = require('express');
const { body, validationResult, buildCheckFunction } = require('express-validator');
const { USER } = require('../utils/constants');

// 创建一个简单的Express应用实例
const app = express();
app.use(express.json());

// 模拟请求对象
function createMockRequest(data) {
  return {
    body: data,
    app: {
      get: () => null
    }
  };
}

// 复制auth.js中的验证规则
const emailValidationRules = [
  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage(USER.EMAIL.MESSAGE)
    .normalizeEmail()
];

// 运行验证规则的函数
async function runValidation(rules, data) {
  const req = createMockRequest(data);
  
  // 执行所有验证规则
  for (const rule of rules) {
    await rule.run(req);
  }
  
  // 获取验证结果
  const errors = validationResult(req);
  return {
    hasErrors: !errors.isEmpty(),
    errors: errors.array()
  };
}

// 测试不同的邮箱格式
async function testEmailValidation() {
  const testCases = [
    { data: { email: '' }, description: '空邮箱' },
    { data: { email: 'invalid-email' }, description: '缺少@符号' },
    { data: { email: 'user@' }, description: '缺少域名' },
    { data: { email: '@example.com' }, description: '缺少用户名部分' },
    { data: { email: 'user.name+tag@example.co.uk' }, description: '有效的邮箱格式' }
  ];
  
  console.log('邮箱验证测试结果：');
  
  for (const testCase of testCases) {
    const result = await runValidation(emailValidationRules, testCase.data);
    
    console.log(`\n${testCase.description}:`);
    console.log(`- 有错误: ${result.hasErrors}`);
    if (result.hasErrors) {
      console.log('- 错误信息:');
      result.errors.forEach(err => {
        console.log(`  - param: ${err.param}, msg: ${err.msg}`);
      });
    }
  }
}

// 运行测试
testEmailValidation().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});