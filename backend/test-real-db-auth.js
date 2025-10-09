const http = require('http');
require('dotenv').config();

// 配置选项
const config = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  apiPrefix: '/api/auth'
};

console.log(`=== 真实数据库认证测试 ===`);
console.log(`服务地址: http://${config.hostname}:${config.port}`);
console.log(`测试目标: 验证系统使用数据库中的真实数据进行认证\n`);

// 发送POST请求的函数
function sendPostRequest(path, data) {
  const postData = JSON.stringify(data);

  const options = {
    hostname: config.hostname,
    port: config.port,
    path: `${config.apiPrefix}${path}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`请求错误: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// 发送GET请求的函数（用于检查服务器状态）
function sendGetRequest(path) {
  const options = {
    hostname: config.hostname,
    port: config.port,
    path: path,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: responseData
        });
      });
    });

    req.on('error', (e) => {
      reject(new Error(`请求错误: ${e.message}`));
    });

    req.end();
  });
}

// 检查服务是否运行
async function checkServiceRunning() {
  try {
    console.log('正在检查后端服务状态...');
    
    // 尝试访问一个简单的API端点
    const result = await sendGetRequest('/api/auth/login');
    console.log(`服务状态: 运行中 (状态码: ${result.statusCode})`);
    return true;
  } catch (error) {
    console.error(`服务状态: 未运行 - ${error.message}`);
    console.error('请先启动后端服务: npm start 或 npm run dev');
    return false;
  }
}

// 测试真实数据库中的用户登录
async function testRealDatabaseLogin() {
  console.log('\n=== 请输入数据库中的真实用户凭证 ===');
  console.log('注意：请确保MongoDB数据库中有相应的用户记录');
  
  // 这里我们使用预设的测试凭证
  // 在实际使用时，你可以修改这些值为数据库中存在的用户凭证
  const testUsers = [
    {
      username: 'admin',
      password: 'admin123',
      description: '管理员用户'
    },
    {
      username: 'user1', 
      password: 'user123',
      description: '普通用户'
    }
  ];

  for (const testUser of testUsers) {
    console.log(`\n[测试] 尝试登录 ${testUser.description} (用户名: ${testUser.username})`);
    
    try {
      const result = await sendPostRequest('/login', {
        username: testUser.username,
        password: testUser.password
      });
      
      console.log(`状态码: ${result.statusCode}`);
      console.log('响应:', JSON.stringify(result.body, null, 2));
      
      if (result.statusCode === 200 && result.body.token) {
        console.log(`✅ ${testUser.description}登录成功! 系统正在使用数据库中的真实数据进行认证。`);
        return result.body.token;
      } else {
        console.log(`❌ ${testUser.description}登录失败，可能原因：`);
        console.log('1. 数据库中不存在该用户');
        console.log('2. 密码不正确');
        console.log('3. 系统仍在使用模拟数据模式');
      }
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
  }
  
  return null;
}

// 检查系统运行模式（真实还是模拟）
async function checkSystemMode() {
  // 通过观察登录响应来推测系统模式
  // 在实际应用中，可能需要添加一个专门的端点来获取系统状态
  console.log('\n[检查] 分析系统运行模式...');
  
  // 尝试使用一个不太可能存在的用户登录
  const nonExistentUser = {
    username: 'non_existent_user_' + Date.now(),
    password: 'randompassword'
  };
  
  try {
    const result = await sendPostRequest('/login', nonExistentUser);
    
    // 在真实模式下，不存在的用户应该返回401
    if (result.statusCode === 401) {
      console.log('✅ 系统似乎正在使用真实数据库模式');
    } else {
      console.log('⚠️ 系统可能仍在使用模拟数据模式');
    }
  } catch (error) {
    console.error('❌ 模式检查失败:', error.message);
  }
}

// 运行所有测试
async function runTests() {
  try {
    // 首先检查服务是否运行
    const isRunning = await checkServiceRunning();
    if (!isRunning) {
      console.error('测试中止: 后端服务未运行');
      return;
    }
    
    // 等待2秒，确保服务完全初始化
    console.log('\n等待2秒，确保服务完全初始化...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查系统运行模式
    await checkSystemMode();
    
    // 测试登录功能
    const token = await testRealDatabaseLogin();
    
    if (token) {
      console.log('\n🎉 恭喜！系统已成功配置为使用数据库中的真实数据进行认证。');
      console.log('以下是进一步验证的建议：');
      console.log('1. 在MongoDB中添加新用户，然后使用新用户凭证登录');
      console.log('2. 修改现有用户的密码，验证密码更新后可以正常登录');
      console.log('3. 检查服务器日志，确认认证模块初始化时使用了真实数据库模式');
    } else {
      console.log('\n❌ 测试未通过。请检查以下事项：');
      console.log('1. MongoDB服务是否正在运行');
      console.log('2. 数据库连接配置是否正确');
      console.log('3. 数据库中是否存在测试用户');
      console.log('4. 检查服务器日志以获取更详细的错误信息');
    }
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 启动测试
console.log('等待1秒，准备开始测试...');
setTimeout(runTests, 1000);