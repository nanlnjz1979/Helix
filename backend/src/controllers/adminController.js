// 管理员控制器

// 初始化用户和策略模型状态
let isMockMode = true;
let mockUsers = [];
let mockStrategies = [];
let mongoose = null;
let User = null;
let Strategy = null;

// 初始化模拟用户数据
function initMockUsers() {
  return [
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
}

// 初始化模拟策略数据
function initMockStrategies() {
  return [
    {
      _id: '1',
      name: '均值回归策略',
      description: '基于价格波动和均值回归的交易策略',
      status: 'active',
      profitRate: 0.12,
      totalInvest: 50000,
      userId: '2',
      approved: true,
      createdAt: new Date('2023-06-01').toISOString()
    },
    {
      _id: '2',
      name: '趋势跟踪策略',
      description: '跟踪市场趋势，顺势而为',
      status: 'active',
      profitRate: 0.08,
      totalInvest: 100000,
      userId: '2',
      approved: true,
      createdAt: new Date('2023-06-15').toISOString()
    },
    {
      _id: '3',
      name: '动量策略',
      description: '利用市场动量效应',
      status: 'pending',
      profitRate: 0,
      totalInvest: 0,
      userId: '3',
      approved: false,
      createdAt: new Date('2023-07-01').toISOString()
    },
    {
      _id: '4',
      name: '统计套利策略',
      description: '基于统计模型的套利策略',
      status: 'pending',
      profitRate: 0,
      totalInvest: 0,
      userId: '4',
      approved: false,
      createdAt: new Date('2023-07-10').toISOString()
    },
    {
      _id: '5',
      name: '波动率交易策略',
      description: '基于市场波动率变化的交易策略',
      status: 'active',
      profitRate: 0.15,
      totalInvest: 75000,
      userId: '5',
      approved: true,
      createdAt: new Date('2023-06-20').toISOString()
    }
  ];
}

// 模拟User模型
function createMockUserModel() {
  return {
    find: async (query = {}, projection = {}) => {
      let users = [...mockUsers];
      // 简单的查询过滤
      if (query.role) {
        users = users.filter(user => user.role === query.role);
      }
      if (query.active !== undefined) {
        users = users.filter(user => user.active === query.active);
      }
      if (query.username) {
        users = users.filter(user => user.username.includes(query.username));
      }
      // 简单的分页
      if (query.page && query.limit) {
        const startIndex = (query.page - 1) * query.limit;
        users = users.slice(startIndex, startIndex + query.limit);
      }
      return users;
    },
    findById: async (id) => {
      return mockUsers.find(user => user._id === id);
    },
    findByIdAndUpdate: async (id, updateData) => {
      const userIndex = mockUsers.findIndex(user => user._id === id);
      if (userIndex === -1) {
        return null;
      }
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updateData };
      return mockUsers[userIndex];
    },
    findByIdAndDelete: async (id) => {
      const userIndex = mockUsers.findIndex(user => user._id === id);
      if (userIndex === -1) {
        return null;
      }
      const deletedUser = mockUsers[userIndex];
      mockUsers.splice(userIndex, 1);
      return deletedUser;
    },
    countDocuments: async (query = {}) => {
      if (query.role) {
        return mockUsers.filter(user => user.role === query.role).length;
      }
      if (query.active !== undefined) {
        return mockUsers.filter(user => user.active === query.active).length;
      }
      return mockUsers.length;
    }
  };
}

// 模拟Strategy模型
function createMockStrategyModel() {
  return {
    find: async (query = {}, projection = {}) => {
      let strategies = [...mockStrategies];
      // 简单的查询过滤
      if (query.userId) {
        strategies = strategies.filter(strategy => strategy.userId === query.userId);
      }
      if (query.status) {
        strategies = strategies.filter(strategy => strategy.status === query.status);
      }
      // 简单的分页
      if (query.page && query.limit) {
        const startIndex = (query.page - 1) * query.limit;
        strategies = strategies.slice(startIndex, startIndex + query.limit);
      }
      return strategies;
    },
    findById: async (id) => {
      return mockStrategies.find(strategy => strategy._id === id);
    },
    findByIdAndUpdate: async (id, updateData) => {
      const strategyIndex = mockStrategies.findIndex(strategy => strategy._id === id);
      if (strategyIndex === -1) {
        return null;
      }
      mockStrategies[strategyIndex] = { ...mockStrategies[strategyIndex], ...updateData };
      return mockStrategies[strategyIndex];
    },
    findByIdAndDelete: async (id) => {
      const strategyIndex = mockStrategies.findIndex(strategy => strategy._id === id);
      if (strategyIndex === -1) {
        return null;
      }
      const deletedStrategy = mockStrategies[strategyIndex];
      mockStrategies.splice(strategyIndex, 1);
      return deletedStrategy;
    },
    countDocuments: async (query = {}) => {
      if (query.userId) {
        return mockStrategies.filter(strategy => strategy.userId === query.userId).length;
      }
      if (query.status) {
        return mockStrategies.filter(strategy => strategy.status === query.status).length;
      }
      return mockStrategies.length;
    }
  };
}

// 尝试加载真实模型
async function tryLoadRealModels() {
  try {
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    // 检查是否已在mongoose.models中存在模型
    if (mongoose.connection.readyState === 1) {
      // 单独检查和加载User模型
      if (!User) {
        try {
          // 首先检查是否已经在全局注册了User模型
          if (mongoose.models.User) {
            User = mongoose.models.User;
          } else {
            delete require.cache[require.resolve('../models/User')];
            User = require('../models/User');
          }
        } catch (err) {
          console.error('加载User模型失败:', err.message);
        }
      }
      
      // 单独检查和加载Strategy模型
      if (!Strategy) {
        try {
          // 首先检查是否已经在全局注册了Strategy模型
          if (mongoose.models.Strategy) {
            Strategy = mongoose.models.Strategy;
          } else {
            delete require.cache[require.resolve('../models/Strategy')];
            Strategy = require('../models/Strategy');
          }
        } catch (err) {
          console.error('加载Strategy模型失败:', err.message);
        }
      }
      
      return User && Strategy;
    }
    return false;
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    console.error('完整错误:', error);
    return false;
  }
}

// 获取所有用户列表
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    // 构建查询条件
    const query = {};
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }

    // 获取用户列表
    let users, totalUsers;
    if (isMockMode) {
      // 模拟模式
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      // 先获取总数
      totalUsers = mockUsers.length;
      
      // 应用搜索过滤
      let filteredUsers = mockUsers;
      if (search) {
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (role) {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }
      
      // 分页
      const startIndex = (pageNum - 1) * limitNum;
      users = filteredUsers.slice(startIndex, startIndex + limitNum);
    } else {
      // 真实模式
      users = await User.find(query)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('-password');
      
      totalUsers = await User.countDocuments(query);
    }

    res.json({
      users,
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / parseInt(limit)),
      mode: isMockMode ? 'mock' : 'real'
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个用户详情
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let user;
    if (isMockMode) {
      // 模拟模式
      user = mockUsers.find(user => user._id === id);
    } else {
      // 真实模式
      user = await User.findById(id).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新用户信息
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, active, balance } = req.body;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let updatedUser;
    if (isMockMode) {
      // 模拟模式
      const userIndex = mockUsers.findIndex(user => user._id === id);
      if (userIndex === -1) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      // 更新用户信息
      if (role !== undefined) mockUsers[userIndex].role = role;
      if (active !== undefined) mockUsers[userIndex].active = active;
      if (balance !== undefined) mockUsers[userIndex].balance = balance;
      
      updatedUser = mockUsers[userIndex];
    } else {
      // 真实模式
      updatedUser = await User.findByIdAndUpdate(
        id,
        { role, active, balance },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return res.status(404).json({ message: '用户不存在' });
      }
    }

    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let deletedUser;
    if (isMockMode) {
      // 模拟模式
      const userIndex = mockUsers.findIndex(user => user._id === id);
      if (userIndex === -1) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      deletedUser = mockUsers.splice(userIndex, 1)[0];
    } else {
      // 真实模式
      deletedUser = await User.findByIdAndDelete(id).select('-password');
      
      if (!deletedUser) {
        return res.status(404).json({ message: '用户不存在' });
      }
    }

    res.json({
      message: '用户删除成功',
      user: deletedUser
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取所有策略列表
exports.getAllStrategies = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', userId = '' } = req.query;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    // 构建查询条件
    const query = {};
    if (status) {
      query.status = status;
    }
    if (userId) {
      query.userId = userId;
    }

    let strategies, totalStrategies;
    if (isMockMode) {
      // 模拟模式
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      // 先获取总数
      totalStrategies = mockStrategies.length;
      
      // 应用过滤
      let filteredStrategies = mockStrategies;
      if (status) {
        filteredStrategies = filteredStrategies.filter(strategy => strategy.status === status);
      }
      if (userId) {
        filteredStrategies = filteredStrategies.filter(strategy => strategy.userId === userId);
      }
      
      // 分页
      const startIndex = (pageNum - 1) * limitNum;
      strategies = filteredStrategies.slice(startIndex, startIndex + limitNum);
    } else {
      // 真实模式
      strategies = await Strategy.find(query)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));
      
      totalStrategies = await Strategy.countDocuments(query);
    }

    res.json({
      strategies,
      total: totalStrategies,
      page: parseInt(page),
      pages: Math.ceil(totalStrategies / parseInt(limit)),
      mode: isMockMode ? 'mock' : 'real'
    });
  } catch (error) {
    console.error('获取策略列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新策略状态
exports.updateStrategyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let updatedStrategy;
    if (isMockMode) {
      // 模拟模式
      const strategyIndex = mockStrategies.findIndex(strategy => strategy._id === id);
      if (strategyIndex === -1) {
        return res.status(404).json({ message: '策略不存在' });
      }
      
      mockStrategies[strategyIndex].status = status;
      updatedStrategy = mockStrategies[strategyIndex];
    } else {
      // 真实模式
      updatedStrategy = await Strategy.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!updatedStrategy) {
        return res.status(404).json({ message: '策略不存在' });
      }
    }

    res.json({
      message: '策略状态更新成功',
      strategy: updatedStrategy
    });
  } catch (error) {
    console.error('更新策略状态错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取分析数据
exports.getAnalyticsData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    // 构建查询条件
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 过滤掉admin用户
    query.role = 'user';

    let userGrowthData = [];
    let strategyActivityData = [];
    let userSegmentData = [];
    let keyMetrics = {};

    if (isMockMode) {
      // 模拟模式 - 生成更丰富的模拟数据以模拟真实场景
      const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
      
      // 用户增长数据
      userGrowthData = months.map((month, index) => ({
        month: month,
        users: Math.floor(10 * Math.pow(1.5, index))
      }));
      
      // 策略活动数据
      strategyActivityData = months.map((month, index) => ({
        month: month,
        created: Math.floor(5 * Math.pow(1.4, index)),
        backtested: Math.floor(3 * Math.pow(1.4, index)),
        deployed: Math.floor(2 * Math.pow(1.4, index))
      }));
      
      // 用户分段数据
      userSegmentData = [
        { name: '高频交易者', value: 30 },
        { name: '长期投资者', value: 45 },
        { name: '策略开发者', value: 15 },
        { name: '初学者', value: 10 }
      ];
      
      // 关键指标
      keyMetrics = {
        totalRevenue: 150000,
        avgUserValue: 3000,
        conversionRate: 15,
        retentionRate: 78
      };
    } else {
      // 真实模式 - 从数据库获取真实数据
      // 1. 获取用户增长数据（按月份分组）
      const monthlyUserStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // 格式化用户增长数据
      userGrowthData = monthlyUserStats.map(item => ({
        month: `${item._id.month}月`,
        users: item.count
      }));

      // 2. 获取策略活动数据（按月份分组）
      const monthlyStrategyStats = await Strategy.aggregate([
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            created: { $sum: 1 },
            backtested: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            deployed: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // 格式化策略活动数据
      strategyActivityData = monthlyStrategyStats.map(item => ({
        month: `${item._id.month}月`,
        created: item.created,
        backtested: item.backtested,
        deployed: item.deployed
      }));

      // 3. 获取用户分段数据（简单的模拟，实际项目中可以根据真实的用户行为进行分段）
      userSegmentData = [
        { name: '高频交易者', value: 30 },
        { name: '长期投资者', value: 45 },
        { name: '策略开发者', value: 15 },
        { name: '初学者', value: 10 }
      ];

      // 4. 计算关键指标
      const totalUsers = await User.countDocuments({ role: 'user' });
      const activeUsers = await User.countDocuments({ role: 'user', active: true });
      const totalStrategies = await Strategy.countDocuments();
      const activeStrategies = await Strategy.countDocuments({ status: 'active' });
      
      // 这里简单计算一些指标，实际项目中可以根据业务需求进行更复杂的计算
      keyMetrics = {
        totalRevenue: 150000, // 示例数据
        avgUserValue: totalUsers > 0 ? Math.floor(150000 / totalUsers) : 0,
        conversionRate: totalUsers > 0 ? Math.floor((activeStrategies / totalUsers) * 100) : 0,
        retentionRate: totalUsers > 0 ? Math.floor((activeUsers / totalUsers) * 100) : 0
      };
    }

    res.json({
      userGrowth: userGrowthData,
      strategyActivity: strategyActivityData,
      userSegment: userSegmentData,
      keyMetrics: keyMetrics,
      mode: isMockMode ? 'mock' : 'real'
    });
  } catch (error) {
    console.error('获取分析数据错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 审核策略
exports.reviewStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let updatedStrategy;
    if (isMockMode) {
      // 模拟模式
      const strategyIndex = mockStrategies.findIndex(strategy => strategy._id === id);
      if (strategyIndex === -1) {
        return res.status(404).json({ message: '策略不存在' });
      }
      
      mockStrategies[strategyIndex].approved = approved;
      mockStrategies[strategyIndex].reviewComment = comment;
      updatedStrategy = mockStrategies[strategyIndex];
    } else {
      // 真实模式
      updatedStrategy = await Strategy.findByIdAndUpdate(
        id,
        { approved, reviewComment: comment },
        { new: true }
      );
      
      if (!updatedStrategy) {
        return res.status(404).json({ message: '策略不存在' });
      }
    }

    res.json({
      message: '策略审核成功',
      strategy: updatedStrategy
    });
  } catch (error) {
    console.error('审核策略错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除策略
exports.deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试加载真实模型
    const hasRealModels = await tryLoadRealModels();
    isMockMode = !hasRealModels;

    let deletedStrategy;
    if (isMockMode) {
      // 模拟模式
      const strategyIndex = mockStrategies.findIndex(strategy => strategy._id === id);
      if (strategyIndex === -1) {
        return res.status(404).json({ message: '策略不存在' });
      }
      
      deletedStrategy = mockStrategies.splice(strategyIndex, 1)[0];
    } else {
      // 真实模式
      deletedStrategy = await Strategy.findByIdAndDelete(id);
      
      if (!deletedStrategy) {
        return res.status(404).json({ message: '策略不存在' });
      }
    }

    res.json({
      message: '策略删除成功',
      strategy: deletedStrategy
    });
  } catch (error) {
    console.error('删除策略错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化管理员控制器
exports.initialize = () => {
  try {
    console.log('管理员控制器初始化...');
    
    // 设置默认的模拟数据
    mockUsers = initMockUsers();
    mockStrategies = initMockStrategies();
    User = createMockUserModel();
    Strategy = createMockStrategyModel();
    isMockMode = true;
    
    console.log('管理员控制器初始化完成 - 默认使用模拟数据模式');
  } catch (error) {
    console.log('初始化管理员控制器时出错:', error.message);
    mockUsers = initMockUsers();
    mockStrategies = initMockStrategies();
    User = createMockUserModel();
    Strategy = createMockStrategyModel();
    isMockMode = true;
  }
};