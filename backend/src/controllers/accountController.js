// 资金账户控制器
const mongoose = require('mongoose');
let Account = null;

// 加载真实模型
const loadRealModels = async function() {
  try {
    // 始终加载真实模型
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    if (mongoose.connection.readyState === 1) {
      // 数据库已连接，尝试加载Account模型
      console.log('MongoDB已连接，尝试加载真实Account模型...');
      
      // 单独检查和加载Account模型
      if (!Account || !Account.findOne) {
        try {
          // 首先检查是否已经在全局注册了Account模型
          if (mongoose.models.Account) {
            Account = mongoose.models.Account;
            console.log('成功加载已注册的Account模型');
          } else {
            // 安全地加载Account模型
            try {
              delete require.cache[require.resolve('../models/Account')];
              Account = require('../models/Account');
              console.log('成功从文件加载Account模型');
            } catch (err) {
              console.error('重新加载Account模型失败，尝试直接加载:', err.message);
              Account = require('../models/Account');
            }
          }
        } catch (err) {
          console.error('加载Account模型失败:', err.message);
          throw err;
        }
      }
      
      console.log('Account模型加载成功');
    } else {
      console.log('MongoDB未连接（状态码:', mongoose.connection.readyState, '），无法使用真实数据库');
      throw new Error('MongoDB未连接');
    }
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    console.error('完整错误:', error);
    throw error;
  }
};

// 保存/更新账户信息
exports.saveAccount = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const accountData = req.body;
    
    // 验证必填参数
    const requiredFields = ['strategiesId', 'userId', 'gatewayName', 'changeType'];
    const missingFields = requiredFields.filter(field => !accountData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必要参数: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    // 验证状态枚举值
    if (accountData.status) {
      const validStatuses = ['ACTIVE', 'FROZEN', 'CLOSED', 'KILLPOS'];
      if (!validStatuses.includes(accountData.status)) {
        return res.status(400).json({ 
          message: `status 必须是以下值之一: ${validStatuses.join(', ')}`
        });
      }
    }
    
    // 验证变动类型枚举值
    const validChangeTypes = ['TRADE', 'DEPOSIT', 'WITHDRAW', 'INITIAL'];
    if (!validChangeTypes.includes(accountData.changeType)) {
      return res.status(400).json({ 
        message: `changeType 必须是以下值之一: ${validChangeTypes.join(', ')}`
      });
    }
    
    // 验证数值字段
    if (accountData.balance !== undefined && accountData.balance < 0) {
      return res.status(400).json({ 
        message: 'balance 不能为负数'
      });
    }
    
    if (accountData.available !== undefined && accountData.available < 0) {
      return res.status(400).json({ 
        message: 'available 不能为负数'
      });
    }
    
    if (accountData.frozen !== undefined && accountData.frozen < 0) {
      return res.status(400).json({ 
        message: 'frozen 不能为负数'
      });
    }
    
    // 使用 upsert 操作保存/更新账户
    const account = await Account.findOneAndUpdate(
      { 
        strategiesId: accountData.strategiesId,
        userId: accountData.userId,
        gatewayName: accountData.gatewayName
      },
      accountData,
      { 
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    
    res.status(201).json({ 
      message: '账户信息保存成功',
      account
    });
  } catch (error) {
    console.error('保存账户信息失败:', error);
    res.status(500).json({ 
      message: '保存账户信息失败',
      error: error.message
    });
  }
};

// 获取账户列表
exports.getAccounts = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    // 获取查询参数
    const { strategyId, userId, gatewayName, status } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (strategyId) query.strategiesId = strategyId;
    if (userId) query.userId = userId;
    if (gatewayName) query.gatewayName = gatewayName;
    if (status) query.status = status;
    
    // 查询账户
    const accounts = await Account.find(query).sort({ updatedAt: -1 });
    
    res.json({ 
      message: '获取账户列表成功',
      accounts
    });
  } catch (error) {
    console.error('获取账户列表失败:', error);
    res.status(500).json({ 
      message: '获取账户列表失败',
      error: error.message
    });
  }
};

// 获取单个账户信息
exports.getAccount = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 查询账户
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    res.json({ 
      message: '获取账户信息成功',
      account
    });
  } catch (error) {
    console.error('获取账户信息失败:', error);
    res.status(500).json({ 
      message: '获取账户信息失败',
      error: error.message
    });
  }
};

// 更新账户信息
exports.updateAccount = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    const updateData = req.body;
    
    // 验证更新数据中的枚举值
    if (updateData.status) {
      const validStatuses = ['ACTIVE', 'FROZEN', 'CLOSED', 'KILLPOS'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({ 
          message: `status 必须是以下值之一: ${validStatuses.join(', ')}`
        });
      }
    }
    
    if (updateData.changeType) {
      const validChangeTypes = ['TRADE', 'DEPOSIT', 'WITHDRAW', 'INITIAL'];
      if (!validChangeTypes.includes(updateData.changeType)) {
        return res.status(400).json({ 
          message: `changeType 必须是以下值之一: ${validChangeTypes.join(', ')}`
        });
      }
    }
    
    // 验证数值字段
    if (updateData.balance !== undefined && updateData.balance < 0) {
      return res.status(400).json({ 
        message: 'balance 不能为负数'
      });
    }
    
    if (updateData.available !== undefined && updateData.available < 0) {
      return res.status(400).json({ 
        message: 'available 不能为负数'
      });
    }
    
    if (updateData.frozen !== undefined && updateData.frozen < 0) {
      return res.status(400).json({ 
        message: 'frozen 不能为负数'
      });
    }
    
    // 更新账户
    const account = await Account.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true
    });
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    res.json({ 
      message: '更新账户信息成功',
      account
    });
  } catch (error) {
    console.error('更新账户信息失败:', error);
    res.status(500).json({ 
      message: '更新账户信息失败',
      error: error.message
    });
  }
};

// 删除账户信息
exports.deleteAccount = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 删除账户
    const account = await Account.findByIdAndDelete(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    res.json({ message: '删除账户信息成功' });
  } catch (error) {
    console.error('删除账户信息失败:', error);
    res.status(500).json({ 
      message: '删除账户信息失败',
      error: error.message
    });
  }
};

// 批量删除指定策略的账户
exports.deleteAccountsByStrategy = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { strategyId } = req.params;
    
    // 删除指定策略的所有账户
    const result = await Account.deleteMany({ strategiesId: strategyId });
    
    res.json({
      message: `成功删除 ${result.deletedCount} 个账户`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('批量删除账户信息失败:', error);
    res.status(500).json({ 
      message: '批量删除账户信息失败',
      error: error.message
    });
  }
};

// 获取指定用户的账户列表
exports.getAccountsByUser = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { userId } = req.params;
    
    // 查询指定用户的账户
    const accounts = await Account.find({ userId }).sort({ updatedAt: -1 });
    
    res.json({ 
      message: `获取用户${userId}的账户列表成功`,
      accounts
    });
  } catch (error) {
    console.error('获取用户账户列表失败:', error);
    res.status(500).json({ 
      message: '获取用户账户列表失败',
      error: error.message
    });
  }
};

// 通过策略ID获取策略信息
exports.getStrategyInfo = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { strategyId } = req.params;
    
    // 动态导入Strategy模型，避免循环依赖
    let Strategy = null;
    if (mongoose.models.Strategy) {
      Strategy = mongoose.models.Strategy;
    } else {
      Strategy = require('../models/Strategy');
    }
    
    // 查询策略信息
    const strategy = await Strategy.findById(strategyId);
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json({ 
      message: '获取策略信息成功',
      strategy
    });
  } catch (error) {
    console.error('获取策略信息失败:', error);
    res.status(500).json({ 
      message: '获取策略信息失败',
      error: error.message
    });
  }
};

// 初始化账户模块
exports.initialize = async () => {
  try {
    console.log('账户模块初始化...');
    
    // 加载数据库模型
    await loadRealModels();
    
    console.log('账户模块初始化完成');
  } catch (error) {
    console.log('初始化账户模块时出错:', error.message);
    throw error;
  }
};

// 在文件末尾调用初始化函数，确保所有函数都已定义
// 由于initialize是异步函数，我们需要使用IIFE来处理异步初始化
(async () => {
  try {
    await exports.initialize();
  } catch (error) {
    console.error('异步初始化账户模块失败:', error.message);
  }
})();
