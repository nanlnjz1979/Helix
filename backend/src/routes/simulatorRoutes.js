const express = require('express');
const router = express.Router();
const positionRoutes = require('./positionRoutes');
const accountRoutes = require('./accountRoutes');

// 挂载持仓路由
router.use('/positions', positionRoutes);

// 挂载账户路由
router.use('/account', accountRoutes);

module.exports = router;
