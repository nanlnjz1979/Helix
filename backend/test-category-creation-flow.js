// 测试策略类型创建流程脚本
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { createCategory } = require('./src/controllers/categoryController');

// 配置日志文件
const logFile = path.join(__dirname, 'test-category-flow.log');
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage);
}

// 检查环境变量
log('==== 开始测试策略类型创建流程 ====');
log(`环境变量检查：`);
log(`- MONGODB_URI 是否已设置: ${process.env.MONGODB_URI ? '是' : '否'}`);
log(`- NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);

// 尝试连接MongoDB（使用默认连接字符串以便测试）
async function testMongoDBConnection() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helix_test';
  
  try {
    log(`尝试连接MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000
    });
    log(`MongoDB连接成功! readyState: ${mongoose.connection.readyState}`);
    return true;
  } catch (error) {
    log(`MongoDB连接失败: ${error.message}`);
    log(`注意: 即使连接失败，我们也会继续测试模型加载和函数逻辑`);
    return false;
  }
}

// 手动模拟tryLoadRealModels函数
async function simulateTryLoadRealModels() {
  log('\n==== 模拟tryLoadRealModels函数 ====');
  log(`当前mongoose连接状态: ${mongoose.connection.readyState}`);

  try {
    // 尝试加载Category模型
    log('尝试加载真实Category模型...');
    const Category = require('./src/models/Category');
    log(`Category模型加载成功: ${Category ? '是' : '否'}`);
    log(`Category模型定义: ${JSON.stringify(Category.schema.paths, null, 2).substring(0, 500)}...`);

    // 尝试加载其他相关模型
    const StrategyCategory = require('./src/models/StrategyCategory');
    const CategoryChangeLog = require('./src/models/CategoryChangeLog');
    const Strategy = require('./src/models/Strategy');
    const User = require('./src/models/User');
    log(`真实模型加载结果: Category=${!!Category}, StrategyCategory=${!!StrategyCategory}, CategoryChangeLog=${!!CategoryChangeLog}, Strategy=${!!Strategy}, User=${!!User}`);

    return { success: true, models: { Category, StrategyCategory, CategoryChangeLog, Strategy, User } };
  } catch (error) {
    log(`真实模型加载失败: ${error.message}`);
    return { success: false, error };
  }
}

// 模拟createCategory函数调用
async function simulateCreateCategory(Category, modelsResult) {
  log('\n==== 模拟createCategory函数调用 ====');
  const categoryData = {
    name: '测试策略类型' + Date.now(),
    description: '这是一个测试策略类型',
    visibility: 'public'
  };
  log(`创建策略类型数据: ${JSON.stringify(categoryData)}`);

  try {
    // 先查看Category模型的状态
    log(`Category模型构造函数: ${Category.toString().substring(0, 300)}...`);
    log(`Category模型是否已连接到数据库: ${mongoose.connection.readyState === 1 ? '是' : '否'}`);

    // 使用new Category()创建实例
    log('使用new Category()创建实例...');
    const category = new Category(categoryData);
    log(`实例创建成功: ${category._id}`);
    log(`实例内容: ${JSON.stringify(category)}`);

    // 如果数据库已连接，调用save()方法
    if (mongoose.connection.readyState === 1) {
      log('调用save()方法保存到数据库...');
      const savedCategory = await category.save();
      log(`保存成功! 保存的策略类型: ${JSON.stringify(savedCategory)}`);

      // 验证数据是否存在
      log('验证数据是否存在于数据库...');
      const foundCategory = await Category.findById(savedCategory._id);
      log(`验证结果: ${foundCategory ? '存在于数据库' : '不存在于数据库'}`);
      log(`找到的数据: ${foundCategory ? JSON.stringify(foundCategory) : '无'}`);

      return { success: true, category: savedCategory };
    } else {
      log('警告: 数据库未连接，无法保存到数据库');
      return { success: false, reason: '数据库未连接' };
    }
  } catch (error) {
    log(`创建/保存失败: ${error.message}`);
    log(`错误详情: ${JSON.stringify(error)}`);
    return { success: false, error };
  }
}

// 直接调用createCategory函数进行测试
async function testRealCreateCategory() {
  log('\n==== 直接测试createCategory函数 ====');
  
  // 创建mock请求和响应对象
  const mockReq = {
    body: {
      name: '测试通过API' + Date.now(),
      description: '这是通过API创建的测试策略类型',
      visibility: 'public',
      tags: ['test', 'api']
    },
    user: {
      _id: 'test-user-id',
      username: 'testuser'
    }
  };
  
  const mockRes = {
    status: function(code) {
      log(`响应状态码: ${code}`);
      return this;
    },
    json: function(data) {
      log(`响应数据: ${JSON.stringify(data)}`);
      return this;
    },
    send: function(data) {
      log(`发送响应: ${data}`);
      return this;
    }
  };
  
  try {
    log(`调用createCategory函数，参数: ${JSON.stringify(mockReq.body)}`);
    await createCategory(mockReq, mockRes);
    log('createCategory函数调用完成');
    return { success: true };
  } catch (error) {
    log(`createCategory函数调用失败: ${error.message}`);
    log(`错误详情: ${JSON.stringify(error)}`);
    return { success: false, error };
  }
}

// 检查数据库集合
async function checkCollections() {
  log('\n==== 检查数据库集合 ====');
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    log(`数据库中的集合: ${collectionNames.join(', ')}`);
    log(`categories集合是否存在: ${collectionNames.includes('categories') ? '是' : '否'}`);
    
    if (collectionNames.includes('categories')) {
      const count = await mongoose.connection.db.collection('categories').countDocuments();
      log(`categories集合中文档数量: ${count}`);
    }
  } catch (error) {
    log(`检查集合失败: ${error.message}`);
  }
}

// 运行完整测试流程
async function runTest() {
  try {
    // 1. 连接MongoDB
    const connected = await testMongoDBConnection();
    
    // 2. 不管连接是否成功，都继续测试模型加载
    const modelsResult = await simulateTryLoadRealModels();
    
    // 3. 模拟createCategory函数调用
    if (modelsResult.success && connected) {
      const createResult = await simulateCreateCategory(modelsResult.models.Category, modelsResult);
      
      // 4. 检查数据库集合
      await checkCollections();

      // 5. 清理测试数据
      if (createResult.success) {
        try {
          log('\n==== 清理测试数据 ====');
          await modelsResult.models.Category.findByIdAndDelete(createResult.category._id);
          log(`测试数据已删除: ${createResult.category._id}`);
        } catch (cleanupError) {
          log(`清理测试数据失败: ${cleanupError.message}`);
        }
      }
    }
    
    // 6. 直接测试真实的createCategory函数
    const realTestResult = await testRealCreateCategory();

    log('\n==== 测试完成 ====');
    log('总结:');
    log(`- MongoDB连接状态: ${connected ? '成功' : '失败'}`);
    log(`- 模型加载状态: ${modelsResult.success ? '成功' : '失败'}`);
    log(`- 直接API调用状态: ${realTestResult.success ? '成功' : '失败'}`);
    
    // 如果测试中出现问题，提供建议
    if (!connected) {
      log('\n建议:');
      log('1. 请确保MongoDB服务正在运行');
      log('2. 请设置正确的MONGODB_URI环境变量');
      log('3. 检查MongoDB的连接权限和网络设置');
    }
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`);
    log(`错误详情: ${JSON.stringify(error)}`);
  } finally {
    // 断开MongoDB连接
    await mongoose.disconnect();
    log('MongoDB连接已断开');
  }
}

// 运行测试
runTest().catch(error => {
  log(`未捕获的错误: ${error.message}`);
  fs.appendFileSync(logFile, `未捕获的错误: ${error.message}\n`);
});