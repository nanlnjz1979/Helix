// 最简单的Template模型测试脚本

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
require('dotenv').config();

// 直接连接数据库并创建最简单的模板
async function testTemplate() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功');

    // 创建一个简单的params数组 - 非常基础的JavaScript对象数组
    const simpleParams = [];
    const param1 = {};
    param1.name = 'testParam';
    param1.type = 'number';
    param1.default = '5';
    param1.description = '测试参数';
    param1.required = true;
    simpleParams.push(param1);

    console.log('Params数组类型:', typeof simpleParams);
    console.log('Params数组内容:', simpleParams);
    console.log('Params[0]类型:', typeof simpleParams[0]);

    // 创建一个最简单的模板对象
    const templateData = {};
    templateData.name = '极简测试模板';
    templateData.description = '用于测试params字段的极简模板';
    // 使用一个已知存在的ObjectId作为category和author
    // 注意：这些ID可能需要根据实际数据库中的数据进行修改
    templateData.category = mongoose.Types.ObjectId('66e6c940d4d8d39c334321a1'); // 假设这是一个有效的分类ID
    templateData.author = mongoose.Types.ObjectId('66e6c940d4d8d39c334321a2'); // 假设这是一个有效的用户ID
    templateData.version = '1.0.0';
    templateData.source = 'official';
    templateData.status = 'published';
    templateData.code = 'function onTick() { console.log("test"); }';
    templateData.params = simpleParams;

    console.log('准备创建模板，params字段类型:', typeof templateData.params);
    console.log('准备创建模板，params[0]类型:', typeof templateData.params[0]);

    // 创建模板实例
    const template = new Template(templateData);
    
    // 尝试保存模板
    await template.save();
    console.log('模板创建成功! params字段格式正确');

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    process.exit(0);
  } catch (error) {
    console.error('创建测试模板时出错:', error);
    console.error('错误详情:', error.message);
    if (error.errors && error.errors.params) {
      console.error('Params字段错误:', error.errors.params);
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

// 执行测试
console.log('开始执行极简测试脚本');
testTemplate();