// 策略控制器
const Strategy = require('../models/Strategy');

// 获取所有策略
exports.getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find({ user: req.user.id });
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个策略
exports.getStrategyById = async (req, res) => {
  try {
    const strategy = await Strategy.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新策略
exports.createStrategy = async (req, res) => {
  try {
    const { name, description, type, code, parameters, status } = req.body;
    
    const strategy = new Strategy({
      name,
      description,
      type,
      code,
      parameters,
      status,
      user: req.user.id
    });
    
    await strategy.save();
    
    res.status(201).json({
      message: '策略创建成功',
      strategy
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新策略
exports.updateStrategy = async (req, res) => {
  try {
    const { name, description, type, code, parameters, status } = req.body;
    
    const strategy = await Strategy.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    strategy.name = name || strategy.name;
    strategy.description = description || strategy.description;
    strategy.type = type || strategy.type;
    strategy.code = code || strategy.code;
    strategy.parameters = parameters || strategy.parameters;
    strategy.status = status || strategy.status;
    strategy.updatedAt = Date.now();
    
    await strategy.save();
    
    res.json({
      message: '策略更新成功',
      strategy
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除策略
exports.deleteStrategy = async (req, res) => {
  try {
    const strategy = await Strategy.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json({ message: '策略删除成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};