const mongoose = require('mongoose');
const User = require('../models/User');

// 连接数据库
const connectDB = async () => {
  try {
    // 实际使用时应从环境变量获取数据库连接信息
    await mongoose.connect('mongodb://localhost:27017/quant_trading_platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 创建管理员用户
const createAdminUser = async () => {
  try {
    // 检查是否已存在admin用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('管理员用户已存在，用户名: admin');
      return;
    }

    // 创建新的管理员用户
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123', // 注意：实际环境中应使用更安全的密码
      role: 'admin',
      balance: 0
    });

    await adminUser.save();
    console.log('管理员用户创建成功!');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('请在登录后及时修改密码');
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 运行脚本
const run = async () => {
  await connectDB();
  await createAdminUser();
};

run();

// 如果需要直接通过require使用
module.exports = { createAdminUser };