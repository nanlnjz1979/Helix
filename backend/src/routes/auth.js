const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// 初始化认证模块
authController.initialize();

// 注册新用户
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 修改密码（需要认证）
router.post('/change-password', auth, authController.changePassword);

module.exports = router;