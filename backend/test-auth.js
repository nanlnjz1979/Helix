// 测试认证功能的脚本
const http = require('http');

// 测试管理员登录
function testAdminLogin() {
  console.log('\n=== 测试管理员登录 ===');
  
  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', data);
        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 测试普通用户登录
function testUserLogin() {
  console.log('\n=== 测试普通用户登录 ===');
  
  const postData = JSON.stringify({
    username: 'user02',
    password: 'nannan123456'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', data);
        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 测试无效密码登录
function testInvalidPassword() {
  console.log('\n=== 测试无效密码登录 ===');
  
  const postData = JSON.stringify({
    username: 'admin',
    password: 'wrongpassword'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', data);
        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 测试无效用户登录
function testInvalidUser() {
  console.log('\n=== 测试无效用户登录 ===');
  
  const postData = JSON.stringify({
    username: 'nonexistent',
    password: 'password'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', data);
        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 测试管理员API访问
function testAdminApiAccess(token) {
  console.log('\n=== 测试管理员API访问 ===');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', data.length > 500 ? `${data.substring(0, 500)}...` : data);
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

// 运行所有测试
async function runTests() {
  console.log('开始测试认证功能...');
  
  try {
    // 测试管理员登录
    const adminLoginResult = await testAdminLogin();
    if (adminLoginResult.statusCode === 200 && adminLoginResult.body.token) {
      console.log('✅ 管理员登录测试通过');
      
      // 测试管理员API访问
      const adminApiResult = await testAdminApiAccess(adminLoginResult.body.token);
      if (adminApiResult.statusCode === 200) {
        console.log('✅ 管理员API访问测试通过');
      } else {
        console.log('❌ 管理员API访问测试失败');
      }
    } else {
      console.log('❌ 管理员登录测试失败');
    }
    
    // 测试普通用户登录
    const userLoginResult = await testUserLogin();
    if (userLoginResult.statusCode === 200 && userLoginResult.body.token) {
      console.log('✅ 普通用户登录测试通过');
    } else {
      console.log('❌ 普通用户登录测试失败');
    }
    
    // 测试无效密码
    const invalidPasswordResult = await testInvalidPassword();
    if (invalidPasswordResult.statusCode === 401) {
      console.log('✅ 无效密码测试通过');
    } else {
      console.log('❌ 无效密码测试失败');
    }
    
    // 测试无效用户
    const invalidUserResult = await testInvalidUser();
    if (invalidUserResult.statusCode === 401) {
      console.log('✅ 无效用户测试通过');
    } else {
      console.log('❌ 无效用户测试失败');
    }
    
    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 等待服务完全启动后运行测试
setTimeout(() => {
  runTests();
}, 2000);