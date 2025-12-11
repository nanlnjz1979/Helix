// 订单控制器
const mongoose = require('mongoose');
let Order = null;

// 加载真实模型
const loadRealModels = async function() {
  try {
    // 始终加载真实模型
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    if (mongoose.connection.readyState === 1) {
      // 数据库已连接，尝试加载Order模型
      console.log('MongoDB已连接，尝试加载真实Order模型...');
      
      // 单独检查和加载Order模型
      if (!Order || !Order.findOne) {
        try {
          // 首先检查是否已经在全局注册了Order模型
          if (mongoose.models.Order) {
            Order = mongoose.models.Order;
            console.log('成功加载已注册的Order模型');
          } else {
            // 安全地加载Order模型
            try {
              delete require.cache[require.resolve('../models/Order')];
              Order = require('../models/Order');
              console.log('成功从文件加载Order模型');
            } catch (err) {
              console.error('重新加载Order模型失败，尝试直接加载:', err.message);
              Order = require('../models/Order');
            }
          }
        } catch (err) {
          console.error('加载Order模型失败:', err.message);
          throw err;
        }
      }
      
      console.log('Order模型加载成功');
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

// 创建订单
exports.createOrder = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    // 验证请求数据
    const { strategyId, gatewayName, symbol, exchange, orderId, type, direction, offset, price, volume, commission = 0 } = req.body;
    
    // 检查缺少的参数或无效值
    const errors = [];
    
    // 检查必填字符串字段是否为空
    if (!strategyId || strategyId === '') {
      errors.push({ field: 'strategyId', message: 'strategyId 不能为空' });
    } else {
      // 验证 strategyId 是否为有效的 ObjectId 格式
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(strategyId)) {
        errors.push({ field: 'strategyId', message: 'strategyId 必须是有效的 ObjectId 格式' });
      }
    }
    
    if (!gatewayName || gatewayName === '') {
      errors.push({ field: 'gatewayName', message: 'gatewayName 不能为空' });
    }
    
    if (!symbol || symbol === '') {
      errors.push({ field: 'symbol', message: 'symbol 不能为空' });
    }
    
    if (!exchange || exchange === '') {
      errors.push({ field: 'exchange', message: 'exchange 不能为空' });
    }
    
    if (!orderId || orderId === '') {
      errors.push({ field: 'orderId', message: 'orderId 不能为空' });
    }
    
    if (!type || type === '') {
      errors.push({ field: 'type', message: 'type 不能为空' });
    }
    
    if (!direction || direction === '') {
      errors.push({ field: 'direction', message: 'direction 不能为空' });
    } else {
      // 验证 direction 是否为有效的枚举值
      const validDirections = ['多', '空',"buy","sell"];
      if (!validDirections.includes(direction)) {
        errors.push({ field: 'direction', message: `direction 必须是以下值之一: ${validDirections.join(', ')}` });
      }
    }
    
    if (!offset || offset === '') {
      errors.push({ field: 'offset', message: 'offset 不能为空' });
    } else {
      // 验证 offset 是否为有效的枚举值
      const validOffsets = ['open', 'close','开','平'];
      if (!validOffsets.includes(offset)) {
        errors.push({ field: 'offset', message: `offset 必须是以下值之一: ${validOffsets.join(', ')}` });
      }
    }
    
    // 验证 price 是否为有效的数字
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
      errors.push({ field: 'price', message: 'price 必须是大于 0 的数字' });
    }
    
    // 验证 volume 是否为有效的数字
    if (volume === undefined || volume === null || isNaN(Number(volume)) || Number(volume) <= 0) {
      errors.push({ field: 'volume', message: 'volume 必须是大于 0 的数字' });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: '请求参数无效',
        errors: errors
      });
    }
    
    // 创建订单对象
    const orderData = {
      strategyId,
      gatewayName,
      symbol,
      exchange,
      orderId,
      type,
      direction,
      offset,
      price,
      volume,
      traded: 0,
      status: 'SUBMITTING',
      datetime: new Date(),
      commission
    };
    
    // 创建订单
    const order = new Order(orderData);
    await order.save();
    
    res.status(201).json({
      message: '订单创建成功',
      order
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({
      message: '创建订单失败',
      error: error.message
    });
  }
};

// 获取订单列表
exports.getOrders = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    // 获取查询参数
    const { strategyId, orderId, symbol, status, page = 1, limit = 20 } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (strategyId) query.strategyId = strategyId;
    if (orderId) query.orderId = orderId;
    if (symbol) query.symbol = symbol;
    if (status) query.status = status;
    
    // 计算分页参数
    const skip = (page - 1) * limit;
    
    // 查询订单
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('strategyId', 'name type');
    
    // 获取总数量
    const total = await Order.countDocuments(query);
    
    res.json({
      message: '获取订单列表成功',
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({
      message: '获取订单列表失败',
      error: error.message
    });
  }
};

// 获取单个订单
exports.getOrder = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 查询订单
    const order = await Order.findById(id).populate('strategyId', 'name type');
    
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }
    
    res.json({
      message: '获取订单成功',
      order
    });
  } catch (error) {
    console.error('获取订单错误:', error);
    res.status(500).json({
      message: '获取订单失败',
      error: error.message
    });
  }
};

// 更新订单
exports.updateOrder = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    const updateData = req.body;
    
    // 验证更新数据
    const allowedFields = ['status', 'traded', 'commission'];
    const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ message: `不允许更新的字段: ${invalidFields.join(', ')}` });
    }
    
    // 更新订单
    const order = await Order.findByIdAndUpdate(id, updateData, { new: true }).populate('strategyId', 'name type');
    
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }
    
    res.json({
      message: '订单更新成功',
      order
    });
  } catch (error) {
    console.error('更新订单错误:', error);
    res.status(500).json({
      message: '更新订单失败',
      error: error.message
    });
  }
};

// 删除订单
exports.deleteOrder = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { id } = req.params;
    
    // 删除订单
    const order = await Order.findByIdAndDelete(id);
    
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }
    
    res.json({
      message: '订单删除成功'
    });
  } catch (error) {
    console.error('删除订单错误:', error);
    res.status(500).json({
      message: '删除订单失败',
      error: error.message
    });
  }
};

// 批量删除指定策略的订单
exports.deleteOrdersByStrategy = async (req, res) => {
  try {
    // 加载真实模型
    await loadRealModels();
    
    const { strategyId } = req.params;
    
    // 删除指定策略的所有订单
    const result = await Order.deleteMany({ strategyId });
    
    res.json({
      message: `成功删除 ${result.deletedCount} 个订单`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('批量删除订单错误:', error);
    res.status(500).json({
      message: '批量删除订单失败',
      error: error.message
    });
  }
};

// 初始化订单模块
exports.initialize = async () => {
  try {
    console.log('订单模块初始化...');
    
    // 加载数据库模型
    await loadRealModels();
    
    console.log('订单模块初始化完成');
  } catch (error) {
    console.log('初始化订单模块时出错:', error.message);
    throw error;
  }
};

// 在文件末尾调用初始化函数，确保所有函数都已定义
// 由于initialize是异步函数，我们需要使用IIFE来处理异步初始化
(async () => {
  try {
    await exports.initialize();
  } catch (error) {
    console.error('异步初始化订单模块失败:', error.message);
  }
})();
