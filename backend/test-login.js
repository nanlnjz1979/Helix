const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 简单的用户测试模型
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

// 密码验证方法
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// 连接数据库并测试登录
async function testLogin() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功!');
    
    // 查找admin用户
    console.log('查找admin用户...');
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      console.log('未找到admin用户');
      await mongoose.disconnect();
      return;
    }
    
    console.log('找到用户:', {
      username: user.username,
      role: user.role,
      passwordHash: user.password
    });
    
    // 测试密码验证
    const testPassword = 'admin123';
    console.log(`验证密码: ${testPassword}`);
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('密码验证结果:', isMatch);
    
    // 如果密码不匹配，重置密码
    if (!isMatch) {
      console.log('密码不匹配，将重置密码为admin123');
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      user.password = hashedPassword;
      await user.save();
      console.log('密码重置成功!');
      
      // 再次验证
      const newMatch = await bcrypt.compare(testPassword, user.password);
      console.log('重置后的密码验证结果:', newMatch);
    }
    
    console.log('测试完成!');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB连接已关闭');
  }
}

// 运行测试
console.log('开始登录测试...');
testLogin();