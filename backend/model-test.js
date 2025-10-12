// 模型定义测试脚本 - 尝试不同的params字段定义方式

const mongoose = require('mongoose');
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

// 测试方法1: 使用嵌套Schema方式定义params
async function testNestedSchema() {
  try {
    // 定义Param子Schema
    const ParamSchema = new mongoose.Schema({
      name: String,
      type: String,
      default: String,
      description: String,
      required: Boolean
    });

    // 定义包含嵌套Schema的Template模型
    const TemplateSchema1 = new mongoose.Schema({
      name: String,
      params: [ParamSchema] // 使用嵌套Schema
    });

    const Template1 = mongoose.model('Template1', TemplateSchema1);

    // 先删除所有现有文档
    await Template1.deleteMany({});
    
    // 创建模板
    const template = new Template1({
      name: '测试模板1',
      params: [{
        name: 'param1',
        type: 'number',
        default: '10',
        description: '测试参数',
        required: true
      }]
    });
    
    await template.save();
    console.log('✅ 测试方法1成功: 使用嵌套Schema方式创建模板成功！');
    
    // 查询验证
    const savedTemplate = await Template1.findOne({ name: '测试模板1' });
    console.log('保存的模板params:', savedTemplate.params);
    console.log('params类型:', typeof savedTemplate.params);
    console.log('params[0]类型:', typeof savedTemplate.params[0]);
    
    return true;
  } catch (error) {
    console.error('❌ 测试方法1失败:', error.message);
    return false;
  }
}

// 测试方法2: 将params定义为Mixed类型
async function testMixedType() {
  try {
    // 定义将params作为Mixed类型的模型
    const TemplateSchema2 = new mongoose.Schema({
      name: String,
      params: mongoose.Schema.Types.Mixed // 使用Mixed类型
    });

    const Template2 = mongoose.model('Template2', TemplateSchema2);
    
    // 先删除所有现有文档
    await Template2.deleteMany({});

    // 创建模板
    const template = new Template2({
      name: '测试模板2',
      params: [{
        name: 'param1',
        type: 'number',
        default: '10',
        description: '测试参数',
        required: true
      }]
    });
    
    await template.save();
    console.log('✅ 测试方法2成功: 使用Mixed类型创建模板成功！');
    
    // 查询验证
    const savedTemplate = await Template2.findOne({ name: '测试模板2' });
    console.log('保存的模板params:', savedTemplate.params);
    console.log('params类型:', typeof savedTemplate.params);
    console.log('params[0]类型:', typeof savedTemplate.params[0]);
    
    return true;
  } catch (error) {
    console.error('❌ 测试方法2失败:', error.message);
    return false;
  }
}

// 测试方法3: 将params定义为Object类型数组
async function testObjectArray() {
  try {
    // 定义将params作为Object类型数组的模型
    const TemplateSchema3 = new mongoose.Schema({
      name: String,
      params: [Object] // 直接使用[Object]
    });

    const Template3 = mongoose.model('Template3', TemplateSchema3);
    
    // 先删除所有现有文档
    await Template3.deleteMany({});

    // 创建模板
    const template = new Template3({
      name: '测试模板3',
      params: [{
        name: 'param1',
        type: 'number',
        default: '10',
        description: '测试参数',
        required: true
      }]
    });
    
    await template.save();
    console.log('✅ 测试方法3成功: 使用Object数组类型创建模板成功！');
    
    // 查询验证
    const savedTemplate = await Template3.findOne({ name: '测试模板3' });
    console.log('保存的模板params:', savedTemplate.params);
    console.log('params类型:', typeof savedTemplate.params);
    console.log('params[0]类型:', typeof savedTemplate.params[0]);
    
    return true;
  } catch (error) {
    console.error('❌ 测试方法3失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('数据库连接失败，无法执行测试');
      process.exit(1);
    }

    console.log('\n===== 开始执行模型定义测试 =====');
    
    // 运行三个测试方法
    await testNestedSchema();
    console.log('\n-----------------------------');
    await testMixedType();
    console.log('\n-----------------------------');
    await testObjectArray();
    
    console.log('\n===== 测试完成 =====');

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    process.exit(0);
  } catch (error) {
    console.error('测试过程中出现严重错误:', error);
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

console.log('开始执行模型定义测试脚本');
main();