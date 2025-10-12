// 模板数据初始化脚本 - 使用测试成功的方法创建模板

const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
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

// 查找或创建默认admin用户
async function findOrCreateAdminUser() {
  try {
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // 创建admin用户
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
    
    return adminUser._id;
  } catch (error) {
    console.error('查找或创建admin用户时出错:', error.message);
    throw error;
  }
}

// 查找或创建模板分类
async function findOrCreateCategory(categoryName) {
  try {
    let category = await TemplateCategory.findOne({ name: categoryName });
    
    if (!category) {
      category = new TemplateCategory({
        name: categoryName,
        description: `${categoryName}模板分类`,
        visibility: 'public',
        isSystem: true
      });
      
      await category.save();
      console.log(`分类 ${categoryName} 创建成功`);
    }
    
    return category._id;
  } catch (error) {
    console.error(`查找或创建分类 ${categoryName} 时出错:`, error.message);
    throw error;
  }
}

// 使用分步保存法创建模板（先保存基本信息，再添加params字段）
async function createTemplateWithParams(templateData, paramsData) {
  try {
    // 1. 先检查模板是否已存在
    const existingTemplate = await Template.findOne({ name: templateData.name });
    if (existingTemplate) {
      console.log(`模板 ${templateData.name} 已存在，跳过创建`);
      
      // 如果存在但没有params字段，则添加params字段
      if (!existingTemplate.params || existingTemplate.params.length === 0) {
        await Template.updateOne(
          { _id: existingTemplate._id },
          { $set: { params: paramsData } }
        );
        console.log(`已为模板 ${templateData.name} 添加params字段`);
      }
      
      return true;
    }

    // 2. 创建模板基本信息（不含params字段）
    const templateWithoutParams = { ...templateData };
    delete templateWithoutParams.params; // 移除params字段
    
    const newTemplate = new Template(templateWithoutParams);
    const savedTemplate = await newTemplate.save();
    console.log(`模板 ${templateData.name} 基本信息创建成功`);

    // 3. 使用updateOne方法添加params字段（绕过mongoose验证）
    await Template.updateOne(
      { _id: savedTemplate._id },
      { $set: { params: paramsData } }
    );
    console.log(`已为模板 ${templateData.name} 添加params字段`);

    return true;
  } catch (error) {
    console.error(`创建模板 ${templateData.name} 时出错:`, error.message);
    return false;
  }
}

// 初始化模板数据
async function initializeTemplates() {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('数据库连接失败，无法初始化模板');
      process.exit(1);
    }

    // 获取或创建admin用户ID
    const adminUserId = await findOrCreateAdminUser();
    
    // 获取或创建必要的分类ID
    const trendFollowingId = await findOrCreateCategory('趋势跟踪');
    const meanReversionId = await findOrCreateCategory('均值回归');
    const momentumId = await findOrCreateCategory('动量策略');

    // 定义模板数据
    const templates = [
      {
        name: '简单移动平均线交叉策略',
        description: '基于短期和长期移动平均线交叉的交易策略',
        category: trendFollowingId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        isSystemTemplate: true,
        code: 'function onTick() { const prices = getHistoryPrices(period); if (prices.length < period) return; const shortMA = calculateSMA(prices, shortPeriod); const longMA = calculateSMA(prices, longPeriod); if (shortMA > longMA && !hasOpenPosition()) { buy(1); } else if (shortMA < longMA && hasOpenPosition()) { sell(); } }',
        params: [
          { name: 'shortPeriod', type: 'number', default: '10', description: '短期移动平均线周期', required: true },
          { name: 'longPeriod', type: 'number', default: '30', description: '长期移动平均线周期', required: true },
          { name: 'period', type: 'number', default: '50', description: '历史数据周期', required: true }
        ]
      },
      {
        name: 'RSI超买超卖策略',
        description: '基于相对强弱指标(RSI)的超买超卖交易策略',
        category: meanReversionId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        isSystemTemplate: true,
        code: 'function onTick() { const prices = getHistoryPrices(period); if (prices.length < period) return; const rsi = calculateRSI(prices, rsiPeriod); if (rsi < oversoldLevel && !hasOpenPosition()) { buy(1); } else if (rsi > overboughtLevel && hasOpenPosition()) { sell(); } }',
        params: [
          { name: 'rsiPeriod', type: 'number', default: '14', description: 'RSI计算周期', required: true },
          { name: 'overboughtLevel', type: 'number', default: '70', description: '超买阈值', required: true },
          { name: 'oversoldLevel', type: 'number', default: '30', description: '超卖阈值', required: true },
          { name: 'period', type: 'number', default: '50', description: '历史数据周期', required: true }
        ]
      },
      {
        name: 'MACD趋势策略',
        description: '基于移动平均收敛发散指标(MACD)的趋势跟踪策略',
        category: momentumId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'reviewing',
        isSystemTemplate: true,
        code: 'function onTick() { const prices = getHistoryPrices(period); if (prices.length < period) return; const macdData = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod); const { macd, signal } = macdData[macdData.length - 1]; if (macd > signal && !hasOpenPosition()) { buy(1); } else if (macd < signal && hasOpenPosition()) { sell(); } }',
        params: [
          { name: 'fastPeriod', type: 'number', default: '12', description: '快线周期', required: true },
          { name: 'slowPeriod', type: 'number', default: '26', description: '慢线周期', required: true },
          { name: 'signalPeriod', type: 'number', default: '9', description: '信号线周期', required: true },
          { name: 'period', type: 'number', default: '100', description: '历史数据周期', required: true }
        ]
      }
    ];

    console.log(`开始创建 ${templates.length} 个模板...`);
    
    // 逐个创建模板
    let allSuccess = true;
    for (const template of templates) {
      const paramsData = template.params;
      const success = await createTemplateWithParams(template, paramsData);
      if (!success) {
        allSuccess = false;
      }
    }

    // 查询创建的模板进行验证
    const createdTemplates = await Template.find({ source: 'official' });
    console.log(`\n模板初始化完成！共创建/更新了 ${createdTemplates.length} 个官方模板`);
    
    // 打印每个模板的params字段信息
    createdTemplates.forEach(template => {
      console.log(`\n模板: ${template.name}`);
      console.log(`- ID: ${template._id}`);
      console.log(`- Params字段: ${template.params ? '存在' : '不存在'}`);
      if (template.params && template.params.length > 0) {
        console.log(`- Params数量: ${template.params.length}`);
        console.log(`- 第一个参数: ${template.params[0].name} (${template.params[0].type})`);
      }
    });

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('\nMongoDB连接已断开');
    
    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('初始化模板数据时出错:', error.message);
    
    // 尝试断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
    
    process.exit(1);
  }
}

// 执行初始化
console.log('开始执行模板数据初始化脚本');
initializeTemplates();