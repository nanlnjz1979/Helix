const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 导入User模型
const User = require('../models/User');

// 连接数据库
const connectDB = async () => {
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
};

// 重置管理员密码
const resetAdminPassword = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('数据库连接失败，无法重置密码');
    return;
  }

  try {
    // 查找admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('未找到admin用户');
      return;
    }

    // 设置新密码
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log('\n管理员密码重置成功!');
    console.log('--------------------------');
    console.log('用户名: admin');
    console.log('新密码: admin123');
    console.log('--------------------------');
    
  } catch (error) {
    console.error('重置密码失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  }
};

// 运行密码重置脚本
resetAdminPassword();