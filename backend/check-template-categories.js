// 检查并初始化模板分类
exports.__esModule = true;

const mongoose = require('mongoose');
const TemplateCategory = require('./src/models/TemplateCategory');
require('dotenv').config();

// 默认模板分类数据
const defaultTemplateCategories = [
  {
    name: '趋势跟踪',
    description: '基于价格趋势的交易策略',
    isSystem: true,
    visibility: 'public'
  },
  {
    name: '均值回归',
    description: '基于价格回归均值的交易策略',
    isSystem: true,
    visibility: 'public'
  },
  {
    name: '因子策略',
    description: '基于特定因子的交易策略',
    isSystem: true,
    visibility: 'public'
  },
  {
    name: '波动率策略',
    description: '基于市场波动率的交易策略',
    isSystem: true,
    visibility: 'public'
  },
  {
    name: '多因子模型',
    description: '结合多个因子的交易策略',
    isSystem: true,
    visibility: 'public'
  }
];

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

// 检查并创建模板分类
async function checkAndCreateTemplateCategories() {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('数据库连接失败，无法初始化模板分类');
      process.exit(1);
    }

    console.log('开始检查模板分类...');
    
    // 检查每个默认分类是否存在
    for (const categoryData of defaultTemplateCategories) {
      const existingCategory = await TemplateCategory.findOne({ name: categoryData.name });
      
      if (!existingCategory) {
        console.log(`创建模板分类: ${categoryData.name}`);
        const newCategory = new TemplateCategory(categoryData);
        await newCategory.save();
        console.log(`模板分类 ${categoryData.name} 创建成功`);
      } else {
        console.log(`模板分类 ${categoryData.name} 已存在`);
        // 确保系统分类的属性正确
        if (categoryData.isSystem && !existingCategory.isSystem) {
          existingCategory.isSystem = true;
          await existingCategory.save();
          console.log(`更新模板分类 ${categoryData.name} 为系统分类`);
        }
        // 确保可见性正确
        if (categoryData.visibility !== existingCategory.visibility) {
          existingCategory.visibility = categoryData.visibility;
          await existingCategory.save();
          console.log(`更新模板分类 ${categoryData.name} 的可见性为 ${categoryData.visibility}`);
        }
      }
    }

    console.log('模板分类检查和初始化完成');
    
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
    
    return true;
  } catch (error) {
    console.error('检查和创建模板分类时出错:', error);
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

// 执行检查和创建操作
checkAndCreateTemplateCategories().then(success => {
  if (success) {
    console.log('模板分类初始化脚本执行成功');
    process.exit(0);
  } else {
    console.log('模板分类初始化脚本执行失败');
    process.exit(1);
  }
});

module.exports = { checkAndCreateTemplateCategories };