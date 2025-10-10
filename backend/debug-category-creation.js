const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 记录日志到文件
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('debug-category.log', logMessage);
  console.log(logMessage);
}

// 测试函数
async function runDebugTest() {
  logToFile('===== 开始调试策略类型创建问题 =====');
  
  // 1. 检查环境变量
  logToFile(`环境变量检查:`);
  logToFile(`- MONGODB_URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
  logToFile(`- NODE_ENV: ${process.env.NODE_ENV}`);
  
  // 2. 检查mongoose连接状态
  logToFile('\n检查mongoose连接状态:');
  logToFile(`- 初始readyState: ${mongoose.connection.readyState}`);
  
  // 尝试直接连接MongoDB
  try {
    logToFile('\n尝试直接连接MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    logToFile('MongoDB连接成功!');
    logToFile(`连接后的readyState: ${mongoose.connection.readyState}`);
    logToFile(`连接的数据库名称: ${mongoose.connection.name}`);
    
    // 3. 检查模型定义
    logToFile('\n检查Category模型...');
    let Category;
    try {
      // 删除缓存，确保重新加载模型
      delete require.cache[require.resolve('./src/models/Category')];
      Category = require('./src/models/Category');
      logToFile('Category模型加载成功');
      logToFile(`Category模型是否已注册: ${!!mongoose.models.Category}`);
    } catch (err) {
      logToFile(`Category模型加载失败: ${err.message}`);
    }
    
    // 4. 直接使用模型创建策略类型
    if (Category && mongoose.connection.readyState === 1) {
      logToFile('\n尝试直接使用Category模型创建策略类型...');
      const testCategory = {
        name: `测试策略类型_${Date.now()}`,
        description: '用于调试的测试策略类型',
        parent: null,
        tags: ['测试', '调试'],
        visibility: 'public',
        isSystem: false,
        owner: 'test-user-id',
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      try {
        const created = await Category.create(testCategory);
        logToFile('策略类型创建成功!');
        logToFile(`创建的策略类型ID: ${created._id}`);
        
        // 验证创建结果
        const found = await Category.findById(created._id);
        if (found) {
          logToFile('验证成功: 可以在数据库中查询到刚创建的策略类型');
          logToFile(`查询结果: ${JSON.stringify(found, null, 2)}`);
        } else {
          logToFile('验证失败: 无法在数据库中查询到刚创建的策略类型');
        }
      } catch (err) {
        logToFile(`创建策略类型失败: ${err.message}`);
        logToFile(`完整错误: ${JSON.stringify(err, null, 2)}`);
      }
    }
    
    // 5. 检查数据库集合
    logToFile('\n检查数据库集合...');
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      logToFile(`数据库中的集合数量: ${collections.length}`);
      logToFile('集合列表:');
      collections.forEach(col => logToFile(`- ${col.name}`));
      
      // 检查categories集合是否存在
      const hasCategoriesCollection = collections.some(col => col.name === 'categories');
      logToFile(`categories集合存在: ${hasCategoriesCollection}`);
      
      // 如果存在categories集合，查询其内容
      if (hasCategoriesCollection) {
        const categoriesCount = await mongoose.connection.db.collection('categories').countDocuments();
        logToFile(`categories集合中的文档数量: ${categoriesCount}`);
        
        if (categoriesCount > 0) {
          const sampleCategories = await mongoose.connection.db.collection('categories')
            .find({}).limit(5).toArray();
          logToFile('categories集合中的前5个文档:');
          sampleCategories.forEach(cat => logToFile(`- ${cat.name} (ID: ${cat._id})`));
        }
      }
    } catch (err) {
      logToFile(`查询数据库集合失败: ${err.message}`);
    }
  } catch (connError) {
    logToFile(`MongoDB连接失败: ${connError.message}`);
    logToFile(`完整连接错误: ${JSON.stringify(connError, null, 2)}`);
    
    // 检查是否有网络问题或连接字符串问题
    logToFile('\n可能的问题原因:');
    if (!process.env.MONGODB_URI) {
      logToFile('- MONGODB_URI环境变量未设置');
    } else if (process.env.MONGODB_URI.includes('localhost')) {
      logToFile('- 连接字符串指向localhost，请确认MongoDB服务已启动');
    }
  }
  
  // 6. 检查categoryController.js中的问题
  logToFile('\n检查categoryController.js中的关键逻辑...');
  try {
    const controllerPath = path.join(__dirname, 'src', 'controllers', 'categoryController.js');
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    
    // 检查tryLoadRealModels函数中的readyState判断
    const readyStateCheck = controllerContent.includes('mongoose.connection.readyState === 1');
    logToFile(`tryLoadRealModels函数中使用readyState === 1判断连接状态: ${readyStateCheck}`);
    
    // 检查createCategory函数中的保存逻辑
    const hasNewCategorySave = controllerContent.includes('await newCategory.save()');
    logToFile(`createCategory函数中有正确的save调用: ${hasNewCategorySave}`);
  } catch (err) {
    logToFile(`读取categoryController.js失败: ${err.message}`);
  }
  
  logToFile('\n===== 调试结束 =====');
  
  // 断开连接
  await mongoose.disconnect();
  logToFile('已断开与MongoDB的连接');
}

// 运行测试
runDebugTest().catch(err => {
  logToFile(`测试执行出错: ${err.message}`);
  process.exit(1);
});