const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// 类别管理路由
router.get('/categories', auth, async (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    // 非管理员只能查看公开类别和自己创建的私有类别
    const originalQuery = req.query;
    
    // 创建新的查询参数，添加可见性过滤
    const query = {
      ...originalQuery,
      visibility: ['public', 'private'],
      user: req.user.id
    };
    
    // 更新req.query
    req.query = query;
  }
  
  await categoryController.getAllCategories(req, res);
});

// 获取类别树状结构
router.get('/categories/tree', auth, async (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    // 非管理员只能查看公开类别和自己创建的私有类别
    const originalQuery = req.query;
    
    // 创建新的查询参数，添加可见性过滤
    const query = {
      ...originalQuery,
      visibility: ['public', 'private'],
      user: req.user.id
    };
    
    // 更新req.query
    req.query = query;
  }
  
  await categoryController.getCategoryTree(req, res);
});

// 创建新类别
router.post('/categories', auth, async (req, res) => {
  // 检查是否为管理员或普通用户创建私有类别
  console.log('--------0----------:',req.body);
  if (req.user.role !== 'admin' && (req.body.visibility !== 'private' || req.body.isSystem)) {
    console.log('--------00----------:',req.user.role);
    return res.status(403).json({ message: '无权限创建公开类别或系统类别' });
  }
  
  await categoryController.createCategory(req, res);
 
});

// 更新类别信息
router.put('/categories/:id', auth, async (req, res) => {
  // 检查权限
  if (req.user.role !== 'admin') {
    try {
      // 获取要更新的类别
      const category = await categoryController.getCategoryById(req, res, true); // true 表示仅获取数据不响应
      if (!category) {
        return res.status(404).json({ message: '类别不存在' });
      }
      
      // 检查是否为类别所有者
      if (category.visibility === 'private' && category.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: '无权限更新该类别' });
      }
      
      // 不允许普通用户修改可见性为公开或设置为系统类别
      if (req.body.visibility && req.body.visibility !== 'private' || req.body.isSystem === true) {
        return res.status(403).json({ message: '无权限修改类别可见性或设置为系统类别' });
      }
    } catch (error) {
      return res.status(500).json({ message: '服务器错误', error: error.message });
    }
  }
  
  await categoryController.updateCategory(req, res);
});

// 删除类别
router.delete('/categories/:id', auth, async (req, res) => {
  // 只有管理员可以删除类别
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限删除类别' });
  }
  
  await categoryController.deleteCategory(req, res);
});

// 归档/恢复类别
router.patch('/categories/:id/archive', auth, async (req, res) => {
  // 只有管理员可以归档/恢复类别
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限归档/恢复类别' });
  }
  
  await categoryController.archiveCategory(req, res);
});

// 策略与类别关联路由
router.get('/strategies/:strategyId/categories', auth, async (req, res) => {
  await categoryController.getStrategyCategories(req, res);
});

// 为策略分配类别
router.post('/strategies/:strategyId/categories/:categoryId', auth, async (req, res) => {
  // 检查类别权限
  try {
    const category = await categoryController.getCategoryById({ params: { id: req.params.categoryId } }, res, true);
    if (!category) {
      return res.status(404).json({ message: '类别不存在' });
    }
    
    // 检查是否有权限使用该类别
    if (category.visibility === 'private' && category.owner.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限使用该私有类别' });
    }
  } catch (error) {
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
  
  await categoryController.assignCategoryToStrategy(req, res);
});

// 从策略中移除类别
router.delete('/strategies/:strategyId/categories/:categoryId', auth, async (req, res) => {
  // 只有管理员和策略所有者可以移除类别
  if (req.user.role !== 'admin') {
    // 这里可以添加逻辑检查策略所有权
  }
  
  await categoryController.removeCategoryFromStrategy(req, res);
});

// 批量更新策略类别
router.post('/strategies/batch-categories', auth, async (req, res) => {
  // 只有管理员可以执行批量操作
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限执行批量操作' });
  }
  
  await categoryController.batchUpdateStrategyCategories(req, res);
});

// 策略的类别变更历史路由已删除

// 按类别查询策略路由
router.get('/categories/:categoryId/strategies', auth, async (req, res) => {
  // 检查类别权限
  try {
    const category = await categoryController.getCategoryById({ params: { id: req.params.categoryId } }, res, true);
    if (!category) {
      return res.status(404).json({ message: '类别不存在' });
    }
    
    // 检查是否有权限查看该类别下的策略
    if (category.visibility === 'private' && category.owner.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限查看该私有类别下的策略' });
    }
  } catch (error) {
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
  
  await categoryController.getStrategiesByCategory(req, res);
});

// 类别统计和数据可视化路由
router.get('/categories/stats', auth, async (req, res) => {
  // 只有管理员可以查看完整统计数据
  if (req.user.role !== 'admin') {
    // 非管理员只能查看自己创建的私有类别的统计数据
    const originalQuery = req.query;
    
    // 创建新的查询参数，添加过滤
    const query = {
      ...originalQuery,
      user: req.user.id
    };
    
    // 更新req.query
    req.query = query;
  }
  
  await categoryController.getCategoryStats(req, res);
});

// 完整的类别统计数据路由（前端AdminCategories页面需要的格式）
router.get('/categories/statistics', auth, async (req, res) => {
  // 只有管理员可以查看完整统计数据
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限查看类别统计数据' });
  }
  
  await categoryController.getCategoryStatistics(req, res);
});

router.get('/categories/distribution', auth, async (req, res) => {
  // 只有管理员可以查看完整分布数据
  if (req.user.role !== 'admin') {
    // 非管理员只能查看自己创建的私有类别的分布数据
    const originalQuery = req.query;
    
    // 创建新的查询参数，添加过滤
    const query = {
      ...originalQuery,
      user: req.user.id
    };
    
    // 更新req.query
    req.query = query;
  }
  
  await categoryController.getCategoryDistribution(req, res);
});

router.get('/categories/performance', auth, async (req, res) => {
  // 只有管理员可以查看完整绩效数据
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限查看绩效数据' });
  }
  
  await categoryController.getCategoryPerformanceComparison(req, res);
});

// 获取单个类别详情 - 动态路由放在所有特定路径之后
router.get('/categories/:id', auth, async (req, res) => {
  // 对于非管理员，需要额外检查类别可见性或所有权
  if (req.user.role !== 'admin') {
    try {
      const category = await categoryController.getCategoryById(req, res, true); // true 表示仅获取数据不响应
      if (!category || (category.visibility === 'private' && category.owner.toString() !== req.user.id.toString())) {
        return res.status(403).json({ message: '无权限查看该类别' });
      }
      return res.json(category);
    } catch (error) {
      return res.status(500).json({ message: '服务器错误', error: error.message });
    }
  }
  
  await categoryController.getCategoryById(req, res);
});

// 导出路由和控制器引用，以便在数据库连接后初始化
module.exports = {
  router,
  controller: categoryController
};

// 导出router对象供直接使用
module.exports.router = router;