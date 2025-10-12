const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const templateController = require('../controllers/templateController');

// 应用认证中间件
router.use(auth);

// 模板API路由

// 获取所有模板（分页、搜索、筛选）
router.get('/templates', async (req, res) => {
  await templateController.getAllTemplates(req, res);
});

// 获取单个模板详情
router.get('/templates/:id', async (req, res) => {
  await templateController.getTemplateById(req, res);
});

// 创建新模板
router.post('/templates', async (req, res) => {
  await templateController.createTemplate(req, res);
});

// 更新模板
router.put('/templates/:id', async (req, res) => {
  await templateController.updateTemplate(req, res);
});

// 删除模板
router.delete('/templates/:id', async (req, res) => {
  await templateController.deleteTemplate(req, res);
});

// 更新模板状态（审核操作）
router.put('/templates/:id/status', async (req, res) => {
  await templateController.updateTemplateStatus(req, res);
});

// 克隆模板
router.post('/templates/:id/clone', async (req, res) => {
  await templateController.cloneTemplate(req, res);
});

// 更新模板使用次数
router.put('/templates/:id/usage', async (req, res) => {
  await templateController.updateTemplateUsage(req, res);
});

// 获取模板统计数据（仅管理员可访问）
router.get('/templates/stats', async (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '无管理权限' });
  }
  
  await templateController.getTemplateStatistics(req, res);
});

module.exports = router;