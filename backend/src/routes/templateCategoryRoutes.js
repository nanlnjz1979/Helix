const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const templateCategoryController = require('../controllers/templateCategoryController');

// 应用认证中间件
router.use(auth);

// 模板分类API路由

// 获取所有模板分类（分页、搜索、筛选）
router.get('/template-categories', async (req, res) => {
  await templateCategoryController.getAllTemplateCategories(req, res);
});

// 获取模板分类树状结构
router.get('/template-categories/tree', async (req, res) => {
  await templateCategoryController.getTemplateCategoryTree(req, res);
});

// 创建新模板分类
router.post('/template-categories', async (req, res) => {
  await templateCategoryController.createTemplateCategory(req, res);
});

// 更新模板分类
router.put('/template-categories/:id', async (req, res) => {
  await templateCategoryController.updateTemplateCategory(req, res);
});

// 删除模板分类
router.delete('/template-categories/:id', async (req, res) => {
  await templateCategoryController.deleteTemplateCategory(req, res);
});

// 获取单个模板分类详情
router.get('/template-categories/:id', async (req, res) => {
  await templateCategoryController.getTemplateCategoryById(req, res);
});

// 获取模板分类统计数据（仅管理员可访问）
router.get('/template-categories/stats', async (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无管理权限' });
  }
  
  await templateCategoryController.getTemplateCategoryStatistics(req, res);
});

module.exports = router;