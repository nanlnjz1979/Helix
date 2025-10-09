const http = require('http');
require('dotenv').config();

// 配置选项
const config = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  apiPrefix: '/api/auth'
};

console.log(`=== 简单认证测试 ===`);
console.log(`服务地址: http://${config.hostname}:${config.port}`);
console.log(`测试目标: 验证预设用户登录功能\n`);

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

// 测试管理员登录
async function testAdminLogin() {
  console.log('\n[测试1] 管理员登录测试');
  console.log('用户名: admin, 密码: admin123');
  
  try {
    const result = await sendPostRequest('/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log(`状态码: ${result.statusCode}`);
    console.log('响应:', JSON.stringify(result.body, null, 2));
    
    if (result.statusCode === 200 && result.body.token) {
      console.log('✅ 管理员登录成功!');
      return result.body.token;
    } else {
      console.log('❌ 管理员登录失败');
      return null;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return null;
  }
}

// 测试普通用户登录
async function testUserLogin() {
  console.log('\n[测试2] 普通用户登录测试');
  console.log('用户名: user1, 密码: user123');
  
  try {
    const result = await sendPostRequest('/login', {
      username: 'user1',
      password: 'user123'
    });
    
    console.log(`状态码: ${result.statusCode}`);
    console.log('响应:', JSON.stringify(result.body, null, 2));
    
    if (result.statusCode === 200 && result.body.token) {
      console.log('✅ 普通用户登录成功!');
      return result.body.token;
    } else {
      console.log('❌ 普通用户登录失败');
      return null;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return null;
  }
}

// 测试无效密码
async function testInvalidPassword() {
  console.log('\n[测试3] 无效密码测试');
  console.log('用户名: admin, 密码: wrongpassword');
  
  try {
    const result = await sendPostRequest('/login', {
      username: 'admin',
      password: 'wrongpassword'
    });
    
    console.log(`状态码: ${result.statusCode}`);
    console.log('响应:', JSON.stringify(result.body, null, 2));
    
    if (result.statusCode === 401) {
      console.log('✅ 无效密码测试通过! (正确拒绝了无效密码)');
    } else {
      console.log('❌ 无效密码测试失败 (应该返回401状态码)');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 测试无效用户
async function testInvalidUser() {
  console.log('\n[测试4] 无效用户测试');
  console.log('用户名: nonexistent, 密码: password');
  
  try {
    const result = await sendPostRequest('/login', {
      username: 'nonexistent',
      password: 'password'
    });
    
    console.log(`状态码: ${result.statusCode}`);
    console.log('响应:', JSON.stringify(result.body, null, 2));
    
    if (result.statusCode === 401) {
      console.log('✅ 无效用户测试通过! (正确拒绝了不存在的用户)');
    } else {
      console.log('❌ 无效用户测试失败 (应该返回401状态码)');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 检查服务是否运行
async function checkServiceRunning() {
  return new Promise((resolve) => {
    // 直接发送一个简单的POST请求到登录接口来测试服务是否运行
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: `${config.apiPrefix}/login`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      console.log(`\n服务状态: 运行中 (状态码: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (e) => {
      console.error(`\n服务状态: 未运行 - ${e.message}`);
      console.error('请先启动后端服务: npm start 或 npm run dev');
      resolve(false);
    });

    req.setTimeout(2000, () => {
      console.error('\n服务状态: 连接超时');
      resolve(false);
    });

    req.write(JSON.stringify({username: 'test', password: 'test'}));
    req.end();
  });
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
    
    // 运行测试
    await testAdminLogin();
    await testUserLogin();
    await testInvalidPassword();
    await testInvalidUser();
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 启动测试
console.log('等待1秒，确保服务完全启动...');
setTimeout(runTests, 1000);