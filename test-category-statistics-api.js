const axios = require('axios');

// 配置
const API_URL = 'http://localhost:5000/api';
const TEST_USER_USERNAME = 'admin';
const TEST_USER_PASSWORD = 'admin123';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 登录获取token
async function login() {
  try {
    console.log('尝试登录...');
    const response = await apiClient.post('/auth/login', {
      username: TEST_USER_USERNAME,
      password: TEST_USER_PASSWORD
    });
    
    console.log('登录成功!');
    return response.data.token;
  } catch (error) {
    console.error('登录失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 测试类别统计API
async function testCategoryStatisticsAPI(token) {
  try {
    console.log('\n测试类别统计API...');
    
    // 设置认证头
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 测试完整路径
    console.log('测试路径1: /admin/categories/statistics');
    const response1 = await apiClient.get('/admin/categories/statistics');
    console.log('响应状态码:', response1.status);
    console.log('响应数据:', response1.data);
    
    // 测试可能的其他路径
    console.log('\n测试路径2: /categories/statistics');
    const response2 = await apiClient.get('/categories/statistics');
    console.log('响应状态码:', response2.status);
    console.log('响应数据:', response2.data);
    
  } catch (error) {
    console.error('API调用失败:', error.response ? `状态码: ${error.response.status}, 错误: ${JSON.stringify(error.response.data)}` : error.message);
    
    // 打印详细错误信息
    if (error.response) {
      console.error('请求URL:', error.config.url);
      console.error('请求头:', error.config.headers);
      console.error('完整错误响应:', error.response);
    }
  }
}

// 主测试函数
async function runTest() {
  try {
    console.log('=== 类别统计API测试 ===');
    
    // 1. 登录获取token
    const token = await login();
    
    // 2. 测试类别统计API
    await testCategoryStatisticsAPI(token);
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('\n测试失败:', error);
    console.log('=== 测试终止 ===');
  }
}

// 运行测试
runTest().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});