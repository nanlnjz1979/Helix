const mongoose = require('mongoose');
const Template = require('./src/models/Template');
const TemplateCategory = require('./src/models/TemplateCategory');
const User = require('./src/models/User');
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

// 确保管理员用户存在
async function ensureAdminUserExists() {
  try {
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('创建管理员用户...');
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123', // 实际环境中应该使用哈希密码
        role: 'admin',
        balance: 0
      });
      await adminUser.save();
      console.log('管理员用户创建成功');
    } else {
      console.log('管理员用户已存在');
    }
    
    return adminUser._id;
  } catch (error) {
    console.error('确保管理员用户存在失败:', error);
    throw error;
  }
}

// 获取趋势跟踪分类ID
async function getTrendTrackingCategoryId() {
  try {
    const category = await TemplateCategory.findOne({ name: '趋势跟踪' });
    if (!category) {
      throw new Error('未找到趋势跟踪分类');
    }
    console.log(`找到趋势跟踪分类，ID: ${category._id}`);
    return category._id;
  } catch (error) {
    console.error('获取趋势跟踪分类ID失败:', error);
    throw error;
  }
}

// 创建测试模板
async function createTestTemplates(adminUserId, trendTrackingCategoryId) {
  try {
    const templatesToCreate = [
      {
        name: 'MACD趋势策略',
        description: '基于MACD指标的趋势跟踪策略',
        category: trendTrackingCategoryId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        code: 'function onTick() { console.log("MACD策略执行"); }',
        params: [
          { name: 'fastPeriod', type: 'number', default: 12, description: '快线周期' },
          { name: 'slowPeriod', type: 'number', default: 26, description: '慢线周期' },
          { name: 'signalPeriod', type: 'number', default: 9, description: '信号线周期' }
        ],
        metadata: { language: 'javascript', platform: 'helix' },
        settings: { backtestPeriod: '30d' },
        riskLevel: 'medium',
        isPaid: false,
        price: 0
      },
      {
        name: 'RSI超买超卖策略',
        description: '基于RSI指标的超买超卖策略',
        category: trendTrackingCategoryId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        code: 'function onTick() { console.log("RSI策略执行"); }',
        params: [
          { name: 'period', type: 'number', default: 14, description: 'RSI周期' },
          { name: 'overbought', type: 'number', default: 70, description: '超买阈值' },
          { name: 'oversold', type: 'number', default: 30, description: '超卖阈值' }
        ],
        metadata: { language: 'javascript', platform: 'helix' },
        settings: { backtestPeriod: '30d' },
        riskLevel: 'medium',
        isPaid: false,
        price: 0
      },
      {
        name: '简单移动平均线',
        description: '基于简单移动平均线的趋势策略',
        category: trendTrackingCategoryId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        code: 'function onTick() { console.log("SMA策略执行"); }',
        params: [
          { name: 'fastPeriod', type: 'number', default: 5, description: '短期均线周期' },
          { name: 'slowPeriod', type: 'number', default: 10, description: '长期均线周期' }
        ],
        metadata: { language: 'javascript', platform: 'helix' },
        settings: { backtestPeriod: '30d' },
        riskLevel: 'low',
        isPaid: false,
        price: 0
      },
      {
        name: '布林带突破策略',
        description: '基于布林带的突破策略',
        category: trendTrackingCategoryId,
        version: '1.0.0',
        author: adminUserId,
        source: 'official',
        status: 'published',
        code: 'function onTick() { console.log("布林带策略执行"); }',
        params: [
          { name: 'period', type: 'number', default: 20, description: '均线周期' },
          { name: 'stdDev', type: 'number', default: 2, description: '标准差倍数' }
        ],
        metadata: { language: 'javascript', platform: 'helix' },
        settings: { backtestPeriod: '30d' },
        riskLevel: 'medium',
        isPaid: false,
        price: 0
      }
    ];
    
    console.log('开始创建测试模板...');
    const createdTemplates = [];
    
    for (const templateData of templatesToCreate) {
      // 检查模板是否已存在
      const existingTemplate = await Template.findOne({ name: templateData.name });
      if (existingTemplate) {
        console.log(`模板 ${templateData.name} 已存在，跳过创建`);
        createdTemplates.push(existingTemplate);
        continue;
      }
      
      // 创建新模板
      const template = new Template(templateData);
      await template.save();
      console.log(`模板 ${templateData.name} 创建成功，ID: ${template._id}`);
      createdTemplates.push(template);
    }
    
    return createdTemplates;
  } catch (error) {
    console.error('创建测试模板失败:', error);
    throw error;
  }
}

// 更新分类的模板数量
async function updateCategoryTemplateCount(categoryId) {
  try {
    const count = await Template.countDocuments({ category: categoryId });
    await TemplateCategory.findByIdAndUpdate(categoryId, { templateCount: count });
    console.log(`已更新分类模板数量为: ${count}`);
  } catch (error) {
    console.error('更新分类模板数量失败:', error);
  }
}

// 主函数
async function main() {
  try {
    // 连接数据库
    const connected = await connectDB();
    if (!connected) {
      console.error('数据库连接失败，无法初始化模板');
      return;
    }
    
    // 确保管理员用户存在
    const adminUserId = await ensureAdminUserExists();
    
    // 获取趋势跟踪分类ID
    const trendTrackingCategoryId = await getTrendTrackingCategoryId();
    
    // 创建测试模板
    const createdTemplates = await createTestTemplates(adminUserId, trendTrackingCategoryId);
    
    // 更新分类的模板数量
    await updateCategoryTemplateCount(trendTrackingCategoryId);
    
    console.log('\n=== 初始化测试模板完成 ===');
    console.log(`共创建/找到 ${createdTemplates.length} 个模板`);
    console.log('模板列表:');
    createdTemplates.forEach(template => {
      console.log(`- ${template.name} (ID: ${template._id})`);
    });
    
  } catch (error) {
    console.error('初始化测试模板时出错:', error);
  } finally {
    // 断开数据库连接
    try {
      await mongoose.disconnect();
      console.log('MongoDB连接已断开');
    } catch (disconnectError) {
      console.error('断开MongoDB连接失败:', disconnectError);
    }
  }
}

// 执行主函数
main();