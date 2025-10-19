// 策略控制器
const Strategy = require('../models/Strategy');
const Template = require('../models/Template');
const Category = require('../models/Category');

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

// 从模板克隆策略
exports.cloneFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    // 加载模板
    const template = await Template.findById(templateId).populate('category');
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    // 非管理员只能从已发布模板或自己的模板克隆
    if (req.user.role !== 'admin' && template.author.toString() !== req.user.id.toString() && template.status !== 'published') {
      return res.status(403).json({ message: '无权限从该模板克隆策略' });
    }

    // 映射模板分类到策略类型（如无匹配则默认“技术指标”）
    const allowedTypes = ['技术指标', '机器学习', '统计套利', '事件驱动'];
    const mappedType = allowedTypes.includes(template.category?.name)
      ? template.category.name
      : '技术指标';

    // 创建策略
    const strategy = new Strategy({
      name: `${template.name}（克隆策略）`,
      description: template.description || '由模板克隆生成的策略',
      type: mappedType,
      code: template.code,
      parameters: template.params || {},
      status: '未启用',
      user: req.user.id
    });

    await strategy.save();

    res.status(201).json({
      message: '策略已从模板克隆',
      strategy
    });
  } catch (error) {
    console.error('克隆策略失败:', error);
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