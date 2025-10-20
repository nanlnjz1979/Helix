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
    const { name } = req.body || {};

    // 加载模板
    const template = await Template.findById(templateId).populate('category');
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    // 非管理员只能从已发布模板或自己的模板克隆
    if (req.user.role !== 'admin' && template.author.toString() !== req.user.id.toString() && template.status !== 'published') {
      return res.status(403).json({ message: '无权限从该模板克隆策略' });
    }

    // 生成默认名称（模板名 + 用户名 + 日期时间），若请求体提供name则使用之
    let finalName = null;
    try {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        finalName = name.trim();
      } else {
        const User = require('../models/User');
        const userDoc = await User.findById(req.user.id).select('username email');
        const username = userDoc?.username || userDoc?.email || '用户';
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        finalName = `${template.name}+${username}+${ts}`;
      }
    } catch (e) {
      // 回退到旧的命名方式
      finalName = `${template.name}（克隆策略）`;
    }

    // 创建策略
    const strategy = new Strategy({
      name: finalName,
      description: template.description || '由模板克隆生成的策略',
      type: template.category?.name,
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