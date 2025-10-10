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
      '/api/admin/users/:id - 更新用户信息'
    ],
    user: req.user
  });
});

// 用户管理路由
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// 策略管理路由
router.get('/strategies', adminController.getAllStrategies);
router.put('/strategies/:id/status', adminController.updateStrategyStatus);
router.put('/strategies/:id/review', adminController.reviewStrategy);
router.delete('/strategies/:id', adminController.deleteStrategy);

// 分析数据路由
router.get('/analytics', adminController.getAnalyticsData);

module.exports = router;