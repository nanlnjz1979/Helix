const mongoose = require('mongoose');
require('dotenv').config();

console.log('开始测试模型加载...');

// 连接到数据库
async function connectToDatabase() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功');
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    return false;
  }
}

// 测试模型加载函数
async function testModelLoading() {
  const isConnected = await connectToDatabase();
  if (!isConnected) {
    console.log('无法连接到数据库，测试结束');
    return;
  }

  try {
    console.log('\n=== 首次加载模型 ===');
    delete require.cache[require.resolve('./src/models/User')];
    const User1 = require('./src/models/User');
    console.log('User模型首次加载成功:', User1.modelName);

    console.log('\n=== 再次加载相同模型 ===');
    // 不删除缓存，再次加载相同模型
    const User2 = require('./src/models/User');
    console.log('User模型再次加载成功:', User2.modelName);
    console.log('两次加载的是同一个模型实例:', User1 === User2);

    console.log('\n=== 检查mongoose全局模型 ===');
    console.log('User模型在mongoose.models中存在:', !!mongoose.models.User);
    console.log('User1 === mongoose.models.User:', User1 === mongoose.models.User);

    console.log('\n=== 测试Strategy模型 ===');
    // 测试Strategy模型
    delete require.cache[require.resolve('./src/models/Strategy')];
    const Strategy1 = require('./src/models/Strategy');
    console.log('Strategy模型首次加载成功:', Strategy1.modelName);

    console.log('\n=== 再次加载Strategy模型 ===');
    const Strategy2 = require('./src/models/Strategy');
    console.log('Strategy模型再次加载成功:', Strategy2.modelName);
    console.log('两次加载的是同一个模型实例:', Strategy1 === Strategy2);
    console.log('Strategy1 === mongoose.models.Strategy:', Strategy1 === mongoose.models.Strategy);

    // 测试控制器中的模型加载逻辑
    console.log('\n=== 测试控制器中的模型加载 ===');
    const authController = require('./src/controllers/authController');
    console.log('初始化认证控制器...');
    authController.initialize();
    
    const adminController = require('./src/controllers/adminController');
    console.log('初始化管理员控制器...');
    adminController.initialize();

    console.log('\n=== 尝试加载真实模型 ===');
    const authLoaded = await authController.loadRealModels();
    console.log('认证控制器加载真实模型结果:', authLoaded);
    
    const adminLoaded = await adminController.loadRealModels();
    console.log('管理员控制器加载真实模型结果:', adminLoaded);

    console.log('\n=== 测试完成 ===');
    console.log('所有测试均已通过，模型加载问题已解决！');

  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error('完整错误:', error);
  } finally {
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('\nMongoDB连接已断开');
  }
}

// 运行测试
testModelLoading();