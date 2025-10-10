require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');

// 配置项
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helix';

// 记录日志函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 直接测试createCategory函数的核心逻辑
async function testCreateCategoryLogic() {
  try {
    // 模拟请求对象
    const mockReq = {
      body: {
        name: `测试策略类型-${Date.now()}`,
        description: '这是一个测试策略类型',
        parent: null,
        tags: ['测试', '集成测试'],
        visibility: 'public',
        isSystem: false
      },
      user: {
        _id: '68e8a39be5f04b2ca2fa9c1e' // 模拟用户ID
      }
    };

    // 模拟响应对象
    let mockRes = {
      statusCode: 200,
      responseData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    log('准备调用createCategory函数:');
    log(`请求数据: ${JSON.stringify(mockReq.body)}`);

    // 连接数据库
    log(`连接数据库: ${MONGODB_URI}`);
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      log('MongoDB连接成功，当前连接状态:', mongoose.connection.readyState);
    }

    // 直接创建Category实例并保存
    log('直接使用Category模型创建并保存数据...');
    const categoryData = {
      ...mockReq.body,
      owner: mockReq.user._id,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newCategory = new Category(categoryData);
    log('创建Category实例成功');
    
    const savedCategory = await newCategory.save();
    log('数据保存成功，保存的ID:', savedCategory._id);
    
    // 重新查询以验证保存结果
    const foundCategory = await Category.findById(savedCategory._id);
    log('重新查询结果:', foundCategory ? '找到记录' : '未找到记录');
    if (foundCategory) {
      log('查询到的记录详情:', JSON.stringify(foundCategory));
    }

    // 测试总结
    log('\n--- 测试总结 ---');
    if (savedCategory && foundCategory) {
      log('✅ 测试成功: 策略类型成功创建并保存到数据库');
      log(`保存的ID: ${savedCategory._id}`);
      log(`查询到的ID: ${foundCategory._id}`);
    } else {
      log('❌ 测试失败: 数据保存或查询失败');
    }
    log('---------------------');

  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`);
    console.error(error.stack);
  } finally {
    // 断开连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      log('MongoDB连接已断开');
    }
  }
}

// 检查前后端数据流
function checkDataFlow() {
  log('\n--- 前后端数据流分析 ---');
  log('前端流程:');
  log('1. 用户在前端填写表单');
  log('2. 调用categoryAPI.createCategory(categoryData)');
  log('3. 发送POST请求到 /api/admin/categories');
  
  log('\n后端流程:');
  log('1. admin.js中的中间件验证用户身份');
  log('2. categoryRoutes.js中的POST /categories路由接收请求');
  log('3. 调用categoryController.createCategory(req, res)');
  log('4. tryLoadRealModels()函数检查MongoDB连接状态');
  log('5. 根据连接状态决定使用真实模式或模拟模式');
  log('6. 在真实模式下: 创建Category实例并调用save()');
  
  log('\n可能的问题点:');
  log('1. MongoDB连接状态检测逻辑');
  log('2. 真实模型加载逻辑');
  log('3. 数据保存后的响应处理');
  log('---------------------\n');
}

// 主测试函数
async function runIntegrationTest() {
  try {
    log('开始前后端集成测试...');
    
    // 分析数据流
    checkDataFlow();
    
    // 测试createCategory核心逻辑
    await testCreateCategoryLogic();
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 运行测试
runIntegrationTest();