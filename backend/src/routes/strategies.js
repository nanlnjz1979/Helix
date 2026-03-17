const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const strategyController = require('../controllers/strategyController');

// 获取所有策略
router.get('/', auth, strategyController.getAllStrategies);

// 获取单个策略
router.get('/:id', auth, strategyController.getStrategyById);

// 创建新策略
router.post('/', auth, strategyController.createStrategy);

// 从模板克隆策略
router.post('/clone-from-template/:templateId', auth, strategyController.cloneFromTemplate);

// 更新策略
router.put('/:id', auth, strategyController.updateStrategy);

// 删除策略
router.delete('/:id', auth, strategyController.deleteStrategy);

// 代码编译（SSE流）
router.get('/:id/compile', auth, strategyController.compileStrategySSE);

// 发送策略代码到实盘Redis地址
router.post('/:id/send-to-live', auth, strategyController.sendStrategyToLiveRedis);

module.exports = router;