require('dotenv').config();
const mongoose = require('mongoose');

// 确保模型定义稳定的方式
let Category;

// 初始化模拟类别数据
function initMockCategories() {
  return [
    // 交易逻辑维度
    {
      name: '趋势跟踪',
      description: '基于价格趋势的交易策略',
      parent: null,
      tags: ['趋势', '动量'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      // 保留原始ID用于建立父子关系
      originalId: '1'
    },
    {
      name: '均值回归',
      description: '基于价格回归均值的交易策略',
      parent: null,
      tags: ['反转', '波动'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '2'
    },
    {
      name: '套利策略',
      description: '利用市场定价差异获利的策略',
      parent: null,
      tags: ['低风险', '对冲'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '3'
    },
    // 交易品种维度
    {
      name: '股票策略',
      description: '针对股票市场的交易策略',
      parent: null,
      tags: ['权益类', '基本面'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '4'
    },
    {
      name: '期货策略',
      description: '针对期货市场的交易策略',
      parent: null,
      tags: ['衍生品', '杠杆'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '5'
    },
    // 子类别示例
    {
      name: '多因子选股',
      description: '基于多个因子的股票选择策略',
      parent: '4', // 使用原始ID引用父类别
      tags: ['量化', '基本面'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-02'),
      originalId: '6'
    },
    {
      name: '市值因子策略',
      description: '基于市值因子的选股策略',
      parent: '6', // 使用原始ID引用父类别
      tags: ['大小盘', '风格'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-03'),
      originalId: '7'
    },
    // 风险等级维度
    {
      name: '高风险策略',
      description: '风险较高、波动较大的策略',
      parent: null,
      tags: ['高收益', '高波动'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '8'
    },
    {
      name: '中风险策略',
      description: '风险中等的策略',
      parent: null,
      tags: ['平衡', '稳健'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '9'
    },
    {
      name: '低风险策略',
      description: '风险较低、波动较小的策略',
      parent: null,
      tags: ['保本', '低波动'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '10'
    },
    // 时间周期维度
    {
      name: '高频策略',
      description: '超短期、高频率的交易策略',
      parent: null,
      tags: ['技术', '高频数据'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '11'
    },
    {
      name: '日内策略',
      description: '在一天内完成交易的策略',
      parent: null,
      tags: ['技术', '盘中'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '12'
    },
    {
      name: '日线级策略',
      description: '以日线为时间周期的策略',
      parent: null,
      tags: ['趋势', '中期'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '13'
    },
    {
      name: '周线级策略',
      description: '以周线为时间周期的策略',
      parent: null,
      tags: ['趋势', '长期'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '14'
    },
    // 属性标签类别
    {
      name: '适用于牛市',
      description: '在牛市环境下表现较好的策略',
      parent: null,
      tags: ['市场环境'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '15'
    },
    {
      name: '需高频数据',
      description: '需要高频数据支持的策略',
      parent: null,
      tags: ['数据需求'],
      visibility: 'public',
      isSystem: true,
      archived: false,
      createdAt: new Date('2023-01-01'),
      originalId: '16'
    }
  ];
}

// 连接到数据库
async function connectToDatabase() {
  try {
    console.log('正在连接到MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB连接成功，连接状态:', mongoose.connection.readyState);
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    console.log('请检查.env文件中的MONGODB_URI配置');
    return false;
  }
}

// 加载Category模型
async function loadCategoryModel() {
  try {
    // 首先尝试从mongoose.models获取已注册的模型
    if (mongoose.models && mongoose.models.Category) {
      Category = mongoose.models.Category;
      console.log('Category模型: 从缓存获取成功');
    } else {
      // 直接加载Category模型
      Category = require('./src/models/Category');
      console.log('Category模型: 直接加载成功');
    }
    
    // 验证模型是否有效
    if (!Category || typeof Category.create !== 'function') {
      console.error('Category模型无效或缺少create方法');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Category模型加载失败:', error.message);
    return false;
  }
}

// 清除现有类别数据
async function clearExistingCategories() {
  try {
    // 先检查是否有已存在的系统类别
    const existingSystemCategories = await Category.find({ isSystem: true });
    console.log(`发现${existingSystemCategories.length}个已存在的系统类别`);
    
    if (existingSystemCategories.length > 0) {
      // 删除已存在的系统类别
      const deleteResult = await Category.deleteMany({ isSystem: true });
      console.log(`已删除${deleteResult.deletedCount}个系统类别`);
    }
    
    return true;
  } catch (error) {
    console.error('清除现有类别数据失败:', error.message);
    return false;
  }
}

// 初始化类别数据
async function initCategories() {
  try {
    const mockCategories = initMockCategories();
    
    // 先处理根类别（没有parent的类别）
    const rootCategories = mockCategories.filter(cat => !cat.parent);
    console.log(`准备初始化${rootCategories.length}个根类别`);
    
    const createdRootCategories = await Promise.all(
      rootCategories.map(async (cat) => {
        try {
          // 不手动转换_id，让MongoDB自动生成
          const categoryData = {
            name: cat.name,
            description: cat.description,
            parent: null,
            tags: cat.tags,
            visibility: cat.visibility,
            isSystem: cat.isSystem,
            archived: cat.archived,
            createdAt: cat.createdAt,
            updatedAt: cat.createdAt
          };
          
          const createdCategory = await Category.create(categoryData);
          console.log(`已创建根类别: ${createdCategory.name}`);
          return {
            originalId: cat.originalId,
            _id: createdCategory._id
          };
        } catch (error) {
          console.error(`创建类别${cat.name}失败:`, error.message);
          return null;
        }
      })
    );
    
    // 创建原始ID到MongoDB ObjectId的映射
    const categoryIdMap = new Map(
      createdRootCategories
        .filter(cat => cat)
        .map(cat => [cat.originalId, cat._id])
    );
    
    // 再处理子类别
    const childCategories = mockCategories.filter(cat => cat.parent);
    console.log(`准备初始化${childCategories.length}个子类别`);
    
    // 先创建第一级子类别（直接连接到根类别的子类别）
    const firstLevelChildren = childCategories.filter(cat => {
      // 查找父类别是否是根类别
      const parentCategory = mockCategories.find(p => p.originalId === cat.parent);
      return parentCategory && !parentCategory.parent;
    });
    
    const createdFirstLevelChildren = await Promise.all(
      firstLevelChildren.map(async (cat) => {
        try {
          // 查找父类别对应的ObjectId
          const parentObjectId = categoryIdMap.get(cat.parent);
          if (!parentObjectId) {
            console.warn(`跳过创建第一级子类别${cat.name}: 父类别${cat.parent}不存在`);
            return null;
          }
          
          // 不手动转换_id，让MongoDB自动生成
          const categoryData = {
            name: cat.name,
            description: cat.description,
            parent: parentObjectId,
            tags: cat.tags,
            visibility: cat.visibility,
            isSystem: cat.isSystem,
            archived: cat.archived,
            createdAt: cat.createdAt,
            updatedAt: cat.createdAt
          };
          
          const createdCategory = await Category.create(categoryData);
          console.log(`已创建第一级子类别: ${createdCategory.name} (父类别: ${cat.parent})`);
          // 添加到映射中
          categoryIdMap.set(cat.originalId, createdCategory._id);
          return {
            originalId: cat.originalId,
            _id: createdCategory._id
          };
        } catch (error) {
          console.error(`创建第一级子类别${cat.name}失败:`, error.message);
          return null;
        }
      })
    );
    
    // 再创建第二级子类别（连接到子类别的子类别）
    const secondLevelChildren = childCategories.filter(cat => {
      // 查找父类别是否是子类别
      const parentCategory = mockCategories.find(p => p.originalId === cat.parent);
      return parentCategory && parentCategory.parent;
    });
    
    const createdSecondLevelChildren = await Promise.all(
      secondLevelChildren.map(async (cat) => {
        try {
          // 查找父类别对应的ObjectId
          const parentObjectId = categoryIdMap.get(cat.parent);
          if (!parentObjectId) {
            console.warn(`跳过创建第二级子类别${cat.name}: 父类别${cat.parent}不存在`);
            return null;
          }
          
          // 不手动转换_id，让MongoDB自动生成
          const categoryData = {
            name: cat.name,
            description: cat.description,
            parent: parentObjectId,
            tags: cat.tags,
            visibility: cat.visibility,
            isSystem: cat.isSystem,
            archived: cat.archived,
            createdAt: cat.createdAt,
            updatedAt: cat.createdAt
          };
          
          const createdCategory = await Category.create(categoryData);
          console.log(`已创建第二级子类别: ${createdCategory.name} (父类别: ${cat.parent})`);
          // 添加到映射中
          categoryIdMap.set(cat.originalId, createdCategory._id);
          return {
            originalId: cat.originalId,
            _id: createdCategory._id
          };
        } catch (error) {
          console.error(`创建第二级子类别${cat.name}失败:`, error.message);
          return null;
        }
      })
    );
    
    // 合并所有创建的子类别
    const createdChildCategories = [...createdFirstLevelChildren, ...createdSecondLevelChildren];
    
    // 统计结果
    const totalCreated = createdRootCategories.filter(cat => cat).length + 
                        createdChildCategories.filter(cat => cat).length;
    
    console.log(`\n=== 初始化结果 ===`);
    console.log(`共创建${totalCreated}个类别`);
    console.log(`根类别: ${createdRootCategories.filter(cat => cat).length}个`);
    console.log(`子类别: ${createdChildCategories.filter(cat => cat).length}个`);
    
    return true;
  } catch (error) {
    console.error('初始化类别数据失败:', error.message);
    return false;
  }
}

// 验证初始化结果
async function verifyInitialization() {
  try {
    const allCategories = await Category.find({ isSystem: true });
    console.log(`\n=== 验证结果 ===`);
    console.log(`数据库中共有${allCategories.length}个系统类别`);
    
    // 按parent分组统计
    const rootCategories = allCategories.filter(cat => !cat.parent);
    const childCategories = allCategories.filter(cat => cat.parent);
    
    console.log(`根类别数量: ${rootCategories.length}`);
    console.log(`子类别数量: ${childCategories.length}`);
    
    // 打印部分类别信息
    console.log('\n部分类别信息示例:');
    allCategories.slice(0, 5).forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat._id})`);
    });
    
    return true;
  } catch (error) {
    console.error('验证初始化结果失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('\n===== 初始化Mock Categories到数据库 =====\n');
  
  try {
    // 连接数据库
    const connected = await connectToDatabase();
    if (!connected) {
      console.log('程序终止');
      return;
    }
    
    // 加载Category模型
    const modelLoaded = await loadCategoryModel();
    if (!modelLoaded) {
      console.log('程序终止');
      return;
    }
    
    // 清除现有类别数据
    const cleared = await clearExistingCategories();
    if (!cleared) {
      console.log('程序终止');
      return;
    }
    
    // 初始化类别数据
    const initialized = await initCategories();
    if (!initialized) {
      console.log('程序终止');
      return;
    }
    
    // 验证初始化结果
    await verifyInitialization();
    
    console.log('\n✅ 初始化完成！');
    
  } catch (error) {
    console.error('程序执行出错:', error.message);
  } finally {
    // 断开数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\nMongoDB连接已断开');
    }
  }
}

// 运行程序
main();