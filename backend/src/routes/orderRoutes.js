const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// 创建订单
router.post('/', auth, orderController.createOrder);

// 获取订单列表
router.get('/', auth, orderController.getOrders);

// 获取单个订单
router.get('/:id', auth, orderController.getOrder);

// 更新订单
router.put('/:id', auth, orderController.updateOrder);

// 删除订单
router.delete('/:id', auth, orderController.deleteOrder);

// 批量删除指定策略的订单
router.delete('/strategy/:strategyId', auth, orderController.deleteOrdersByStrategy);

module.exports = router;
