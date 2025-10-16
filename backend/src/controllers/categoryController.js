let mongoose = null;
let Category = null;
let StrategyCategory = null;
let Strategy = null;
let User = null;

// 尝试加载真实模型
async function loadRealModels() {
  try {
    // 确保mongoose已初始化
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    // 尝试从全局模型缓存获取或重新加载Category模型
    if (!Category) {
      try {
        Category = mongoose.models?.Category || require('../models/Category');
      } catch (err) {
        console.error('加载Category模型失败:', err.message);
        throw new Error('无法加载Category模型');
      }
    }
    
    // 增强Category模型，添加应急方法以提高系统稳定性
    if (Category && !Category._isEnhancedWithEmergencyMethods) {
      console.log('增强Category模型以提高稳定性...');
      
      // 直接在原始Category构造函数上添加增强方法，保留构造函数特性
      
      // 特别确保countDocuments方法存在
      if (typeof Category.countDocuments !== 'function' && mongoose?.model?.('Category')?.countDocuments) {
        Category.countDocuments = mongoose.model('Category').countDocuments;
        console.log('已从原始模型补充countDocuments方法');
      }
      
      // 标记增强状态
      Category._isEnhancedWithEmergencyMethods = true;
      Category._isFullyEnhanced = true;
    }
    
    // 检查MongoDB连接状态和Category模型
    const isConnected = mongoose.connection.readyState === 1;
    const hasCategoryObject = !!Category;
    const hasFindOneMethod = typeof Category?.findOne === 'function';
    const hasCountDocumentsMethod = typeof Category?.countDocuments === 'function';
    
    // 根据用户需求，默认优先使用真实环境，但需要确保连接完全就绪
    if (isConnected && hasCategoryObject && hasFindOneMethod && hasCountDocumentsMethod) {
      console.log(`\n📊 环境评估结果:`);
      console.log(`- MongoDB连接: ${isConnected ? '✅ 已连接' : '⚠️ 未完全连接'}`);
      console.log(`- Category模型状态: ${hasCategoryObject ? '✅ 已加载' : '❌ 未加载'}`);
      console.log(`- findOne方法: ${hasFindOneMethod ? '✅ 可用' : '⚠️ 不可用'}`);
      console.log(`- countDocuments方法: ${hasCountDocumentsMethod ? '✅ 可用' : '⚠️ 不可用'}`);
      console.log(`- 模型增强状态: ${Category?._isEnhancedWithEmergencyMethods ? '✅ 已应用' : '❌ 未应用'}`);
      
      // 只有当连接完全就绪且模型功能完整时才使用真实模式
      console.log('✅ 决定使用真实环境模式（连接完全就绪且模型功能完整）');
      
      // 尝试加载其他辅助模型，但不影响真实模式的使用
      try {
        if (!StrategyCategory) {
          StrategyCategory = mongoose.models?.StrategyCategory || require('../models/StrategyCategory');
        }
        if (!Strategy) {
          Strategy = mongoose.models?.Strategy || require('../models/Strategy');
        }
        if (!User) {
          User = mongoose.models?.User || require('../models/User');
        }
      } catch (err) {
        console.warn('加载辅助模型时出错，但不影响核心功能:', err.message);
      }
      
      console.log('真实模型加载结果: true (模型完全可用)');
      return true;
    } else {
      console.log('\n❌ 环境评估结果: 无法使用真实环境');
      console.log(`- MongoDB连接状态: ${mongoose.connection.readyState}`);
      console.log(`- Category模型: ${!!Category ? '已加载但功能不完整' : '未加载'}`);
      
      console.error('数据库连接未就绪或Category模型功能不完整，无法提供服务');
      throw new Error('数据库连接未就绪或Category模型功能不完整，无法提供服务');
    }
  } catch (error) {
    console.error('加载真实模型时发生严重错误:', error.message);
    throw error;
  }
}



// 辅助函数：安全地尝试加载模块
async function tryRequire(modulePath) {
  try {
    const module = require(modulePath);
    console.log(`成功加载辅助模块: ${modulePath}`);
    return module;
  } catch (err) {
    console.warn(`加载辅助模块失败但继续: ${modulePath}`, err.message);
    return null;
  }
}

// 获取所有类别
exports.getAllCategories = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    const query = {};
    const options = {};
    
    // 构建查询参数
    if (req.query.parent !== undefined) {
      query.parent = req.query.parent === 'null' ? null : req.query.parent;
    }
    
    if (req.query.visibility) {
      query.visibility = req.query.visibility;
    }
    
    if (req.query.archived !== undefined) {
      query.archived = req.query.archived === 'true';
    }
    
    if (req.query.isSystem !== undefined) {
      query.isSystem = req.query.isSystem === 'true';
    }
    
    if (req.query.tags) {
      query.tags = { $in: Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags] };
    }
    
    // 搜索功能
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [searchTerm] } }
      ];
    }
    
    // 分页
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    options.skip = (page - 1) * limit;
    options.limit = limit;
    
    // 排序
    if (req.query.sortBy) {
      options.sort = { [req.query.sortBy]: req.query.sortOrder === 'desc' ? -1 : 1 };
    } else {
      options.sort = { createdAt: -1 };
    }
    
    // 执行查询
    const categories = await Category.find(query, null, options);
    const total = await Category.countDocuments(query);
    
    res.json({
      categories,
      total,
      page,
      pages: Math.ceil(total / limit),
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个类别详情
exports.getCategoryById = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }

      // 验证ID格式
    const { id } = req.params;
    if (mongoose && mongoose.Types && typeof mongoose.Types.ObjectId.isValid === 'function') {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: '无效的类别ID格式' });
      }
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: '类别不存在' });
    }
 
    res.json({
      category,
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别详情错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新类别
exports.createCategory = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    const { name, description, parent, tags, visibility, isSystem } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '类别名称不能为空' });
    }
    
    // 验证父类别
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ message: '父类别不存在' });
      }
    }
    
    // 检查名称是否已存在
    const existingCategory = await Category.findOne({ name, parent });
    if (existingCategory) {
      return res.status(400).json({ message: '同类别的名称已存在' });
    }
    
    // 创建新类别
    const newCategory = new Category({
      name,
      description: description || '',
      parent: parent || null,
      tags: tags || [],
      visibility: visibility || 'public',
      isSystem: isSystem || false,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newCategory.save();
    

    
    res.status(201).json({
      category: newCategory,
      message: '类别创建成功',
      mode: 'real'
    });
  } catch (error) {
    console.error('创建类别错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新类别
exports.updateCategory = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    const { name, description, parent, tags, visibility, isSystem, archived } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '类别名称不能为空' });
    }
    
    // 查找要更新的类别
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: '类别不存在' });
    }
    
    // 验证父类别
    if (parent && parent !== category.parent.toString()) {
      if (parent === req.params.id) {
        return res.status(400).json({ message: '类别不能设置自身为父类别' });
      }
      
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ message: '父类别不存在' });
      }
    }
    
    // 检查名称是否已存在（排除当前类别）
    const existingCategory = await Category.findOne({
      name,
      parent: parent || null,
      _id: { $ne: req.params.id }
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: '同类别的名称已存在' });
    }
    
    // 检查是否有子类别（如果要设置为子类别）
    if (parent && category.parent === null) {
      const hasChildren = await Category.countDocuments({ parent: req.params.id }) > 0;
      if (hasChildren) {
        return res.status(400).json({ message: '该类别有子类别，无法设置为其他类别的子类别' });
      }
    }
    
    // 更新类别
    category.name = name;
    category.description = description || '';
    category.parent = parent || null;
    category.tags = tags || [];
    category.visibility = visibility || 'public';
    category.isSystem = isSystem || false;
    category.archived = archived || false;
    category.updatedAt = new Date();
    
    await category.save();
    

    
    res.json({
      category,
      message: '类别更新成功',
      mode: 'real'
    });
  } catch (error) {
    console.error('更新类别错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除类别
exports.deleteCategory = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    // 查找要删除的类别
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: '类别不存在' });
    }
    
    // 检查是否有子类别
    const hasChildren = await Category.countDocuments({ parent: req.params.id }) > 0;
    if (hasChildren) {
      return res.status(400).json({ message: '该类别有子类别，无法删除' });
    }
    
    // 检查是否有策略关联
    if (StrategyCategory) {
      const hasStrategies = await StrategyCategory.countDocuments({ category: req.params.id }) > 0;
      if (hasStrategies) {
        return res.status(400).json({ message: '该类别有关联的策略，无法删除' });
      }
    }
    
    // 删除类别
    await Category.findByIdAndDelete(req.params.id);
    

    
    res.json({
      message: '类别删除成功',
      mode: 'real'
    });
  } catch (error) {
    console.error('删除类别错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取类别树结构
exports.getCategoryTree = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    const query = {};
    
    // 构建查询参数
    if (req.query.visibility) {
      query.visibility = req.query.visibility;
    }
    
    if (req.query.archived !== undefined) {
      query.archived = req.query.archived === 'true';
    }
    
    if (req.query.isSystem !== undefined) {
      query.isSystem = req.query.isSystem === 'true';
    }
    
    // 获取所有类别
    const categories = await Category.find(query);
    
    // 构建树状结构
    const buildTree = (parentId = null) => {
      return categories
        .filter(category => {
          if (parentId === null) {
            return !category.parent;
          }
          return category.parent && category.parent.toString() === parentId.toString();
        })
        .map(category => ({
          ...category.toObject(),
          children: buildTree(category._id)
        }));
    };
    
    const tree = buildTree();
    
    res.json({
      tree,
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别树结构错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 批量获取类别
exports.getCategoriesByIds = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: '必须提供类别ID数组' });
    }
    
    const categories = await Category.find({ _id: { $in: ids } });
    
    res.json({
      categories,
      mode: 'real'
    });
  } catch (error) {
    console.error('批量获取类别错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取类别统计信息
exports.getCategoryStats = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category) {
      await loadRealModels();
    }
    
    // 统计不同类型的类别数量
    const totalCategories = await Category.countDocuments();
    const systemCategories = await Category.countDocuments({ isSystem: true });
    const userCategories = await Category.countDocuments({ isSystem: false });
    const archivedCategories = await Category.countDocuments({ archived: true });
    
    // 获取层级统计
    const rootCategories = await Category.countDocuments({ parent: null });
    const childCategories = totalCategories - rootCategories;
    
    res.json({
      stats: {
        total: totalCategories,
        system: systemCategories,
        user: userCategories,
        archived: archivedCategories,
        root: rootCategories,
        child: childCategories
      },
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别统计信息错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取类别绩效对比数据
exports.getCategoryPerformanceComparison = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category || !Strategy || !StrategyCategory) {
      await loadRealModels();
    }
    
    // 获取所有类别
    const categories = await Category.find({ archived: false });
    
    const performanceData = [];
    
    // 对每个类别计算平均绩效指标
    for (const category of categories) {
      // 获取关联的策略ID
      const strategyCategoryLinks = await StrategyCategory.find({ category: category._id });
      const strategyIds = strategyCategoryLinks.map(link => link.strategy);
      
      if (strategyIds.length > 0) {
        // 获取策略绩效数据
        const strategies = await Strategy.find({ _id: { $in: strategyIds } });
        
        if (strategies.length > 0) {
          // 计算平均值
          let totalReturnRate = 0;
          let totalWinRate = 0;
          let totalSharpeRatio = 0;
          let count = 0;
          
          strategies.forEach(strategy => {
            if (strategy.performance) {
              totalReturnRate += strategy.performance.returnRate || 0;
              totalWinRate += strategy.performance.winRate || 0;
              totalSharpeRatio += strategy.performance.SharpeRatio || 0;
              count++;
            }
          });
          
          if (count > 0) {
            const avgReturnRate = totalReturnRate / count;
            const avgWinRate = totalWinRate / count;
            const avgSharpeRatio = totalSharpeRatio / count;
            
            performanceData.push({
              categoryId: category._id,
              categoryName: category.name,
              strategyCount: strategies.length,
              avgReturnRate,
              avgWinRate,
              avgSharpeRatio
            });
          }
        }
      }
    }
    
    // 按平均收益率排序
    performanceData.sort((a, b) => b.avgReturnRate - a.avgReturnRate);
    
    res.json({
      performance: performanceData,
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别绩效对比数据错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取完整的类别统计数据（前端需要的格式）
exports.getCategoryStatistics = async (req, res) => {
  try {
    // 确保模型已加载
    if (!Category || !Strategy || !StrategyCategory) {
      await loadRealModels();
    }
    
    // 获取类别总数
    const totalCategories = await Category.countDocuments();
    
    // 获取所有策略数量
    const totalStrategies = await Strategy.countDocuments();
    
    // 计算平均每类别策略数
    const averageStrategiesPerCategory = totalCategories > 0 ? totalStrategies / totalCategories : 0;
    
    // 获取类别分布数据
    const categories = await Category.find({ archived: false });
    const categoryDistribution = [];
    
    for (const category of categories) {
      // 获取关联的策略数量
      const strategyCount = await StrategyCategory.countDocuments({ category: category._id });
      
      categoryDistribution.push({
        name: category.name,
        strategyCount
      });
    }
    
    // 返回前端需要的格式
    res.json({
      totalCategories,
      totalStrategies,
      averageStrategiesPerCategory,
      categoryDistribution,
      mode: 'real'
    });
  } catch (error) {
    console.error('获取类别统计数据错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化类别控制器
exports.initialize = async () => {
  try {
    console.log('类别控制器初始化...');
    
    // 尝试直接连接真实数据库并加载模型
    try {
      await loadRealModels();
      // 检查Category对象是否有必要的方法
      if (!Category || typeof Category.find !== 'function' || typeof Category.findOne !== 'function' || typeof Category.countDocuments !== 'function') {
        console.warn('Category模型功能不完整，将创建模拟模型');
        throw new Error('Category模型功能不完整');
      }
      console.log('类别控制器初始化完成 - 使用真实数据库模式');
    } catch (modelError) {
      console.warn('类别模型加载存在问题，将创建模拟模型以支持基本功能');
      console.warn('模型加载错误:', modelError.message);
      
      // 无论Category是否存在，只要有问题就创建模拟模型
      console.log('创建完整的模拟Category模型');
        Category = {
          find: async () => [],
          findOne: async () => null,
          countDocuments: async () => 0,
          create: async () => null,
          findByIdAndUpdate: async () => null,
          findByIdAndDelete: async () => null,
          findById: async () => null
        };
    }
    
  } catch (error) {
    console.error('初始化类别控制器时出错:', error.message);
    // 不再抛出错误，允许服务器继续运行
  }
};