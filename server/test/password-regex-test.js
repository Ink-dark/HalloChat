const { USER } = require('../utils/constants');

console.log('=== 密码正则表达式详细测试 ===');
console.log('正则表达式:', USER.PASSWORD.PATTERN.toString());
console.log('最小长度:', USER.PASSWORD.MIN_LENGTH);
console.log('最大长度:', USER.PASSWORD.MAX_LENGTH);
console.log('错误信息:', USER.PASSWORD.MESSAGE);
console.log('');

// 详细的测试用例
const testCases = [
  // === 有效的密码（应该通过） ===
  { password: 'Abc123', expected: true, description: '小写+大写+数字（三种）' },
  { password: 'Hello!123', expected: true, description: '小写+大写+数字+特殊符号（四种）' },
  { password: 'PASSword!', expected: true, description: '小写+大写+特殊符号（三种）' },
  { password: 'test123!', expected: true, description: '小写+数字+特殊符号（三种）' },
  { password: 'ABC123!', expected: true, description: '大写+数字+特殊符号（三种）' },
  { password: 'Aa1!@#', expected: true, description: '正好6位，包含三种类型' },
  { password: 'Test~123', expected: true, description: '包含~符号' },
  { password: 'Test!123', expected: true, description: '包含!符号' },
  { password: 'Test@123', expected: true, description: '包含@符号' },
  { password: 'Test#123', expected: true, description: '包含#符号' },
  { password: 'Test$123', expected: true, description: '包含$符号' },
  { password: 'Test%123', expected: true, description: '包含%符号' },
  { password: 'Test^123', expected: true, description: '包含^符号' },
  { password: 'Test&123', expected: true, description: '包含&符号' },
  { password: 'Test*123', expected: true, description: '包含*符号' },
  { password: 'Test(123', expected: true, description: '包含(符号' },
  { password: 'Test)123', expected: true, description: '包含)符号' },
  { password: 'Test_123', expected: true, description: '包含_符号' },
  { password: 'Test+123', expected: true, description: '包含+符号' },
  { password: 'Test-123', expected: true, description: '包含-符号' },
  
  // === 无效的密码（应该不通过） ===
  { password: 'abcdef', expected: false, description: '只有小写字母（一种）' },
  { password: 'ABCDEF', expected: false, description: '只有大写字母（一种）' },
  { password: '123456', expected: false, description: '只有数字（一种）' },
  { password: '!@#$%^', expected: false, description: '只有特殊符号（一种）' },
  { password: 'abcABC', expected: false, description: '只有小写+大写（两种）' },
  { password: 'abc123', expected: false, description: '只有小写+数字（两种）' },
  { password: 'ABC123', expected: false, description: '只有大写+数字（两种）' },
  { password: 'abc!@#', expected: false, description: '只有小写+特殊符号（两种）' },
  { password: 'ABC!@#', expected: false, description: '只有大写+特殊符号（两种）' },
  { password: '123!@#', expected: false, description: '只有数字+特殊符号（两种）' },
  { password: 'Aa1!', expected: false, description: '长度不足6位' },
  { password: 'Aa1!Aa1!Aa1!Aa1!Aa1!', expected: false, description: '长度超过20位' },
  
  // === 边界情况测试 ===
  { password: 'Aa1!@#', expected: true, description: '正好6位' },
  { password: 'Aa1!@#Aa1!@#Aa1!@#', expected: false, description: '超过20位' },
  
  // === 不允许的字符测试 ===
  { password: 'Test[123', expected: false, description: '包含不允许的字符[' },
  { password: 'Test]123', expected: false, description: '包含不允许的字符]' },
  { password: 'Test{123', expected: false, description: '包含不允许的字符{' },
  { password: 'Test}123', expected: false, description: '包含不允许的字符}' },
  { password: 'Test|123', expected: false, description: '包含不允许的字符|' },
  { password: 'Test\\123', expected: false, description: '包含不允许的字符\\\\' },
  { password: 'Test/123', expected: false, description: '包含不允许的字符/' },
  { password: 'Test?123', expected: false, description: '包含不允许的字符?' },
  { password: 'Test=123', expected: false, description: '包含不允许的字符=' },
];

// 运行测试
let passed = 0;
let failed = 0;

console.log('开始测试...\n');

testCases.forEach((testCase, index) => {
  const result = USER.PASSWORD.PATTERN.test(testCase.password);
  const isCorrect = result === testCase.expected;
  
  if (isCorrect) {
    passed++;
    console.log(`✅ 测试 ${index + 1}: ${testCase.description}`);
    console.log(`   密码: "${testCase.password}" - 结果: ${result} (期望: ${testCase.expected})`);
  } else {
    failed++;
    console.log(`❌ 测试 ${index + 1}: ${testCase.description}`);
    console.log(`   密码: "${testCase.password}" - 结果: ${result} (期望: ${testCase.expected})`);
  }
});

console.log('\n=== 测试结果汇总 ===');
console.log(`总测试数: ${testCases.length}`);
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`通过率: ${((passed / testCases.length) * 100).toFixed(2)}%`);

if (failed === 0) {
  console.log('🎉 所有测试都通过了！密码验证规则工作正常！');
} else {
  console.log('⚠️ 有测试失败，请检查正则表达式逻辑！');
  
  // 显示失败的测试详情
  console.log('\n=== 失败测试详情 ===');
  testCases.forEach((testCase, index) => {
    const result = USER.PASSWORD.PATTERN.test(testCase.password);
    if (result !== testCase.expected) {
      console.log(`失败测试 ${index + 1}:`);
      console.log(`  描述: ${testCase.description}`);
      console.log(`  密码: "${testCase.password}"`);
      console.log(`  实际结果: ${result}`);
      console.log(`  期望结果: ${testCase.expected}`);
      console.log('');
    }
  });
}

// 额外验证：测试密码长度限制
console.log('\n=== 密码长度验证 ===');
for (let i = 1; i <= 25; i++) {
  const password = 'A'.repeat(Math.min(i, 1)) + 'a'.repeat(Math.min(i, 1)) + '1'.repeat(Math.min(i, 1)) + '!'.repeat(Math.min(i, 1));
  const isValidLength = i >= USER.PASSWORD.MIN_LENGTH && i <= USER.PASSWORD.MAX_LENGTH;
  const patternResult = USER.PASSWORD.PATTERN.test(password);
  
  if (i <= 10 || i >= 15) {
    console.log(`长度 ${i}: ${isValidLength ? '✅' : '❌'} 长度验证 | ${patternResult ? '✅' : '❌'} 正则验证 | 示例: "${password}"`);
  }
}

console.log('\n=== 测试完成 ===');