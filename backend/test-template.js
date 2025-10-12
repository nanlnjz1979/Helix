// 最简单的Template模型测试脚本

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const User = require('./src/models/User');
const TemplateCategory = require('./src/models/TemplateCategory');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 连接数据库并创建测试模板
async function testTemplate() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功');

    // 创建一个测试用户
    let testUser = await User.findOne({ username: 'testuser' });
    if (!testUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('test123', salt);
      
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        balance: 1000,
        active: true
      });
      
      await testUser.save();
      console.log('测试用户创建成功');
    }

    // 创建一个测试分类
    let testCategory = await TemplateCategory.findOne({ name: '测试分类' });
    if (!testCategory) {
      testCategory = new TemplateCategory({
        name: '测试分类',
        description: '用于测试的分类',
        visibility: 'public'
      });
      
      await testCategory.save();
      console.log('测试分类创建成功');
    }

    // 使用最基本的方式创建params数组
    const paramsArray = [];
    const paramObj = {};
    paramObj.name = 'period';
    paramObj.type = 'number';
    paramObj.default = '20';
    paramObj.description = '测试周期参数';
    paramObj.required = true;
    paramsArray.push(paramObj);

    console.log('Params数组类型:', typeof paramsArray);
    console.log('Params数组内容:', JSON.stringify(paramsArray, null, 2));
    console.log('Params[0]类型:', typeof paramsArray[0]);

    // 创建模板数据对象
    const templateObj = {
      name: '最终测试模板',
      description: '这是一个用于测试params字段的最终测试模板',
      category: testCategory._id.toString(), // 转换为字符串
      author: testUser._id.toString(),       // 转换为字符串
      version: '1.0.0',
      source: 'official',
      status: 'published',
      code: 'function onTick() { console.log("Hello from template"); }',
      params: paramsArray
    };

    console.log('模板数据准备完毕，即将创建');
    console.log('模板数据中的params字段类型:', typeof templateObj.params);
    console.log('模板数据中的params[0]类型:', typeof templateObj.params[0]);

    // 创建并保存模板
    const newTemplate = new Template(templateObj);
    await newTemplate.save();
    
    console.log('模板创建成功! 这表明params字段格式正确');
    
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    process.exit(0);
  } catch (error) {
    console.error('创建测试模板时出错:', error);
    console.error('错误详情:', error.message);
    if (error.errors) {
      console.error('错误字段详情:', JSON.stringify(error.errors, null, 2));
    }
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

console.log('开始执行测试脚本');
testTemplate();