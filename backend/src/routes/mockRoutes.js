// 模拟路由模块
const express = require('express');
const router = express.Router();

// 模拟用户路由
router.get('/', (req, res) => {
  res.status(200).json({
    message: '用户管理模块',
    availableRoutes: ['/api/users', '/api/users/profile']
  });
});

router.get('/profile', (req, res) => {
  res.status(200).json({
    id: '1',
    username: 'demo_user',
    email: 'demo@example.com',
    role: 'user',
    preferences: {
      theme: 'light',
      language: 'zh-CN'
    }
  });
});

// 模拟市场数据路由
router.get('/market', (req, res) => {
  res.status(200).json({
    message: '市场数据模块',
    availableRoutes: ['/api/market/tickers', '/api/market/history']
  });
});

router.get('/market/tickers', (req, res) => {
  const tickers = [
    {
      symbol: 'BTC/USDT',
      price: 42000,
      change24h: 2.5,
      volume24h: 15000000
    },
    {
      symbol: 'ETH/USDT',
      price: 2200,
      change24h: -1.2,
      volume24h: 8000000
    },
    {
      symbol: 'SOL/USDT',
      price: 100,
      change24h: 5.8,
      volume24h: 3000000
    }
  ];
  res.status(200).json(tickers);
});

// 模拟回测路由
router.get('/backtest', (req, res) => {
  res.status(200).json({
    message: '回测模块',
    availableRoutes: ['/api/backtest/strategies', '/api/backtest/run']
  });
});

router.get('/backtest/strategies', (req, res) => {
  const strategies = [
    {
      id: '1',
      name: '移动平均线交叉',
      description: '基于短期和长期移动平均线交叉的策略',
      parameters: {
        shortPeriod: 5,
        longPeriod: 20
      }
    },
    {
      id: '2',
      name: 'RSI超买超卖',
      description: '基于RSI指标的超买超卖策略',
      parameters: {
        overbought: 70,
        oversold: 30,
        period: 14
      }
    }
  ];
  res.status(200).json(strategies);
});

// 模拟交易路由
router.get('/trading', (req, res) => {
  res.status(200).json({
    message: '交易模块',
    availableRoutes: ['/api/trading/orders', '/api/trading/positions']
  });
});

router.get('/trading/orders', (req, res) => {
  const orders = [
    {
      id: '1',
      symbol: 'BTC/USDT',
      type: 'limit',
      side: 'buy',
      price: 41000,
      quantity: 0.001,
      status: 'open',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      type: 'market',
      side: 'sell',
      price: 2250,
      quantity: 0.1,
      status: 'filled',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
  res.status(200).json(orders);
});

module.exports = router;