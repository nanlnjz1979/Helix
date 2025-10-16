const axios = require('axios');

// 设置API基础URL
const BASE_URL = 'http://localhost:5000';
const CATEGORY_ID = '68f063b0a46febedd080de51';
const API_ENDPOINT = `/api/admin/categories/${CATEGORY_ID}/strategies`;
const LOGIN_ENDPOINT = '/api/auth/login';

// 登录凭据（从数据库测试中发现的正确管理员凭据）
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// 全局token变量
let authToken = '';

// 循环调用次数
const LOOP_COUNT = 10;

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 登录函数
async function login() {
  try {
    console.log('尝试登录获取认证令牌...');
    const response = await axios.post(`${BASE_URL}${LOGIN_ENDPOINT}`, LOGIN_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data?.token) {
      authToken = response.data.token;
      console.log('登录成功，已获取认证令牌');
      return true;
    } else {
      console.error('登录成功但未返回token');
      return false;
    }
  } catch (error) {
    console.error('登录失败:', error.message);
    if (error.response) {
      console.error('登录错误状态码:', error.response.status);
      console.error('登录错误响应数据:', error.response.data);
    }
    return false;
  }
}

// 单个API调用函数
async function callApi(index) {
  try {
    console.log(`第 ${index + 1}/${LOOP_COUNT} 次调用API...`);
    const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log(`第 ${index + 1} 次调用成功`);
    console.log('返回数据类型:', Array.isArray(response.data) ? '数组' : typeof response.data);
    console.log('返回数据示例:', JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
    return response.data;
  } catch (error) {
    console.error(`第 ${index + 1} 次调用失败:`, error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应数据:', error.response.data);
    }
    return null;
  }
}

// 主循环函数
async function runLoop() {
  console.log(`开始循环调用API: ${API_ENDPOINT}`);
  
  // 首先尝试登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('登录失败，无法继续测试');
    return;
  }
  
  console.log(`总共调用 ${LOOP_COUNT} 次，每次间隔 2 秒`);
  console.log('====================================');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < LOOP_COUNT; i++) {
    const result = await callApi(i);
    if (result) {
      successCount++;
    } else {
      failureCount++;
    }
    
    if (i < LOOP_COUNT - 1) {
      console.log('等待 2 秒后进行下一次调用...');
      await delay(2000);
      console.log('====================================');
    }
  }
  
  console.log('====================================');
  console.log(`循环调用完成`);
  console.log(`成功次数: ${successCount}`);
  console.log(`失败次数: ${failureCount}`);
  console.log(`成功率: ${(successCount / LOOP_COUNT * 100).toFixed(2)}%`);
}

// 执行循环
runLoop().catch(error => {
  console.error('循环执行出错:', error);
});