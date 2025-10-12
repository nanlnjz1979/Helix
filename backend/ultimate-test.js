// 终极测试脚本 - 直接在脚本中定义模型，完全绕过现有模型定义

const mongoose = require('mongoose');
require('dotenv').config();

// 直接在脚本中定义一个简单的Template模型
const SimpleTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // 明确指定params为对象数组
  params: [{ 
    name: String,
    type: String,
    default: String,
    description: String,
    required: Boolean
  }]
});

const SimpleTemplate = mongoose.model('SimpleTemplate', SimpleTemplateSchema);

async function main() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功');

    // 先删除所有现有的测试文档
    await SimpleTemplate.deleteMany({});
    console.log('已删除所有现有测试文档');

    // 测试1: 使用基本的对象数组方式
    try {
      const template1 = new SimpleTemplate({
        name: '测试模板1',
        params: [
          { 
            name: 'param1',
            type: 'number',
            default: '10',
            description: '参数1',
            required: true 
          }
        ]
      });
      await template1.save();
      console.log('✅ 测试1成功：使用基本对象数组方式创建模板成功！');
    } catch (error) {
      console.error('❌ 测试1失败:', error.message);
    }

    // 测试2: 使用JSON.parse方式创建params数组
    try {
      const paramsJson = JSON.stringify([
        { 
          "name": "param2",
          "type": "number",
          "default": "20",
          "description": "参数2",
          "required": true 
        }
      ]);
      const params = JSON.parse(paramsJson);
      
      const template2 = new SimpleTemplate({
        name: '测试模板2',
        params: params
      });
      await template2.save();
      console.log('✅ 测试2成功：使用JSON.parse方式创建模板成功！');
    } catch (error) {
      console.error('❌ 测试2失败:', error.message);
    }

    // 测试3: 使用单独创建对象并push的方式
    try {
      const paramsArray = [];
      const paramObj = {};
      paramObj.name = 'param3';
      paramObj.type = 'string';
      paramObj.default = 'test';
      paramObj.description = '参数3';
      paramObj.required = false;
      paramsArray.push(paramObj);
      
      const template3 = new SimpleTemplate({
        name: '测试模板3',
        params: paramsArray
      });
      await template3.save();
      console.log('✅ 测试3成功：使用push方式创建模板成功！');
    } catch (error) {
      console.error('❌ 测试3失败:', error.message);
    }

    // 查询所有创建的模板，验证params字段
    const templates = await SimpleTemplate.find({});
    console.log(`\n共查询到 ${templates.length} 个模板文档`);
    templates.forEach((template, index) => {
      console.log(`\n模板${index + 1}: ${template.name}`);
      console.log(`Params类型: ${typeof template.params}`);
      console.log(`Params长度: ${template.params.length}`);
      if (template.params.length > 0) {
        console.log(`Params[0]类型: ${typeof template.params[0]}`);
        console.log(`Params[0]内容:`, template.params[0]);
      }
    });

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('\nMongoDB连接已断开');
    console.log('\n测试完成！');
    process.exit(0);
  } catch (error) {
    console.error('测试过程中出现错误:', error);
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

console.log('开始执行终极测试...');
main();