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

// 测试密码
const testPassword = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('数据库连接失败，无法测试密码');
    return;
  }

  try {
    // 查找admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('未找到admin用户');
      return;
    }

    console.log('找到admin用户:', adminUser.username);
    console.log('用户角色:', adminUser.role);
    console.log('密码哈希:', adminUser.password);
    
    // 直接使用bcrypt验证密码
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log('使用bcrypt直接验证密码结果:', isMatch);
    
    // 使用User模型方法验证密码
    const isMatchModel = await adminUser.comparePassword(testPassword);
    console.log('使用User模型方法验证密码结果:', isMatchModel);
    
  } catch (error) {
    console.error('测试密码失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  }
};

// 运行测试脚本
testPassword();