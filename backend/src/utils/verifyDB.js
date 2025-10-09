const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const User = require('../models/User');
const Strategy = require('../models/Strategy');

// 连接数据库并验证数据
const verifyData = async () => {
  try {
    console.log('正在连接到MongoDB数据库...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');

    // 验证用户数据
    const users = await User.find({});
    console.log(`\n用户数量: ${users.length}`);
    console.log('用户列表:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.email}`);
    });

    // 验证策略数据
    const strategies = await Strategy.find({});
    console.log(`\n策略数量: ${strategies.length}`);
    console.log('策略列表:');
    strategies.forEach(strategy => {
      console.log(`- ${strategy.name} (${strategy.type}) - ${strategy.status}`);
      console.log(`  审核状态: ${strategy.approved ? '已通过' : '待审核'}`);
    });

    // 检查管理员用户
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      console.log('\n管理员账户存在');
    } else {
      console.log('\n警告: 管理员账户不存在');
    }

    // 检查数据库集合是否已创建
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n数据库集合:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    console.log('\n数据验证完成!');

  } catch (error) {
    console.error('数据验证失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  }
};

// 运行验证脚本
verifyData();