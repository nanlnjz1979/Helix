require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Category = require('./src/models/Category');

// 配置项
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helix';

// 生成模拟认证令牌
function generateMockAuthToken() {
  // 从auth中间件的实现可以看出，支持模拟admin用户
  // 创建一个包含admin角色的模拟token对象
  return JSON.stringify({
    role: 'admin',
    id: '1',
    username: 'admin'
  });
}

// 生成测试数据
function generateTestData() {
  const timestamp = Date.now();
  return {
    name: `测试策略类型${timestamp}`,
    description: `这是一个测试用的策略类型，创建于${new Date().toISOString()}`,
    parent: null, // 创建一个顶级类别
    tags: ['测试', '策略类型', '自动化测试'],
    visibility: 'public',
    isSystem: false
  };
}

// 连接MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 已成功连接到MongoDB数据库');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    throw error;
  }
}

// 断开数据库连接
async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ 已断开MongoDB数据库连接');
  } catch (error) {
    console.error('❌ 断开MongoDB连接失败:', error.message);
  }
}

// 验证数据是否正确保存到数据库
async function verifyDataInDatabase(categoryData) {
  try {
    const category = await Category.findOne({ name: categoryData.name });
    if (!category) {
      throw new Error(`❌ 数据库中未找到创建的策略类型: ${categoryData.name}`);
    }
    
    console.log('✅ 已在数据库中找到创建的策略类型:', category.name);
    console.log('   - ID:', category._id);
    console.log('   - 描述:', category.description);
    console.log('   - 标签:', category.tags.join(', '));
    console.log('   - 可见性:', category.visibility);
    
    return category;
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
    throw error;
  }
}

// 清理测试数据
async function cleanupTestData(categoryId) {
  try {
    const result = await Category.findByIdAndDelete(categoryId);
    if (result) {
      console.log('✅ 已成功清理测试数据');
    } else {
      console.log('ℹ️ 测试数据不存在，无需清理');
    }
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error.message);
  }
}

// 调用API创建策略类型
async function createStrategyTypeViaAPI(categoryData) {
  try {
    const token = generateMockAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/categories`,
      categoryData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ API调用成功，策略类型创建成功');
    console.log('   - 响应状态码:', response.status);
    console.log('   - 创建的策略类型:', response.data.category.name);
    
    return response.data.category;
  } catch (error) {
    console.error('❌ API调用失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 主测试函数
async function runTest() {
  let createdCategory = null;
  
  try {
    console.log('🚀 开始测试策略类型创建API...');
    
    // 1. 生成测试数据
    const testData = generateTestData();
    console.log('📝 生成测试数据:', testData.name);
    
    // 2. 连接数据库
    await connectToDatabase();
    
    // 3. 调用API创建策略类型
    createdCategory = await createStrategyTypeViaAPI(testData);
    
    // 4. 验证数据是否正确保存到数据库
    const dbCategory = await verifyDataInDatabase(testData);
    
    // 5. 检查API返回的数据和数据库中的数据是否一致
    if (dbCategory._id.toString() !== createdCategory._id) {
      throw new Error('❌ API返回的ID与数据库中的ID不一致');
    }
    
    console.log('✅ 测试通过！策略类型创建API能正确将数据保存到数据库');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  } finally {
    // 清理测试数据
    if (createdCategory) {
      await cleanupTestData(createdCategory._id);
    }
    
    // 断开数据库连接
    await disconnectFromDatabase();
    
    console.log('✅ 测试完成');
  }
}

// 运行测试
runTest().catch(err => {
  console.error('❌ 测试过程中发生未捕获的错误:', err);
  process.exit(1);
});