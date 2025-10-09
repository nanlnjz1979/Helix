// 详细的登录调试脚本
// 这个脚本将模拟前端登录流程，特别是关注可能导致 'SyntaxError: Unexpected token '<'' 的问题

// 导入必要的库
const axios = require('axios');

// 配置axios实例
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 模拟前端的错误处理函数
function parseResponse(response) {
  console.log('[DEBUG] 原始响应:', response);
  console.log('[DEBUG] 响应状态码:', response.status);
  console.log('[DEBUG] 响应头信息:', response.headers);
  console.log('[DEBUG] Content-Type:', response.headers['content-type']);
  
  // 检查响应是否包含HTML内容
  if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
    console.error('[ERROR] 收到HTML响应而不是JSON:', response.data.substring(0, 500));
    return null;
  }
  
  return response.data;
}

// 模拟authAPI.login函数
async function login(username, password) {
  try {
    console.log(`[DEBUG] 发送登录请求 - 用户名: ${username}`);
    const response = await api.post('/auth/login', {
      username,
      password
    });
    
    const data = parseResponse(response);
    if (!data) {
      throw new Error('无效的响应格式：HTML内容而不是JSON');
    }
    
    console.log('[DEBUG] 登录成功，响应数据:', data);
    return data;
  } catch (error) {
    console.error('[DEBUG] 登录请求失败:', error);
    
    // 检查是否是axios错误
    if (error.isAxiosError) {
      console.error('[DEBUG] Axios错误详情:', {
        status: error.response?.status,
        headers: error.response?.headers,
        data: error.response?.data ? 
          (typeof error.response.data === 'string' ? error.response.data.substring(0, 500) : error.response.data) 
          : '无数据'
      });
      
      // 检查错误响应是否包含HTML
      if (error.response?.headers && error.response.headers['content-type'] && 
          error.response.headers['content-type'].includes('text/html')) {
        console.error('[ERROR] 错误响应包含HTML内容:', error.response.data.substring(0, 500));
      }
    } else if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      console.error('[ERROR] JSON解析错误:', error.message);
      // 模拟前端可能出现的情况
      simulateJsonParseError();
    }
    
    throw error;
  }
}

// 模拟JSON解析错误
function simulateJsonParseError() {
  console.log('\n[SIMULATION] 模拟JSON解析错误场景:');
  
  // 场景1: 尝试解析HTML内容
  const htmlContent = '<!DOCTYPE html><html><head><title>Error</title></head><body><h1>404 Not Found</h1></body></html>';
  try {
    JSON.parse(htmlContent);
  } catch (error) {
    console.log('[SIMULATION] 尝试解析HTML时的错误:', error.message);
  }
  
  // 场景2: 空响应
  try {
    JSON.parse('');
  } catch (error) {
    console.log('[SIMULATION] 尝试解析空字符串时的错误:', error.message);
  }
  
  // 场景3: 格式错误的JSON
  const invalidJson = '{username: "test", password: "test"}'; // 缺少引号
  try {
    JSON.parse(invalidJson);
  } catch (error) {
    console.log('[SIMULATION] 尝试解析格式错误的JSON时的错误:', error.message);
  }
}

// 运行测试
async function runTest() {
  console.log('开始登录调试测试...');
  
  try {
    // 使用有效的测试凭据
    const testCredentials = {
      username: 'testuser', // 请替换为有效的测试用户名
      password: 'testpassword' // 请替换为有效的测试密码
    };
    
    console.log('[TEST] 使用凭据:', testCredentials);
    const result = await login(testCredentials.username, testCredentials.password);
    console.log('[TEST] 测试成功，登录结果:', result);
  } catch (error) {
    console.error('[TEST] 测试失败:', error.message);
  } finally {
    console.log('测试完成');
  }
}

// 运行测试
runTest();