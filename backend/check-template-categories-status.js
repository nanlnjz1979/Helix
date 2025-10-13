const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
require('dotenv').config();

// MongoDB连接配置
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helix';

// 连接数据库
async function connectDB() {
  try {
    console.log(`正在连接MongoDB，连接字符串: ${mongoURI}`);
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB 连接成功');
    console.log('数据库连接状态:', mongoose.connection.readyState);
    console.log('连接的数据库名称:', mongoose.connection.name);
    return true;
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
}

// 检查模板分类状态
async function checkTemplateCategories() {
  try {
    // 1. 获取所有分类，构建ID到名称的映射
    const allCategories = await TemplateCategory.find({});
    const categoryMap = new Map();
    
    allCategories.forEach(category => {
      categoryMap.set(category._id.toString(), category.name);
    });
    
    console.log('=== 所有分类映射 ===');
    categoryMap.forEach((name, id) => {
      console.log(`${id}: ${name}`);
    });
    
    // 2. 获取所有模板，检查category字段
    const allTemplates = await Template.find({})
      .select('name category');
    
    console.log('\n=== 模板分类状态 ===');
    
    // 统计
    const stats = {
      total: 0,
      withCategory: 0,
      withoutCategory: 0,
      categoryStats: new Map()
    };
    
    allTemplates.forEach(template => {
      stats.total++;
      const categoryId = template.category ? template.category.toString() : null;
      
      if (categoryId) {
        stats.withCategory++;
        const categoryName = categoryMap.get(categoryId) || '未知分类';
        
        // 更新分类统计
        const currentCount = stats.categoryStats.get(categoryName) || 0;
        stats.categoryStats.set(categoryName, currentCount + 1);
        
        console.log(`模板: ${template.name}, 分类ID: ${categoryId}, 分类名称: ${categoryName}`);
      } else {
        stats.withoutCategory++;
        console.log(`模板: ${template.name}, 无分类`);
      }
    });
    
    // 显示统计结果
    console.log('\n=== 统计结果 ===');
    console.log(`总模板数: ${stats.total}`);
    console.log(`有分类的模板数: ${stats.withCategory}`);
    console.log(`无分类的模板数: ${stats.withoutCategory}`);
    console.log('\n各分类模板数量:');
    stats.categoryStats.forEach((count, categoryName) => {
      console.log(`${categoryName}: ${count}`);
    });
    
  } catch (error) {
    console.error('检查模板分类失败:', error);
  } finally {
    // 断开连接
    await mongoose.disconnect();
    console.log('MongoDB 连接已断开');
  }
}

// 执行主函数
async function main() {
  await connectDB();
  await checkTemplateCategories();
}

main();