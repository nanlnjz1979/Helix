const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');
const auth = require('../middleware/auth');

// 保存/更新持仓信息
router.post('/', auth, positionController.savePosition);

// 获取持仓列表
router.get('/', auth, positionController.getPositions);

// 获取单个持仓信息
router.get('/:id', auth, positionController.getPosition);

// 更新持仓信息
router.put('/:id', auth, positionController.updatePosition);

// 删除持仓信息
router.delete('/:id', auth, positionController.deletePosition);

// 获取指定策略的持仓列表
router.get('/by-strategy/:strategyId', auth, positionController.getPositionsByStrategy);

// 批量删除指定策略的持仓
router.delete('/by-strategy/:strategyId', auth, positionController.deletePositionsByStrategy);

module.exports = router;
