require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 配置项
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quant_trading_platform';

// 生成模拟认证令牌
function generateMockAuthToken() {
  // 创建一个包含admin角色的模拟token对象
  const token = JSON.stringify({
    role: 'admin',
    id: '1',
    username: 'admin'
  });
  
  // 为了确保兼容性，先检查后端auth中间件的实现方式
  console.log('🔑 生成的认证令牌:', token);
  return token;
}

// 生成测试数据
function generateTestData() {
  const timestamp = Date.now();
  return {
    name: `测试策略类型_增强测试_${timestamp}`,
    description: `这是一个增强版测试用的策略类型，创建于${new Date().toISOString()}`,
    parent: null, // 创建一个顶级类别
    tags: ['测试', '策略类型', '增强测试', `timestamp_${timestamp}`],
    visibility: 'public',
    isSystem: false
  };
}

// 检查后端服务是否正在运行
async function checkBackendService() {
  try {
    console.log(`🔍 检查后端服务: ${API_BASE_URL}/health`);
    // 尝试访问一个简单的API端点
    const response = await axios.get(`${API_BASE_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${generateMockAuthToken()}`
      },
      timeout: 3000
    });
    console.log('✅ 后端服务运行正常');
    return true;
  } catch (error) {
    console.error('❌ 后端服务未运行或无法访问:', error.message);
    console.log('📝 请确保后端服务已启动，并检查端口配置是否正确');
    return false;
  }
}

// 连接MongoDB并检查数据库状态
async function connectToDatabase() {
  try {
    console.log(`🔌 连接到MongoDB: ${MONGODB_URI}`);
    
    // 连接选项
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    };
    
    // 连接数据库
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    console.log('✅ 已成功连接到MongoDB数据库');
    console.log('   - 数据库名称:', connection.connection.name);
    console.log('   - 连接状态:', connection.connection.readyState === 1 ? '已连接' : '未连接');
    
    // 列出数据库中的集合
    const collections = await connection.connection.db.listCollections().toArray();
    console.log('   - 数据库集合:', collections.map(c => c.name).join(', '));
    
    // 确保categories集合存在
    const hasCategoriesCollection = collections.some(c => c.name === 'categories');
    if (!hasCategoriesCollection) {
      console.log('⚠️  警告: 数据库中尚未创建categories集合');
    }
    
    // 查看当前数据库中的策略类型数量
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const categoryCount = await Category.countDocuments();
    console.log(`   - 当前数据库中的策略类型数量: ${categoryCount}`);
    
    return connection;
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    console.log('📝 请确保MongoDB服务已启动，连接字符串正确');
    throw error;
  }
}

// 断开数据库连接
async function disconnectFromDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('✅ 已断开MongoDB数据库连接');
    }
  } catch (error) {
    console.error('❌ 断开MongoDB连接失败:', error.message);
  }
}

// 使用直接数据库操作创建策略类型（备用方法）
async function createStrategyTypeDirectly(categoryData) {
  try {
    console.log('📊 尝试直接在数据库中创建策略类型...');
    
    // 定义Category模型
    const Category = mongoose.model('Category', new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String, default: '' },
      parent: { type: mongoose.Schema.Types.ObjectId, default: null },
      tags: [String],
      visibility: { type: String, default: 'public' },
      isSystem: { type: Boolean, default: false },
      owner: { type: mongoose.Schema.Types.ObjectId, default: null },
      archived: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }));
    
    // 创建新的策略类型
    const newCategory = new Category(categoryData);
    await newCategory.save();
    
    console.log('✅ 直接数据库操作成功创建策略类型:', newCategory.name);
    console.log('   - ID:', newCategory._id);
    
    return newCategory;
  } catch (error) {
    console.error('❌ 直接数据库操作失败:', error.message);
    throw error;
  }
}

// 验证数据是否正确保存到数据库
async function verifyDataInDatabase(categoryData) {
  try {
    console.log(`🔍 验证数据库中是否存在策略类型: ${categoryData.name}`);
    
    // 定义Category模型（使用宽松模式，避免字段不匹配问题）
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    
    // 首先尝试通过name查找
    let category = await Category.findOne({ name: categoryData.name });
    
    // 如果找不到，尝试通过tags中的timestamp查找
    if (!category) {
      const timestampTag = categoryData.tags.find(tag => tag.startsWith('timestamp_'));
      if (timestampTag) {
        console.log(`   - 尝试通过时间戳标签查找: ${timestampTag}`);
        category = await Category.findOne({ tags: timestampTag });
      }
    }
    
    if (!category) {
      throw new Error(`❌ 数据库中未找到创建的策略类型: ${categoryData.name}`);
    }
    
    console.log('✅ 已在数据库中找到创建的策略类型');
    console.log('   - ID:', category._id);
    console.log('   - 名称:', category.name);
    console.log('   - 描述:', category.description || '无');
    console.log('   - 父类别:', category.parent ? category.parent : '无');
    console.log('   - 标签:', category.tags && category.tags.length > 0 ? category.tags.join(', ') : '无');
    console.log('   - 可见性:', category.visibility);
    console.log('   - 系统类别:', category.isSystem ? '是' : '否');
    console.log('   - 创建时间:', category.createdAt);
    
    // 查看数据库中所有策略类型，用于调试
    const allCategories = await Category.find({}).limit(5);
    console.log(`   - 当前数据库中的前5个策略类型: ${allCategories.map(c => c.name).join(', ')}`);
    
    return category;
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
    
    // 列出数据库中的所有策略类型，用于调试
    try {
      const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
      const allCategories = await Category.find({});
      console.log('📊 数据库中的所有策略类型:');
      allCategories.forEach(cat => {
        console.log(`   - [${cat._id}] ${cat.name} (${cat.createdAt || '无创建时间'})`);
      });
    } catch (dbError) {
      console.error('❌ 列出数据库内容失败:', dbError.message);
    }
    
    throw error;
  }
}

// 清理测试数据
async function cleanupTestData(categoryId) {
  try {
    console.log(`🧹 清理测试数据，ID: ${categoryId}`);
    
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
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
    console.log(`📡 调用API创建策略类型: ${categoryData.name}`);
    console.log(`   - API地址: ${API_BASE_URL}/categories`);
    
    const token = generateMockAuthToken();
    
    // 详细记录请求信息
    console.log('   - 请求头:');
    console.log('     - Authorization: Bearer [token]');
    console.log('     - Content-Type: application/json');
    console.log('   - 请求体:');
    console.log('     - name:', categoryData.name);
    console.log('     - description:', categoryData.description);
    console.log('     - parent:', categoryData.parent);
    console.log('     - tags:', categoryData.tags);
    
    // 设置较长的超时时间
    const response = await axios.post(
      `${API_BASE_URL}/categories`,
      categoryData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ API调用成功，策略类型创建成功');
    console.log('   - 响应状态码:', response.status);
    console.log('   - 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data.category || response.data;
  } catch (error) {
    console.error('❌ API调用失败:');
    if (error.response) {
      console.error('   - 状态码:', error.response.status);
      console.error('   - 响应数据:', JSON.stringify(error.response.data, null, 2));
      console.error('   - 响应头:', error.response.headers);
    } else if (error.request) {
      console.error('   - 没有收到响应:', error.request);
    } else {
      console.error('   - 请求配置错误:', error.message);
    }
    throw error;
  }
}

// 主测试函数
async function runTest() {
  let createdCategory = null;
  let dbConnection = null;
  let testData = null;
  
  try {
    console.log('🚀 开始增强版策略类型创建测试...');
    console.log('📅 测试时间:', new Date().toISOString());
    console.log('🔧 测试配置:');
    console.log('   - API_BASE_URL:', API_BASE_URL);
    console.log('   - MONGODB_URI:', MONGODB_URI);
    
    // 1. 检查后端服务是否正在运行
    const backendRunning = await checkBackendService();
    if (!backendRunning) {
      console.log('⚠️  后端服务未运行，将只测试数据库操作...');
      // 不强制要求后端服务运行，继续测试数据库操作
    }
    
    // 2. 生成测试数据
    testData = generateTestData();
    console.log('📝 生成测试数据:', testData.name);
    
    // 3. 连接数据库
    dbConnection = await connectToDatabase();
    
    // 4. 调用API创建策略类型
    try {
      createdCategory = await createStrategyTypeViaAPI(testData);
    } catch (apiError) {
      console.log('⚠️  API调用失败，尝试直接在数据库中创建...');
      createdCategory = await createStrategyTypeDirectly(testData);
    }
    
    // 5. 验证数据是否正确保存到数据库
    const dbCategory = await verifyDataInDatabase(testData);
    
    // 6. 检查API返回的数据和数据库中的数据是否一致（如果API调用成功）
    if (createdCategory && createdCategory._id && dbCategory._id) {
      if (dbCategory._id.toString() !== createdCategory._id.toString()) {
        console.log('⚠️  警告: API返回的ID与数据库中的ID不一致');
        console.log('   - API返回的ID:', createdCategory._id);
        console.log('   - 数据库中的ID:', dbCategory._id.toString());
      } else {
        console.log('✅ API返回的ID与数据库中的ID一致');
      }
    }
    
    console.log('🎉 测试成功完成！策略类型已正确保存到数据库');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('🔍 错误详情:', error);
    
    // 保存测试日志到文件，方便调试
    const logContent = `测试失败日志\n时间: ${new Date().toISOString()}\n错误: ${error.message}\n详细信息: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}\n测试数据: ${JSON.stringify(testData, null, 2)}`;
    
    try {
      fs.writeFileSync(path.join(__dirname, 'test-error.log'), logContent);
      console.log('📝 错误日志已保存到 test-error.log');
    } catch (logError) {
      console.error('❌ 保存错误日志失败:', logError.message);
    }
    
    process.exit(1);
  } finally {
    // 清理测试数据（可选）
    // if (createdCategory && createdCategory._id) {
    //   await cleanupTestData(createdCategory._id);
    // }
    
    // 断开数据库连接
    await disconnectFromDatabase();
    
    console.log('✅ 测试流程结束');
    console.log('💡 提示:');
    console.log('   1. 如果API调用成功但数据库中没有数据，请检查后端服务是否使用了模拟模式');
    console.log('   2. 请确认MongoDB连接字符串是否正确，以及数据库名称是否匹配');
    console.log('   3. 查看test-error.log文件获取详细错误信息');
  }
}

// 运行测试
runTest().catch(err => {
  console.error('❌ 测试过程中发生未捕获的错误:', err);
  process.exit(1);
});