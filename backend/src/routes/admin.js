const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// 首先应用auth中间件验证用户身份
router.use(auth);

// 然后确保只有管理员可以访问这些路由
router.use((req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '无管理权限' });
  }
});

// 管理API根路由
router.get('/', (req, res) => {
  res.json({
    message: '管理员API',
    endpoints: [
      '/api/admin/users - 获取所有用户列表',
      '/api/admin/users/:id - 获取单个用户详情',
      '/api/admin/users/:id/role - 更新用户角色'
    ],
    user: req.user
  });
});

// 用户管理路由
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// 策略管理路由
router.get('/strategies', adminController.getAllStrategies);
router.put('/strategies/:id/review', adminController.reviewStrategy);

// 统计和分析路由
router.get('/stats', adminController.getStats);
router.get('/analytics', adminController.getAnalytics);

// 尝试导入模型，如果失败则使用模拟数据
let User, Strategy;
try {
  User = require('../models/User');
  Strategy = require('../models/Strategy');
} catch (error) {
  console.log('使用模拟数据模式');
  
  // 使用模拟版控制器
  router.get('/users', adminController.mock.getAllUsers);
  router.get('/users/:id', adminController.mock.getUserById);
  router.put('/users/:id/role', adminController.mock.updateUserRole);
  router.put('/users/:id/status', adminController.mock.updateUserStatus);
  router.delete('/users/:id', adminController.mock.deleteUser);
  router.get('/strategies', adminController.mock.getAllStrategies);
  router.put('/strategies/:id/review', adminController.mock.reviewStrategy);
  router.get('/stats', adminController.mock.getStats);
  router.get('/analytics', adminController.mock.getAnalytics);
}

module.exports = router;