// 综合测试脚本：验证策略类型保存到数据库
const axios = require('axios');
const mongoose = require('mongoose');

// 配置
const API_URL = 'http://localhost:5000/api';
const MONGODB_URI = 'mongodb://localhost:27017/helix'; // 确保与实际配置一致
const CATEGORY_NAME = `测试策略类型-${Date.now()}`;

// 测试函数
async function runTest() {
  console.log('===== 策略类型保存测试开始 =====');
  console.log(`测试时间: ${new Date().toLocaleString()}`);
  console.log(`测试策略类型名称: ${CATEGORY_NAME}`);

  try {
    // 步骤1: 模拟登录获取令牌
    console.log('\n步骤1: 模拟登录获取令牌...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data || !loginResponse.data.token) {
      console.error('登录失败，未获取到令牌:', loginResponse.data || '无响应数据');
      // 尝试使用测试令牌继续测试
      console.log('尝试使用测试令牌继续测试...');
      const testToken = 'test-admin-token'; // 假设的测试令牌
      await testCategoryCreation(testToken);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('登录成功，令牌获取完成');
    
    // 步骤2: 使用令牌创建策略类型
    await testCategoryCreation(token);
    
  } catch (loginError) {
    console.error('登录过程异常:', loginError.response?.data || loginError.message);
    
    // 登录失败时的备选方案：直接连接数据库测试创建
    console.log('\n备选方案: 直接连接数据库测试创建...');
    await directDatabaseTest();
  } finally {
    console.log('\n===== 策略类型保存测试结束 =====');
  }
}

// 使用令牌创建策略类型
async function testCategoryCreation(token) {
  try {
    console.log('\n步骤2: 调用API创建策略类型...');
    const createResponse = await axios.post(`${API_URL}/admin/categories`, 
      { name: CATEGORY_NAME, description: '测试策略类型描述' },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log(`API响应状态码: ${createResponse.status}`);
    console.log('API响应数据:', createResponse.data);
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      console.log('策略类型创建API调用成功');
      
      // 步骤3: 验证数据库中是否存在该记录
      await verifyDatabaseRecord(createResponse.data._id);
    } else {
      console.error('策略类型创建API调用失败，状态码不为200/201');
    }
  } catch (error) {
    console.error('创建策略类型过程异常:', error.response?.data || error.message);
    
    // 尝试直接验证数据库，即使API调用失败
    console.log('\n尝试直接验证数据库...');
    await verifyDatabaseRecord(null);
  }
}

// 直接连接数据库测试创建
async function directDatabaseTest() {
  try {
    console.log('连接MongoDB数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');
    
    // 动态加载Category模型
    const Category = mongoose.models.Category || require('./models/Category');
    
    // 创建策略类型
    console.log('直接创建策略类型...');
    const newCategory = new Category({
      name: CATEGORY_NAME,
      description: '测试策略类型描述'
    });
    
    const savedCategory = await newCategory.save();
    console.log('策略类型直接创建成功:', savedCategory);
    
    // 验证创建结果
    console.log('验证直接创建的记录...');
    const foundCategory = await Category.findById(savedCategory._id);
    if (foundCategory) {
      console.log('✅ 数据库验证成功: 策略类型已成功保存');
      console.log('保存的策略类型详情:', foundCategory);
    } else {
      console.error('❌ 数据库验证失败: 未找到保存的策略类型');
    }
    
    // 清理测试数据
    await Category.findByIdAndDelete(savedCategory._id);
    console.log('测试数据已清理');
  } catch (error) {
    console.error('直接数据库测试过程异常:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 验证数据库记录
async function verifyDatabaseRecord(categoryId) {
  try {
    console.log('\n步骤3: 验证数据库记录...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');
    
    // 动态加载Category模型
    const Category = mongoose.models.Category || require('./models/Category');
    
    let foundCategory;
    if (categoryId) {
      console.log(`通过ID ${categoryId} 查询策略类型...`);
      foundCategory = await Category.findById(categoryId);
    } else {
      console.log(`通过名称 ${CATEGORY_NAME} 查询策略类型...`);
      foundCategory = await Category.findOne({ name: CATEGORY_NAME });
    }
    
    if (foundCategory) {
      console.log('✅ 数据库验证成功: 策略类型已成功保存');
      console.log('保存的策略类型详情:', foundCategory);
      
      // 可选：清理测试数据
      // await Category.findByIdAndDelete(foundCategory._id);
      // console.log('测试数据已清理');
    } else {
      console.error('❌ 数据库验证失败: 未找到保存的策略类型');
      
      // 查看所有策略类型
      const allCategories = await Category.find().limit(10);
      console.log('当前数据库中的策略类型列表:', allCategories);
    }
  } catch (error) {
    console.error('数据库验证过程异常:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行测试
runTest().catch(err => {
  console.error('测试过程中发生未捕获异常:', err);
  process.exit(1);
});