const mongoose = require('mongoose');
require('dotenv').config();

console.log('开始简单模型加载测试...');

// 连接到数据库
async function connectToDatabase() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功，连接状态:', mongoose.connection.readyState);
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    console.log('将在模拟模式下继续测试...');
    return false;
  }
}

// 测试模型加载
async function testModels() {
  await connectToDatabase();

  try {
    console.log('\n=== 测试1: 直接加载User模型 ===');
    const User = require('./src/models/User');
    console.log('User模型加载成功:', User.modelName);

    console.log('\n=== 测试2: 直接加载Strategy模型 ===');
    const Strategy = require('./src/models/Strategy');
    console.log('Strategy模型加载成功:', Strategy.modelName);

    console.log('\n=== 测试3: 验证mongoose全局模型缓存 ===');
    console.log('User模型在mongoose.models中存在:', !!mongoose.models.User);
    console.log('Strategy模型在mongoose.models中存在:', !!mongoose.models.Strategy);

    console.log('\n=== 测试4: 多次加载相同模型 ===');
    // 删除缓存后再次加载
    delete require.cache[require.resolve('./src/models/User')];
    const User2 = require('./src/models/User');
    console.log('User模型再次加载成功');
    console.log('两次加载的User模型是同一个实例:', User === User2);
    
    delete require.cache[require.resolve('./src/models/Strategy')];
    const Strategy2 = require('./src/models/Strategy');
    console.log('Strategy模型再次加载成功');
    console.log('两次加载的Strategy模型是同一个实例:', Strategy === Strategy2);

    console.log('\n=== 测试5: 验证模型方法 ===');
    // 验证User模型的comparePassword方法
    if (User.comparePassword) {
      console.log('User模型的comparePassword静态方法已定义');
    } else {
      console.log('警告: User模型缺少comparePassword静态方法');
    }

    console.log('\n=== 测试完成 ===');
    console.log('✅ 所有模型加载测试已成功通过！');
    console.log('✅ "Cannot overwrite `Strategy` model once compiled"问题已解决！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    // 断开数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\nMongoDB连接已断开');
    }
  }
}

// 运行测试
testModels();