const mongoose = require('mongoose');
const User = require('./src/models/User');
const Strategy = require('./src/models/Strategy');
require('dotenv').config();

// 连接数据库
async function connectToDB() {
  try {
    console.log('正在连接到MongoDB数据库...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    return false;
  }
}

// 测试用户管理功能
async function testUserManagement() {
  const isConnected = await connectToDB();
  if (!isConnected) {
    console.log('数据库连接失败，无法测试用户管理功能');
    return;
  }

  try {
    // 1. 查询所有用户
    console.log('\n1. 查询所有用户:');
    const users = await User.find({}).select('-password');
    console.log(`找到 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.email}`);
    });

    // 2. 查找admin用户
    console.log('\n2. 查找admin用户:');
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log(`找到admin用户: ${adminUser.username}`);
    } else {
      console.log('警告: 未找到admin用户');
    }

    // 3. 统计用户数量
    console.log('\n3. 统计用户数量:');
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments({ role: 'user' });
    console.log(`总用户数: ${totalUsers}`);
    console.log(`管理员用户: ${adminCount}`);
    console.log(`普通用户: ${userCount}`);

    // 4. 检查策略与用户的关联
    console.log('\n4. 检查策略与用户的关联:');
    const strategies = await Strategy.find({}).populate('user', 'username role');
    console.log(`找到 ${strategies.length} 个策略:`);
    strategies.forEach(strategy => {
      console.log(`- ${strategy.name} (创建者: ${strategy.user?.username || '未知用户'})`);
    });

    // 5. 检查数据库集合
    console.log('\n5. 检查数据库集合:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('数据库中存在的集合:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    console.log('\n测试完成! 用户管理功能已成功接入MongoDB数据库。');

  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  }
}

// 运行测试
console.log('开始测试用户管理功能...');
testUserManagement();