// 测试Template模型的params字段格式

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 连接数据库
async function connectDB() {
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

// 创建测试模板
async function createTestTemplate() {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('数据库连接失败');
      process.exit(1);
    }

    // 查找或创建测试分类
    let testCategory = await TemplateCategory.findOne({ name: '测试分类' });
    if (!testCategory) {
      testCategory = new TemplateCategory({
        name: '测试分类',
        description: '用于测试的模板分类',
        visibility: 'public',
        isSystem: false
      });
      await testCategory.save();
      console.log('测试分类创建成功');
    }

    // 查找或创建admin用户
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        balance: 0,
        active: true
      });
      
      await adminUser.save();
      console.log('默认admin用户创建成功');
    }

    // 删除现有的测试模板
    await Template.deleteOne({ name: '测试模板' });
    console.log('已删除现有测试模板');

    // 创建新的测试模板 - 简化版，重点测试params字段
    const testTemplate = new Template({
      name: '测试模板',
      description: '用于测试params字段格式的模板',
      category: testCategory._id,
      version: '1.0.0',
      author: adminUser._id,
      source: 'official',
      status: 'published',
      isSystemTemplate: false,
      code: "function onTick() { console.log('test'); }",
      params: [
        { name: 'param1', type: 'number', default: '10', description: '测试参数1', required: true },
        { name: 'param2', type: 'string', default: 'test', description: '测试参数2', required: false }
      ]
    });

    await testTemplate.save();
    console.log('测试模板创建成功! params字段格式正确');

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    process.exit(0);
  } catch (error) {
    console.error('创建测试模板时出错:', error);
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

// 执行测试
createTestTemplate();