// 验证模板分类迁移是否完成
// 此脚本检查所有模板是否已正确关联到Category集合

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const Category = require('./src/models/Category');
const TemplateCategory = require('./src/models/TemplateCategory');
require('dotenv').config();

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helix', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 已成功连接到数据库');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

async function verifyTemplateCategories() {
  try {
    // 获取所有模板
    const templates = await Template.find({});
    console.log(`\n📊 发现 ${templates.length} 个模板`);
    
    // 统计信息
    const stats = {
      total: templates.length,
      validCategory: 0,
      invalidCategory: 0,
      missingCategory: 0,
      categoryDistribution: new Map()
    };
    
    // 验证每个模板的分类
    for (const template of templates) {
      if (!template.category) {
        console.warn(`⚠️  模板 ${template.name} (ID: ${template._id}) 没有设置分类`);
        stats.missingCategory++;
        continue;
      }
      
      try {
        // 检查分类是否存在于Category集合中
        const category = await Category.findById(template.category);
        if (category) {
          stats.validCategory++;
          
          // 更新分类分布统计
          const categoryName = category.name;
          const currentCount = stats.categoryDistribution.get(categoryName) || 0;
          stats.categoryDistribution.set(categoryName, currentCount + 1);
        } else {
          // 检查分类是否存在于旧的TemplateCategory集合中
          const oldCategory = await TemplateCategory.findById(template.category);
          if (oldCategory) {
            console.warn(`⚠️  模板 ${template.name} (ID: ${template._id}) 仍然引用旧的TemplateCategory集合中的分类: ${oldCategory.name}`);
            stats.invalidCategory++;
          } else {
            console.error(`❌  模板 ${template.name} (ID: ${template._id}) 引用了不存在的分类ID: ${template.category}`);
            stats.invalidCategory++;
          }
        }
      } catch (error) {
        console.error(`❌  验证模板 ${template.name} (ID: ${template._id}) 的分类时出错:`, error.message);
        stats.invalidCategory++;
      }
    }
    
    // 输出验证结果
    console.log('\n✅ 验证结果总结:');
    console.log(`   - 总模板数: ${stats.total}`);
    console.log(`   - 正确关联到Category集合的模板数: ${stats.validCategory}`);
    console.log(`   - 关联到无效分类的模板数: ${stats.invalidCategory}`);
    console.log(`   - 没有设置分类的模板数: ${stats.missingCategory}`);
    
    if (stats.categoryDistribution.size > 0) {
      console.log('\n📊 策略类型分布:');
      stats.categoryDistribution.forEach((count, categoryName) => {
        console.log(`   - ${categoryName}: ${count} 个模板`);
      });
    }
    
    // 检查是否存在任何TemplateCategory记录
    const oldCategoriesCount = await TemplateCategory.countDocuments({});
    console.log(`\n📋 TemplateCategory集合中仍有 ${oldCategoriesCount} 条记录`);
    
    // 提供建议
    console.log('\n💡 建议:');
    if (stats.invalidCategory > 0 || stats.missingCategory > 0) {
      console.log('   - 需要修复无效或缺失的分类引用');
    }
    if (oldCategoriesCount > 0) {
      console.log('   - 在确认迁移完全成功后，可以考虑删除TemplateCategory集合');
    }
    
    if (stats.validCategory === stats.total && stats.invalidCategory === 0 && stats.missingCategory === 0) {
      console.log('\n🎉 恭喜! 所有模板分类都已成功迁移到Category集合。');
      console.log('   您可以安全地删除TemplateCategory相关的文件和代码。');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
  } finally {
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('\n👋 已断开数据库连接');
  }
}

// 执行验证
async function runVerification() {
  console.log('🚀 开始验证模板分类迁移...');
  await connectToDatabase();
  await verifyTemplateCategories();
}

runVerification();