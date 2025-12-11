// 持仓控制器
const mongoose = require('mongoose');
let Position = null;

// 加载真实模型
const loadRealModels = async function() {
  try {
    // 始终加载真实模型
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    if (mongoose.connection.readyState === 1) {
      // 数据库已连接，尝试加载Position模型
      console.log('MongoDB已连接，尝试加载真实Position模型...');
      
      // 单独检查和加载Position模型
      if (!Position || !Position.findOne) {
        try {
          // 首先检查是否已经在全局注册了Position模型
          if (mongoose.models.Position) {
            Position = mongoose.models.Position;
            console.log('成功加载已注册的Position模型');
          } else {
            // 安全地加载Position模型
            try {
              delete require.cache[require.resolve('../models/Position')];
              Position = require('../models/Position');
              console.log('成功从文件加载Position模型');
            } catch (err) {
              console.error('重新加载Position模型失败，尝试直接加载:', err.message);
              Position = require('../models/Position');
            }
          }
        } catch (err) {
          console.error('加载Position模型失败:', err.message);
          throw err;
        }
      }
      
      console.log('Position模型加载成功');
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

// 保存/更新持仓信息
exports.savePosition = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const positionData = req.body;
    
    // 验证必填参数
    const requiredFields = ['strategiesId', 'userId', 'gatewayName', 'symbol', 'exchange', 'direction', 'volume', 'price', 'changeType'];
    const missingFields = requiredFields.filter(field => !positionData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必要参数: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    // 验证方向枚举值
    const validDirections = ['LONG', 'SHORT'];
    if (!validDirections.includes(positionData.direction)) {
      return res.status(400).json({ 
        message: `direction 必须是以下值之一: ${validDirections.join(', ')}`
      });
    }
    
    // 验证变动类型枚举值
    const validChangeTypes = ['TRADE', 'PRICE_CHANGE', 'INITIAL'];
    if (!validChangeTypes.includes(positionData.changeType)) {
      return res.status(400).json({ 
        message: `changeType 必须是以下值之一: ${validChangeTypes.join(', ')}`
      });
    }
    
    // 验证数值字段
    if (positionData.volume <= 0) {
      return res.status(400).json({ 
        message: 'volume 必须大于 0'
      });
    }
    
    if (positionData.price <= 0) {
      return res.status(400).json({ 
        message: 'price 必须大于 0'
      });
    }
    
    // 使用 upsert 操作保存/更新持仓
    const position = await Position.findOneAndUpdate(
      { 
        strategiesId: positionData.strategiesId,
        userId: positionData.userId,
        gatewayName: positionData.gatewayName,
        symbol: positionData.symbol
      },
      positionData,
      { 
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    
    res.status(201).json({ 
      message: '持仓信息保存成功',
      position
    });
  } catch (error) {
    console.error('保存持仓信息失败:', error);
    res.status(500).json({ 
      message: '保存持仓信息失败',
      error: error.message
    });
  }
};

// 获取持仓列表
exports.getPositions = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    // 获取查询参数
    const { strategyId, userId, gatewayName, symbol, exchange, direction } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (strategyId) query.strategiesId = strategyId;
    if (userId) query.userId = userId;
    if (gatewayName) query.gatewayName = gatewayName;
    if (symbol) query.symbol = symbol;
    if (exchange) query.exchange = exchange;
    if (direction) query.direction = direction;
    
    // 查询持仓
    const positions = await Position.find(query).sort({ updatedAt: -1 });
    
    res.json({ 
      message: '获取持仓列表成功',
      positions
    });
  } catch (error) {
    console.error('获取持仓列表失败:', error);
    res.status(500).json({ 
      message: '获取持仓列表失败',
      error: error.message
    });
  }
};

// 获取单个持仓信息
exports.getPosition = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 查询持仓
    const position = await Position.findById(id);
    
    if (!position) {
      return res.status(404).json({ message: '持仓不存在' });
    }
    
    res.json({ 
      message: '获取持仓信息成功',
      position
    });
  } catch (error) {
    console.error('获取持仓信息失败:', error);
    res.status(500).json({ 
      message: '获取持仓信息失败',
      error: error.message
    });
  }
};

// 更新持仓信息
exports.updatePosition = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    const updateData = req.body;
    
    // 验证更新数据中的枚举值
    if (updateData.direction) {
      const validDirections = ['LONG', 'SHORT'];
      if (!validDirections.includes(updateData.direction)) {
        return res.status(400).json({ 
          message: `direction 必须是以下值之一: ${validDirections.join(', ')}`
        });
      }
    }
    
    if (updateData.changeType) {
      const validChangeTypes = ['TRADE', 'PRICE_CHANGE', 'INITIAL'];
      if (!validChangeTypes.includes(updateData.changeType)) {
        return res.status(400).json({ 
          message: `changeType 必须是以下值之一: ${validChangeTypes.join(', ')}`
        });
      }
    }
    
    // 验证数值字段
    if (updateData.volume !== undefined && updateData.volume <= 0) {
      return res.status(400).json({ 
        message: 'volume 必须大于 0'
      });
    }
    
    if (updateData.price !== undefined && updateData.price <= 0) {
      return res.status(400).json({ 
        message: 'price 必须大于 0'
      });
    }
    
    // 更新持仓
    const position = await Position.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true
    });
    
    if (!position) {
      return res.status(404).json({ message: '持仓不存在' });
    }
    
    res.json({ 
      message: '更新持仓信息成功',
      position
    });
  } catch (error) {
    console.error('更新持仓信息失败:', error);
    res.status(500).json({ 
      message: '更新持仓信息失败',
      error: error.message
    });
  }
};

// 删除持仓信息
exports.deletePosition = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 删除持仓
    const position = await Position.findByIdAndDelete(id);
    
    if (!position) {
      return res.status(404).json({ message: '持仓不存在' });
    }
    
    res.json({ message: '删除持仓信息成功' });
  } catch (error) {
    console.error('删除持仓信息失败:', error);
    res.status(500).json({ 
      message: '删除持仓信息失败',
      error: error.message
    });
  }
};

// 批量删除指定策略的持仓
exports.deletePositionsByStrategy = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { strategyId } = req.params;
    
    // 删除指定策略的所有持仓
    const result = await Position.deleteMany({ strategiesId: strategyId });
    
    res.json({
      message: `成功删除 ${result.deletedCount} 个持仓`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('批量删除持仓信息失败:', error);
    res.status(500).json({ 
      message: '批量删除持仓信息失败',
      error: error.message
    });
  }
};

// 获取指定策略的持仓列表
exports.getPositionsByStrategy = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { strategyId } = req.params;
    
    // 查询指定策略的持仓
    const positions = await Position.find({ strategiesId: strategyId }).sort({ updatedAt: -1 });
    
    res.json({ 
      message: `获取策略${strategyId}的持仓列表成功`,
      positions
    });
  } catch (error) {
    console.error('获取策略持仓列表失败:', error);
    res.status(500).json({ 
      message: '获取策略持仓列表失败',
      error: error.message
    });
  }
};

// 初始化持仓模块
exports.initialize = async () => {
  try {
    console.log('持仓模块初始化...');
    
    // 加载数据库模型
    await loadRealModels();
    
    console.log('持仓模块初始化完成');
  } catch (error) {
    console.log('初始化持仓模块时出错:', error.message);
    throw error;
  }
};

// 在文件末尾调用初始化函数，确保所有函数都已定义
// 由于initialize是异步函数，我们需要使用IIFE来处理异步初始化
(async () => {
  try {
    await exports.initialize();
  } catch (error) {
    console.error('异步初始化持仓模块失败:', error.message);
  }
})();
