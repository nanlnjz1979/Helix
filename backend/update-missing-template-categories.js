const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    console.log(`正在连接MongoDB，连接字符串: ${process.env.MONGODB_URI}`);
    await mongoose.connect(process.env.MONGODB_URI, {
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

// 更新模板分类
async function updateTemplateCategories() {
  try {
    // 获取趋势跟踪分类ID
    const trendTrackingCategory = await TemplateCategory.findOne({ name: '趋势跟踪' });
    if (!trendTrackingCategory) {
      console.error('未找到趋势跟踪分类');
      return;
    }
    
    const targetCategoryId = trendTrackingCategory._id;
    console.log(`趋势跟踪分类ID: ${targetCategoryId}`);
    
    // 找到需要更新的模板（使用未知分类ID的模板）
    const templatesToUpdate = await Template.find({ 
      category: { $ne: targetCategoryId } 
    }).select('name category');
    
    console.log(`找到 ${templatesToUpdate.length} 个需要更新分类的模板:`);
    templatesToUpdate.forEach(template => {
      console.log(`- ${template.name}, 当前分类ID: ${template.category}`);
    });
    
    // 更新模板分类
    const result = await Template.updateMany(
      { category: { $ne: targetCategoryId } },
      { $set: { category: targetCategoryId } }
    );
    
    console.log(`\n更新结果:`);
    console.log(`已更新 ${result.modifiedCount} 个模板的分类为趋势跟踪`);
    
    // 更新分类的模板数量
    const templateCount = await Template.countDocuments({ category: targetCategoryId });
    await TemplateCategory.findByIdAndUpdate(targetCategoryId, { templateCount: templateCount });
    console.log(`已更新分类模板数量为: ${templateCount}`);
    
    // 验证更新结果
    const updatedTemplates = await Template.find({}).select('name category');
    console.log('\n=== 更新后所有模板的分类状态 ===');
    updatedTemplates.forEach(template => {
      const isTrendTracking = template.category.toString() === targetCategoryId.toString();
      console.log(`- ${template.name}: ${isTrendTracking ? '趋势跟踪' : '未知分类'}`);
    });
    
  } catch (error) {
    console.error('更新模板分类失败:', error);
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await updateTemplateCategories();
  } catch (error) {
    console.error('执行过程中出错:', error);
  } finally {
    // 断开数据库连接
    try {
      await mongoose.disconnect();
      console.log('MongoDB 连接已断开');
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
  }
}

// 执行主函数
main();