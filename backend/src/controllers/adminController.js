// 管理员控制器

// 初始化用户和策略模型
let mongoose = null;
let User = null;
let Strategy = null;

// 加载真实模型
exports.loadRealModels = async function() {
  try {
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    // 加载User模型
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
        throw err;
      }
    }
    
    // 加载Strategy模型
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
        throw err;
      }
    }
    
    return true;
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    console.error('完整错误:', error);
    throw error;
  }
}

// 获取所有用户列表
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    // 加载真实模型
    await exports.loadRealModels();

    // 构建查询条件
    const query = {};
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }

    // 获取用户列表
    const users = await User.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('-password');
    
    const totalUsers = await User.countDocuments(query);

    res.json({
      users,
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / parseInt(limit))
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
    
    // 加载真实模型
    await exports.loadRealModels();

    const user = await User.findById(id).select('-password');

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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 真实模式
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role, active, balance },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: '用户不存在' });
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 真实模式
    const deletedUser = await User.findByIdAndDelete(id).select('-password');
    
    if (!deletedUser) {
      return res.status(404).json({ message: '用户不存在' });
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 构建查询条件
    const query = {};
    if (status) {
      query.status = status;
    }
    if (userId) {
      query.userId = userId;
    }

    // 真实模式
    const strategies = await Strategy.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const totalStrategies = await Strategy.countDocuments(query);

    res.json({
      strategies,
      total: totalStrategies,
      page: parseInt(page),
      pages: Math.ceil(totalStrategies / parseInt(limit))
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 真实模式
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedStrategy) {
      return res.status(404).json({ message: '策略不存在' });
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 构建查询条件
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 过滤掉admin用户
    query.role = 'user';

    // 从数据库获取真实数据
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
    const userGrowthData = monthlyUserStats.map(item => ({
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
    const strategyActivityData = monthlyStrategyStats.map(item => ({
      month: `${item._id.month}月`,
      created: item.created,
      backtested: item.backtested,
      deployed: item.deployed
    }));

    // 3. 获取用户分段数据（简单的模拟，实际项目中可以根据真实的用户行为进行分段）
    const userSegmentData = [
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
    const keyMetrics = {
      totalRevenue: 150000, // 示例数据
      avgUserValue: totalUsers > 0 ? Math.floor(150000 / totalUsers) : 0,
      conversionRate: totalUsers > 0 ? Math.floor((activeStrategies / totalUsers) * 100) : 0,
      retentionRate: totalUsers > 0 ? Math.floor((activeUsers / totalUsers) * 100) : 0
    };

    res.json({
      userGrowth: userGrowthData,
      strategyActivity: strategyActivityData,
      userSegment: userSegmentData,
      keyMetrics: keyMetrics
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 真实模式
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { approved, reviewComment: comment },
      { new: true }
    );
    
    if (!updatedStrategy) {
      return res.status(404).json({ message: '策略不存在' });
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
    
    // 加载真实模型
    await exports.loadRealModels();

    // 真实模式
    const deletedStrategy = await Strategy.findByIdAndDelete(id);
    
    if (!deletedStrategy) {
      return res.status(404).json({ message: '策略不存在' });
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
exports.initialize = async () => {
  try {
    console.log('管理员控制器初始化...');
    
    // 加载真实模型
    await exports.loadRealModels();
    
    console.log('管理员控制器初始化完成');
  } catch (error) {
    console.log('初始化管理员控制器时出错:', error.message);
    throw error;
  }
};