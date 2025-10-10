require('dotenv').config();
const mongoose = require('mongoose');

// 全局变量
let isMockMode = true;
let mockCategories = [];
let Category = null;
let StrategyCategory = null;

// 初始化模拟类别数据
function initMockCategories() {
  return [
    // 交易逻辑维度
    {
      _id: '1',
      name: '趋势跟踪',
      description: '基于价格趋势的交易策略',
      parent: null,
      tags: ['趋势', '动量'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01').toISOString()
    },
    {
      _id: '2',
      name: '均值回归',
      description: '基于价格回归均值的交易策略',
      parent: null,
      tags: ['反转', '波动'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01').toISOString()
    },
    // 更多类别...
  ];
}

// 模拟Category模型
function createMockCategoryModel() {
  const MockCategory = function(categoryData) {
    if (categoryData) {
      this._id = Date.now().toString();
      this.name = categoryData.name || '';
      this.description = categoryData.description || '';
      this.parent = categoryData.parent || null;
      this.tags = categoryData.tags || [];
      this.visibility = categoryData.visibility || 'public';
      this.isSystem = categoryData.isSystem || false;
      this.archived = categoryData.archived || false;
      this.createdAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  };

  MockCategory.find = function(query = {}) {
    const queryBuilder = {
      _query: query,
      exec: async function() {
        if (!Array.isArray(mockCategories) || mockCategories.length === 0) {
          mockCategories = initMockCategories();
        }
        
        let categories = [...mockCategories];
        
        // 简单的查询过滤
        if (query.parent !== undefined) {
          categories = categories.filter(category => category.parent === query.parent);
        }
        if (query.visibility) {
          categories = categories.filter(category => category.visibility === query.visibility);
        }
        if (query.archived !== undefined) {
          categories = categories.filter(category => category.archived === query.archived);
        }
        if (query.isSystem !== undefined) {
          categories = categories.filter(category => category.isSystem === query.isSystem);
        }
        
        return categories;
      }
    };
    
    queryBuilder.then = function(resolve, reject) {
      return this.exec().then(resolve, reject);
    };
    
    return queryBuilder;
  };

  return MockCategory;
}

// 尝试加载真实模型
async function tryLoadRealModels() {
  try {
    if (mongoose.connection.readyState === 1) {
      // 加载Category模型
      if (!Category) {
        try {
          if (mongoose.models.Category) {
            Category = mongoose.models.Category;
          } else {
            // 尝试直接定义Category模型，避免模块加载问题
            const CategorySchema = new mongoose.Schema({
              name: {
                type: String,
                required: true,
                trim: true
              },
              description: {
                type: String,
                required: false,
                default: ''
              },
              parent: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
                required: false,
                default: null
              },
              tags: [{
                type: String,
                trim: true
              }],
              visibility: {
                type: String,
                enum: ['public', 'private'],
                default: 'public'
              },
              owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false
              },
              archived: {
                type: Boolean,
                default: false
              },
              isSystem: {
                type: Boolean,
                default: false
              },
              createdAt: {
                type: Date,
                default: Date.now
              },
              updatedAt: {
                type: Date,
                default: Date.now
              }
            });
            
            Category = mongoose.model('Category', CategorySchema);
          }
        } catch (err) {
          console.error('加载Category模型失败:', err.message);
        }
      }
      
      return Category;
    }
    
    return false;
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    return false;
  }
}

// 连接MongoDB
async function connectToMongoDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quant_trading_platform';
  
  console.log('\n正在尝试连接到MongoDB:', mongoURI);
  console.log('当前环境:', process.env.NODE_ENV);
  
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000
    });
    
    console.log('MongoDB连接成功');
    console.log('数据库连接状态:', mongoose.connection.readyState);
    return true;
  } catch (err) {
    console.error('MongoDB连接失败:', err.message);
    console.log('将使用模拟数据模式');
    return false;
  }
}

// 检查策略类型数据
async function checkStrategyCategories() {
  console.log('\n===== 策略类型数据检查 =====\n');
  
  // 尝试连接MongoDB
  const connected = await connectToMongoDB();
  
  // 尝试加载真实模型
  const hasRealModels = await tryLoadRealModels();
  isMockMode = !hasRealModels;
  
  // 如果没有加载到真实模型，使用模拟模型
  if (isMockMode) {
    console.log('当前模式: 模拟数据模式');
    if (!Category) {
      mockCategories = initMockCategories();
      Category = createMockCategoryModel();
    }
  } else {
    console.log('当前模式: 真实数据库模式');
    console.log('数据库名称:', mongoose.connection.name);
    console.log('集合列表:', (await mongoose.connection.db.listCollections().toArray()).map(c => c.name));
  }
  
  // 查询所有策略类型
  console.log('\n策略类型数据列表:');
  try {
    const categories = await Category.find({ archived: false }).exec();
    if (categories.length === 0) {
      console.log('  未找到任何策略类型数据');
    } else {
      console.log(`  共找到 ${categories.length} 条策略类型数据:`);
      categories.forEach((category, index) => {
        console.log(`  ${index + 1}. [${category._id}] ${category.name} (${category.visibility})`);
        console.log(`     描述: ${category.description || '无'}`);
        console.log(`     父类别: ${category.parent || '无'}`);
        console.log(`     标签: ${category.tags && category.tags.length > 0 ? category.tags.join(', ') : '无'}`);
        console.log(`     系统类别: ${category.isSystem ? '是' : '否'}`);
        console.log('  --------------------');
      });
    }
  } catch (error) {
    console.error('查询策略类型数据时出错:', error.message);
  }
  
  // 提供相关建议
  console.log('\n===== 查看数据库中策略类型的方法 =====');
  
  if (isMockMode) {
    console.log('\n当前处于模拟数据模式，数据仅存在于内存中，不会保存到数据库。');
    console.log('要查看和使用真实数据库中的策略类型数据，请按照以下步骤操作:');
    console.log('1. 确保MongoDB服务已启动');
    console.log('2. 确保已创建名为"quant_trading_platform"的数据库（或根据配置使用其他名称）');
    console.log('3. 可以通过.env文件设置正确的MONGODB_URI环境变量');
    console.log('4. 重启后端服务，确保成功连接到MongoDB');
    console.log('5. 使用MongoDB Compass或Mongo Shell直接连接数据库查看数据');
  } else {
    console.log('\n策略类型数据存储在MongoDB数据库中:');
    console.log(`- 数据库名称: ${mongoose.connection.name}`);
    console.log('- 集合名称: categories');
    console.log('- 连接字符串:', process.env.MONGODB_URI || 'mongodb://localhost:27017/quant_trading_platform');
    
    console.log('\n推荐使用MongoDB Compass查看数据:');
    console.log('1. 下载并安装MongoDB Compass');
    console.log('2. 使用上述连接字符串连接数据库');
    console.log('3. 在左侧导航栏中选择"categories"集合');
    console.log('4. 您可以查看、查询和管理所有策略类型数据');
    
    console.log('\n也可以使用Mongo Shell命令行工具:');
    console.log('1. 打开命令行终端');
    console.log('2. 运行: mongo');
    console.log('3. 切换到对应数据库: use quant_trading_platform');
    console.log('4. 查询策略类型数据: db.categories.find().pretty()');
  }
  
  console.log('\n策略类型数据表说明:');
  console.log('- 策略类型存储在"categories"集合中');
  console.log('- 策略与策略类型的关联存储在"strategycategories"集合中');
  console.log('- 如果需要创建初始策略类型数据，可以使用test-strategy-type-creation.js脚本');
  
  // 断开数据库连接
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('\n已断开MongoDB连接');
  }
}

// 执行检查
checkStrategyCategories().catch(err => {
  console.error('检查过程中发生错误:', err);
  process.exit(1);
});