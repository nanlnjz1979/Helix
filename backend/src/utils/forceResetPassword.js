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

// 强制重置密码
const forceResetPassword = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('数据库连接失败，无法重置密码');
    return;
  }

  try {
    // 设置新密码
    const newPassword = 'admin123';
    console.log(`准备将密码设置为: ${newPassword}`);
    
    // 生成密码哈希
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('生成的密码哈希:', hashedPassword);
    
    // 使用findOneAndUpdate直接更新数据库
    const result = await User.findOneAndUpdate(
      { username: 'admin' },
      { password: hashedPassword },
      { new: true, useFindAndModify: false }
    );
    
    if (!result) {
      console.log('未找到admin用户，尝试创建一个新的admin用户');
      // 创建新的admin用户
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: newPassword, // 让预保存钩子自动哈希密码
        role: 'admin',
        balance: 0
      });
      await adminUser.save();
      console.log('新的admin用户创建成功');
    } else {
      console.log('admin用户密码已更新');
      console.log('更新后的密码哈希:', result.password);
      
      // 立即验证更新后的密码
      const isMatch = await bcrypt.compare(newPassword, result.password);
      console.log('更新后密码验证结果:', isMatch);
    }
    
    console.log('\n密码重置完成!');
    console.log('--------------------------');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('--------------------------');
    
  } catch (error) {
    console.error('重置密码失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  }
};

// 运行强制重置脚本
forceResetPassword();