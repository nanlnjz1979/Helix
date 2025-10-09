// 导入所需的模型
const User = require('../models/User');
const Strategy = require('../models/Strategy');

// 模拟数据 - 在没有数据库连接时使用
const mockUsers = [
  {
    _id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    balance: 0,
    active: true,
    createdAt: new Date('2023-01-01').toISOString()
  },
  {
    _id: '2',
    username: 'user1',
    email: 'user1@example.com',
    role: 'user',
    balance: 150000,
    active: true,
    createdAt: new Date('2023-02-01').toISOString()
  },
  {
    _id: '3',
    username: 'user2',
    email: 'user2@example.com',
    role: 'user',
    balance: 200000,
    active: true,
    createdAt: new Date('2023-03-01').toISOString()
  },
  {
    _id: '4',
    username: 'user3',
    email: 'user3@example.com',
    role: 'user',
    balance: 50000,
    active: true,
    createdAt: new Date('2023-04-01').toISOString()
  },
  {
    _id: '5',
    username: 'user4',
    email: 'user4@example.com',
    role: 'user',
    balance: 0,
    active: true,
    createdAt: new Date('2023-05-01').toISOString()
  }
];

const mockStrategies = [
  {
    _id: 's1',
    name: '均线交叉策略',
    description: '基于短期和长期均线交叉的交易策略',
    type: '技术指标',
    code: 'def strategy(data):\n    # 计算短期和长期均线\n    data[\'short_ma\'] = data[\'close\'].rolling(window=5).mean()\n    data[\'long_ma\'] = data[\'close\'].rolling(window=20).mean()\n    # 生成交易信号\n    data[\'signal\'] = 0\n    data.loc[data[\'short_ma\'] > data[\'long_ma\'], \'signal\'] = 1\n    data.loc[data[\'short_ma\'] < data[\'long_ma\'], \'signal\'] = -1\n    return data',
    parameters: { short_period: 5, long_period: 20 },
    status: '已启用',
    approved: true,
    user: { _id: '2', username: 'user1' },
    createdAt: new Date('2023-06-01').toISOString()
  },
  {
    _id: 's2',
    name: 'MACD策略',
    description: '基于MACD指标的交易策略',
    type: '技术指标',
    code: 'def strategy(data):\n    # 计算MACD\n    exp1 = data[\'close\'].ewm(span=12, adjust=False).mean()\n    exp2 = data[\'close\'].ewm(span=26, adjust=False).mean()\n    data[\'macd\'] = exp1 - exp2\n    data[\'signal_line\'] = data[\'macd\'].ewm(span=9, adjust=False).mean()\n    # 生成交易信号\n    data[\'signal\'] = 0\n    data.loc[data[\'macd\'] > data[\'signal_line\'], \'signal\'] = 1\n    data.loc[data[\'macd\'] < data[\'signal_line\'], \'signal\'] = -1\n    return data',
    parameters: {},
    status: '未启用',
    approved: true,
    user: { _id: '3', username: 'user2' },
    createdAt: new Date('2023-06-02').toISOString()
  },
  {
    _id: 's3',
    name: '随机森林预测',
    description: '使用随机森林算法预测股票价格',
    type: '机器学习',
    code: 'import pandas as pd\nfrom sklearn.ensemble import RandomForestRegressor\ndef strategy(data):\n    # 准备特征\n    data[\'return\'] = data[\'close\'].pct_change()\n    data[\'volume_change\'] = data[\'volume\'].pct_change()\n    # 简单的随机森林模型\n    # 实际应用中需要更复杂的特征工程和模型调优\n    return data',
    parameters: { n_estimators: 100 },
    status: '已启用',
    approved: false,
    user: { _id: '4', username: 'user3' },
    createdAt: new Date('2023-06-03').toISOString()
  }
];

// 获取所有用户列表
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个用户详情
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新用户角色
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: '角色必须是user或admin' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      message: '用户角色更新成功',
      user
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取所有策略（包括其他用户的）
exports.getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find().populate('user', 'username email');
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 审核策略
exports.reviewStrategy = async (req, res) => {
  try {
    const { approved, comment } = req.body;

    const strategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      {
        approved,
        reviewComment: comment,
        reviewedBy: req.user.id,
        reviewedAt: Date.now()
      },
      { new: true }
    ).populate('user', 'username email');

    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }

    res.json({
      message: '策略审核状态更新成功',
      strategy
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 统计数据
exports.getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const strategyCount = await Strategy.countDocuments();
    const activeUsers = await User.countDocuments({ balance: { $gt: 0 } });
    const activeStrategies = await Strategy.countDocuments({ status: '已启用' });

    res.json({
      userCount,
      strategyCount,
      activeUsers,
      activeStrategies
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 分析数据
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 这里可以根据实际需求实现更复杂的分析逻辑
    // 简单示例：生成一些模拟的用户增长数据
    const userGrowthData = [
      { month: '1月', users: 10 },
      { month: '2月', users: 15 },
      { month: '3月', users: 25 },
      { month: '4月', users: 40 },
      { month: '5月', users: 60 },
      { month: '6月', users: 75 }
    ];
    
    // 策略活动数据
    const strategyActivityData = [
      { month: '1月', created: 5, backtested: 3, deployed: 2 },
      { month: '2月', created: 8, backtested: 5, deployed: 3 },
      { month: '3月', created: 12, backtested: 8, deployed: 5 },
      { month: '4月', created: 15, backtested: 10, deployed: 7 },
      { month: '5月', created: 20, backtested: 14, deployed: 10 },
      { month: '6月', created: 25, backtested: 18, deployed: 12 }
    ];
    
    // 用户分段数据
    const userSegmentData = [
      { name: '高频交易者', value: 30 },
      { name: '长期投资者', value: 45 },
      { name: '策略开发者', value: 15 },
      { name: '初学者', value: 10 }
    ];
    
    // 关键指标
    const keyMetrics = {
      totalRevenue: 150000,
      avgUserValue: 3000,
      conversionRate: 15,
      retentionRate: 78
    };
    
    res.json({
      userGrowth: userGrowthData,
      strategyActivity: strategyActivityData,
      userSegment: userSegmentData,
      keyMetrics: keyMetrics
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新用户状态
exports.updateUserStatus = async (req, res) => {
  try {
    const { active } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      message: '用户状态更新成功',
      user
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 模拟数据版本的方法
exports.mock = {
  getAllUsers: (req, res) => {
    res.json(mockUsers);
  },
  
  getUserById: (req, res) => {
    const user = mockUsers.find(u => u._id === req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  },
  
  updateUserRole: (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: '角色必须是user或admin' });
    }

    const userIndex = mockUsers.findIndex(u => u._id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }

    mockUsers[userIndex].role = role;
    res.json({
      message: '用户角色更新成功',
      user: mockUsers[userIndex]
    });
  },
  
  deleteUser: (req, res) => {
    const userIndex = mockUsers.findIndex(u => u._id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }

    mockUsers.splice(userIndex, 1);
    res.json({ message: '用户删除成功' });
  },
  
  getAllStrategies: (req, res) => {
    res.json(mockStrategies);
  },
  
  reviewStrategy: (req, res) => {
    const { approved, comment } = req.body;
    const strategyIndex = mockStrategies.findIndex(s => s._id === req.params.id);
    
    if (strategyIndex === -1) {
      return res.status(404).json({ message: '策略不存在' });
    }

    mockStrategies[strategyIndex].approved = approved;
    mockStrategies[strategyIndex].reviewComment = comment;
    mockStrategies[strategyIndex].reviewedBy = req.user.id;
    mockStrategies[strategyIndex].reviewedAt = new Date().toISOString();

    res.json({
      message: '策略审核状态更新成功',
      strategy: mockStrategies[strategyIndex]
    });
  },
  
  getStats: (req, res) => {
    res.json({
      userCount: mockUsers.length,
      strategyCount: mockStrategies.length,
      activeUsers: mockUsers.filter(u => u.balance > 0).length,
      activeStrategies: mockStrategies.filter(s => s.status === '已启用').length
    });
  },
  
  getAnalytics: (req, res) => {
    const { startDate, endDate } = req.query;
    
    // 模拟的用户增长数据
    const userGrowthData = [
      { month: '1月', users: 10 },
      { month: '2月', users: 15 },
      { month: '3月', users: 25 },
      { month: '4月', users: 40 },
      { month: '5月', users: 60 },
      { month: '6月', users: 75 }
    ];
    
    // 策略活动数据
    const strategyActivityData = [
      { month: '1月', created: 5, backtested: 3, deployed: 2 },
      { month: '2月', created: 8, backtested: 5, deployed: 3 },
      { month: '3月', created: 12, backtested: 8, deployed: 5 },
      { month: '4月', created: 15, backtested: 10, deployed: 7 },
      { month: '5月', created: 20, backtested: 14, deployed: 10 },
      { month: '6月', created: 25, backtested: 18, deployed: 12 }
    ];
    
    // 用户分段数据
    const userSegmentData = [
      { name: '高频交易者', value: 30 },
      { name: '长期投资者', value: 45 },
      { name: '策略开发者', value: 15 },
      { name: '初学者', value: 10 }
    ];
    
    // 关键指标
    const keyMetrics = {
      totalRevenue: 150000,
      avgUserValue: 3000,
      conversionRate: 15,
      retentionRate: 78
    };
    
    res.json({
      userGrowth: userGrowthData,
      strategyActivity: strategyActivityData,
      userSegment: userSegmentData,
      keyMetrics: keyMetrics
    });
  },
  
  // 模拟更新用户状态
  updateUserStatus: (req, res) => {
    const { active } = req.body;
    const userIndex = mockUsers.findIndex(u => u._id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    mockUsers[userIndex].active = active;
    res.json({
      message: '用户状态更新成功',
      user: mockUsers[userIndex]
    });
  }
};