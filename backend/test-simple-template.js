// 最简单的模板测试脚本，只创建一个模板并专注于params字段格式

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功');

    // 创建admin用户（如果不存在）
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

    // 创建测试分类（如果不存在）
    let testCategory = await TemplateCategory.findOne({ name: '测试分类' });
    if (!testCategory) {
      testCategory = new TemplateCategory({
        name: '测试分类',
        description: '测试分类',
        visibility: 'public',
        isSystem: true
      });
      
      await testCategory.save();
      console.log('测试分类创建成功');
    }

    // 先删除所有现有测试模板
    await Template.deleteMany({ name: '测试模板' });
    console.log('已删除现有测试模板');

    // 定义params数组 - 使用JSON字符串然后解析的方式
    const paramsJson = JSON.stringify([
      {
        "name": "period",
        "type": "number",
        "default": "20",
        "description": "测试周期",
        "required": true
      }
    ]);
    
    const params = JSON.parse(paramsJson);
    console.log('Params数组类型:', typeof params);
    console.log('Params数组内容:', params);
    console.log('Params[0]类型:', typeof params[0]);

    // 创建最简单的模板
    const template = new Template({
      name: '测试模板',
      description: '这是一个测试模板',
      category: testCategory._id,
      version: '1.0.0',
      author: adminUser._id,
      source: 'official',
      status: 'published',
      code: 'function onTick() { console.log("Hello"); }',
      params: params // 使用解析后的params数组
    });

    // 保存模板
    await template.save();
    console.log('模板创建成功！Params字段格式正确！');

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    process.exit(0);
  } catch (error) {
    console.error('创建模板时出错:', error);
    console.error('错误详情:', error.message);
    if (error.errors) {
      console.error('错误字段详情:', JSON.stringify(error.errors, null, 2));
    }
    
    // 断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

console.log('开始执行简单模板测试');
main();