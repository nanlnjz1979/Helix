require('dotenv').config();
const mongoose = require('mongoose');

// 定义临时模型以处理迁移
let Template, TemplateCategory, Category;

// MongoDB连接配置
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quant_trading_platform';
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
};

// 连接数据库
async function connectToMongoDB() {
  try {
    await mongoose.connect(mongoURI, connectionOptions);
    console.log(`✅ MongoDB连接成功: ${mongoURI}`);
    console.log(`   - 数据库名称: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    return false;
  }
}

// 定义必要的模型
function defineModels() {
  try {
    // 定义Template模型（简化版，仅用于迁移）
    const TemplateSchema = new mongoose.Schema({
      name: String,
      category: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'categoryRef'
      },
      categoryRef: {
        type: String,
        enum: ['TemplateCategory', 'Category'],
        default: 'TemplateCategory'
      }
    }, { strict: false });
    Template = mongoose.model('Template', TemplateSchema);

    // 定义TemplateCategory模型（简化版）
    const TemplateCategorySchema = new mongoose.Schema({
      name: String,
      description: String
    }, { strict: false });
    TemplateCategory = mongoose.model('TemplateCategory', TemplateCategorySchema);

    // 定义Category模型（简化版）
    const CategorySchema = new mongoose.Schema({
      name: String,
      description: String
    }, { strict: false });
    Category = mongoose.model('Category', CategorySchema);

    console.log('✅ 模型定义成功');
    return true;
  } catch (error) {
    console.error('❌ 模型定义失败:', error.message);
    return false;
  }
}

// 检查TemplateCategory集合中的数据
async function checkTemplateCategoryData() {
  try {
    const categories = await TemplateCategory.find({});
    console.log(`\n📊 TemplateCategory集合中的数据 (共${categories.length}条):`);
    categories.forEach(cat => {
      console.log(`   - [${cat._id}] ${cat.name} - ${cat.description || '无描述'}`);
    });
    return categories;
  } catch (error) {
    console.error('❌ 检查TemplateCategory数据失败:', error.message);
    return [];
  }
}

// 检查Category集合中的策略类型数据
async function checkCategoryData() {
  try {
    const categories = await Category.find({});
    console.log(`\n📊 Category集合中的策略类型数据 (共${categories.length}条):`);
    categories.forEach(cat => {
      console.log(`   - [${cat._id}] ${cat.name} - ${cat.description || '无描述'}`);
    });
    return categories;
  } catch (error) {
    console.error('❌ 检查Category数据失败:', error.message);
    return [];
  }
}

// 检查Template集合中的数据
async function checkTemplateData() {
  try {
    const templates = await Template.find({}).limit(10);
    console.log(`\n📊 Template集合中的数据示例 (前10条):`);
    templates.forEach(temp => {
      console.log(`   - [${temp._id}] ${temp.name} - 分类ID: ${temp.category}`);
    });
    return templates;
  } catch (error) {
    console.error('❌ 检查Template数据失败:', error.message);
    return [];
  }
}

// 迁移模板分类数据
async function migrateTemplateCategories() {
  try {
    console.log('\n🚀 开始迁移模板分类数据...');
    
    // 1. 获取所有模板
    const templates = await Template.find({});
    console.log(`   - 找到 ${templates.length} 个模板`);
    
    // 2. 获取所有TemplateCategory
    const templateCategories = await TemplateCategory.find({});
    
    // 3. 创建名称到Category的映射
    const categoryMap = new Map();
    const existingCategories = await Category.find({});
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat);
    });
    
    // 4. 为每个模板更新分类引用
    let successCount = 0;
    let skippedCount = 0;
    
    for (const template of templates) {
      if (!template.category) {
        console.log(`   - 跳过模板 [${template._id}] ${template.name}: 无分类ID`);
        skippedCount++;
        continue;
      }
      
      // 查找原始TemplateCategory
      const originalCategory = templateCategories.find(cat => cat._id.toString() === template.category.toString());
      
      if (!originalCategory) {
        console.log(`   - 警告: 模板 [${template._id}] ${template.name} 的分类ID ${template.category} 在TemplateCategory中未找到`);
        
        // 如果分类ID不存在于TemplateCategory中，使用默认分类
        // 查找或创建默认分类
        let defaultCategory = categoryMap.get('趋势跟踪');
        if (!defaultCategory) {
          defaultCategory = await Category.create({
            name: '趋势跟踪',
            description: '默认策略类型',
            isSystem: true,
            visibility: 'public'
          });
          categoryMap.set('趋势跟踪', defaultCategory);
        }
        
        // 更新模板的分类引用
        template.category = defaultCategory._id;
        template.categoryRef = 'Category';
        await template.save();
        successCount++;
        continue;
      }
      
      // 查找或创建对应的Category
      let targetCategory = categoryMap.get(originalCategory.name.toLowerCase());
      
      if (!targetCategory) {
        // 创建新的Category
        targetCategory = await Category.create({
          name: originalCategory.name,
          description: originalCategory.description || '',
          isSystem: true,
          visibility: 'public',
          tags: originalCategory.tags || [],
          parent: originalCategory.parent || null
        });
        categoryMap.set(originalCategory.name.toLowerCase(), targetCategory);
        console.log(`   + 创建新策略类型: ${originalCategory.name}`);
      }
      
      // 更新模板的分类引用
      template.category = targetCategory._id;
      template.categoryRef = 'Category';
      await template.save();
      successCount++;
    }
    
    console.log(`\n✅ 分类迁移完成!`);
    console.log(`   - 成功迁移: ${successCount} 个模板`);
    console.log(`   - 跳过: ${skippedCount} 个模板`);
    
  } catch (error) {
    console.error('❌ 迁移模板分类数据失败:', error.message);
    throw error;
  }
}

// 验证迁移结果
async function verifyMigration() {
  try {
    console.log('\n🔍 验证迁移结果...');
    
    const templates = await Template.find({});
    const categories = await Category.find({});
    
    let validTemplates = 0;
    let invalidTemplates = 0;
    
    for (const template of templates) {
      if (template.categoryRef === 'Category') {
        // 检查Category是否存在
        const categoryExists = categories.some(cat => cat._id.toString() === template.category.toString());
        if (categoryExists) {
          validTemplates++;
        } else {
          invalidTemplates++;
          console.log(`   - 无效模板 [${template._id}] ${template.name}: 引用的分类ID ${template.category} 不存在`);
        }
      } else {
        invalidTemplates++;
        console.log(`   - 无效模板 [${template._id}] ${template.name}: 仍使用 ${template.categoryRef} 引用`);
      }
    }
    
    console.log(`\n📊 迁移验证结果:`);
    console.log(`   - 有效模板: ${validTemplates}`);
    console.log(`   - 无效模板: ${invalidTemplates}`);
    
    return validTemplates === templates.length;
  } catch (error) {
    console.error('❌ 验证迁移结果失败:', error.message);
    return false;
  }
}

// 清理不再需要的TemplateCategory模型引用
async function cleanupTemplateCategory() {
  try {
    console.log('\n🧹 清理过程...');
    
    // 从Template模型中移除categoryRef字段，因为现在所有引用都是Category
    // 注意：在生产环境中，这个操作可能需要更谨慎的处理
    // 这里仅打印信息，不执行实际删除操作
    console.log('   - 提示: 迁移完成后，可以考虑从Template模型中移除categoryRef字段');
    console.log('   - 提示: 可以保留TemplateCategory集合一段时间，确保迁移完全成功后再考虑删除');
    
  } catch (error) {
    console.error('❌ 清理过程失败:', error.message);
  }
}

// 主函数
async function main() {
  let shouldCloseConnection = false;
  
  try {
    console.log('\n===== 模板分类迁移工具 =====\n');
    
    // 1. 连接数据库
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('无法连接到数据库，迁移中止');
      return;
    }
    shouldCloseConnection = true;
    
    // 2. 定义模型
    const modelsDefined = defineModels();
    if (!modelsDefined) {
      console.error('无法定义模型，迁移中止');
      return;
    }
    
    // 3. 检查数据状态
    await checkTemplateData();
    await checkTemplateCategoryData();
    await checkCategoryData();
    
    // 4. 执行迁移
    await migrateTemplateCategories();
    
    // 5. 验证迁移
    const migrationVerified = await verifyMigration();
    
    // 6. 清理
    await cleanupTemplateCategory();
    
    console.log('\n===================================');
    console.log(migrationVerified ? '✅ 迁移成功完成！' : '⚠️ 迁移完成，但有部分验证未通过');
    console.log('===================================\n');
    
  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error.message);
    console.error('迁移已中止');
  } finally {
    // 关闭数据库连接
    if (shouldCloseConnection && mongoose.connection) {
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB连接已关闭');
      } catch (closeError) {
        console.error('❌ 关闭MongoDB连接失败:', closeError.message);
      }
    }
  }
}

// 执行主函数
main();