const axios = require('axios');

// 测试程序配置
const API_URL = 'http://localhost:5000/api'; // 后端API地址
const TEST_USER_USERNAME = 'admin'; // 测试用户名
const TEST_USER_PASSWORD = 'admin123'; // 默认管理员密码

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 登录获取JWT token
 */
async function login() {
  try {
    console.log('正在尝试登录...');
    const response = await apiClient.post('/auth/login', {
      username: TEST_USER_USERNAME,
      password: TEST_USER_PASSWORD
    });
    
    const token = response.data.token;
    console.log('登录成功，获取到token');
    
    // 设置axios请求头，自动带上token（使用标准的Bearer格式）
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return token;
  } catch (error) {
    console.error('登录失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * 测试获取所有策略类型
 */
async function testGetAllCategories() {
  try {
    console.log('\n测试获取所有策略类型...');
    const response = await apiClient.get('/admin/categories');
    
    console.log('获取策略类型成功！');
    console.log('策略类型总数:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('前5个策略类型:');
      response.data.slice(0, 5).forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (ID: ${category._id})`);
        console.log(`   描述: ${category.description || '无描述'}`);
        console.log(`   可见性: ${category.visibility}`);
        console.log(`   创建时间: ${new Date(category.createdAt).toLocaleString()}`);
        console.log('   ---');
      });
    } else {
      console.log('当前没有策略类型数据');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取策略类型失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * 测试获取策略类型树状结构
 */
async function testGetCategoryTree() {
  try {
    console.log('\n测试获取策略类型树状结构...');
    const response = await apiClient.get('/admin/categories/tree');
    
    console.log('获取策略类型树状结构成功！');
    console.log('树状结构数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('获取策略类型树状结构失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * 测试获取策略类型统计信息
 */
async function testGetCategoryStats() {
  try {
    console.log('\n测试获取策略类型统计信息...');
    const response = await apiClient.get('/admin/categories/stats');
    
    console.log('获取策略类型统计信息成功！');
    console.log('统计数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('获取策略类型统计信息失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('===== 策略类型API测试程序 =====');
  
  try {
    // 先登录获取认证token
    await login();
    
    // 测试各个API端点
    await testGetAllCategories();
    await testGetCategoryTree();
    
    console.log('\n===== 测试完成 =====');
  } catch (error) {
    console.error('\n测试失败:', error.message);
    console.log('\n===== 测试终止 =====');
  }
}

// 运行测试
runTests();