const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');

// 保存/更新账户信息
router.post('/', auth, accountController.saveAccount);

// 获取账户列表
router.get('/', auth, accountController.getAccounts);

// 获取单个账户信息
router.get('/:id', auth, accountController.getAccount);

// 更新账户信息
router.put('/:id', auth, accountController.updateAccount);

// 删除账户信息
router.delete('/:id', auth, accountController.deleteAccount);

// 获取指定用户的账户列表
router.get('/by-user/:userId', auth, accountController.getAccountsByUser);

// 批量删除指定策略的账户
router.delete('/by-strategy/:strategyId', auth, accountController.deleteAccountsByStrategy);

// 通过策略ID获取策略信息
router.get('/strategy/:strategyId', auth, accountController.getStrategyInfo);

module.exports = router;
