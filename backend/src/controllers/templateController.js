// 模板控制器
const mongoose = require('mongoose');
const Template = require('../models/Template');
const Category = require('../models/Category');
const User = require('../models/User');

// 获取所有模板
const getAllTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', category = '', source = '', isPaid = '' } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 状态过滤
    if (status) {
      query.status = status;
    }
    
    // 分类过滤
    if (category) {
      query.category = category;
    }
    
    // 来源过滤
    if (source) {
      query.source = source;
    }
    
    // 收费过滤
    if (isPaid === 'paid') {
      query.isPaid = true;
      query.price = { $gt: 0 };
    } else if (isPaid === 'free') {
      query.isPaid = false;
      query.price = 0;
    }
    
    // 非管理员只能查看已发布的模板和自己创建的模板
    if (req.user.role !== 'admin') {
      query.$or = [
        { status: 'published' },
        { author: req.user._id }
      ];
    }
    
    // 分页查询
    const templates = await Template.find(query)
      .populate('author', 'username')
      .populate('category', 'name')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Template.countDocuments(query);
    
    res.json({
      templates,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板列表失败' });
  }
};

// 获取单个模板详情
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id)
      .populate('author', 'username')
      .populate('category', 'name');
    
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 检查权限：管理员或模板作者可以查看所有模板，其他用户只能查看已发布的模板
    if (req.user.role !== 'admin' && template.author.toString() !== req.user._id.toString() && template.status !== 'published') {
      return res.status(403).json({ message: '无权限查看该模板' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板详情失败' });
  }
};

// 创建新模板
const createTemplate = async (req, res) => {
  try {
    const { name, description, detailedDescription, category, version, code, params, metadata, settings, thumbnail, coverImage, riskLevel, isPaid, price } = req.body;
    
    // 验证必填字段
    if (!name || !description || !category || !code) {
      return res.status(400).json({ message: '模板名称、描述、分类和代码是必填项' });
    }
    
    // 验证策略类型是否存在
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: '指定的策略类型不存在' });
    }
    
    // 自动设置来源：管理员用户创建的模板默认为官方，其他用户创建的为用户分享
    const source = req.user.role === 'admin' ? 'official' : 'user';
    
    // 创建新模板
    const template = new Template({
      name,
      description,
      detailedDescription,
      category,
      version: version || '1.0.0',
      author: req.user._id,
      source,
      code,
      params: params || [],
      metadata: metadata || {},
      settings: settings || {},
      thumbnail: coverImage || thumbnail || '', // 优先使用coverImage
      riskLevel: riskLevel || 'medium',
      isPaid: isPaid || false,
      price: price || 0,
      status: source === 'official' ? 'published' : 'reviewing' // 官方模板直接发布，用户模板需要审核
    });
    
    await template.save();
    
    // 更新策略类型的模板数量
    await Category.findByIdAndUpdate(category, {
      $inc: { templateCount: 1 }
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(500).json({ message: '服务器错误，创建模板失败' });
  }
};

// 更新模板
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 检查权限：只有管理员或模板作者可以更新模板
    if (req.user.role !== 'admin' && template.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限更新该模板' });
    }
    
    // 如果模板是官方来源，只有管理员可以修改
    if (template.source === 'official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改官方模板' });
    }
    
    // 验证策略类型是否存在（如果更新了分类）
    if (updates.category) {
      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists) {
        return res.status(400).json({ message: '指定的策略类型不存在' });
      }
      
      // 如果策略类型发生变化，更新旧策略类型的模板数量
      if (template.category.toString() !== updates.category) {
        await Category.findByIdAndUpdate(template.category, {
          $inc: { templateCount: -1 }
        });
        await Category.findByIdAndUpdate(updates.category, {
          $inc: { templateCount: 1 }
        });
      }
    }
    
    // 处理coverImage字段，如果存在则将其值赋给thumbnail
    if (updates.coverImage !== undefined) {
      updates.thumbnail = updates.coverImage;
    }
    
    // 更新模板信息
    Object.assign(template, updates);
    
    await template.save();
    
    res.json(template);
  } catch (error) {
    console.error('更新模板失败:', error);
    res.status(500).json({ message: '服务器错误，更新模板失败' });
  }
};

// 删除模板
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 检查权限：只有管理员或模板作者可以删除模板
    if (req.user.role !== 'admin' && template.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限删除该模板' });
    }
    
    // 更新策略类型的模板数量
    await Category.findByIdAndUpdate(template.category, {
      $inc: { templateCount: -1 }
    });
    
    // 删除模板
    await Template.findByIdAndDelete(id);
    
    res.json({ message: '模板删除成功' });
  } catch (error) {
    console.error('删除模板失败:', error);
    res.status(500).json({ message: '服务器错误，删除模板失败' });
  }
};

// 更新模板状态
const updateTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以更新模板状态' });
    }
    
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 更新状态
    template.status = status;
    if (status === 'rejected' && rejectedReason) {
      template.rejectedReason = rejectedReason;
    }
    
    await template.save();
    
    res.json(template);
  } catch (error) {
    console.error('更新模板状态失败:', error);
    res.status(500).json({ message: '服务器错误，更新模板状态失败' });
  }
};

// 克隆模板
const cloneTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalTemplate = await Template.findById(id);
    if (!originalTemplate) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 创建克隆模板
    const clonedTemplate = new Template({
      name: `${originalTemplate.name}（克隆）`,
      description: originalTemplate.description,
      category: originalTemplate.category,
      version: '1.0.0',
      author: req.user._id,
      source: 'user', // 克隆的模板默认为用户模板
      code: originalTemplate.code,
      params: originalTemplate.params,
      metadata: originalTemplate.metadata,
      settings: originalTemplate.settings,
      thumbnail: originalTemplate.thumbnail,
      riskLevel: originalTemplate.riskLevel,
      isPaid: false, // 克隆的模板默认为免费
      price: 0,
      status: 'reviewing' // 克隆的模板需要审核
    });
    
    await clonedTemplate.save();
    
    // 更新策略类型的模板数量
    await Category.findByIdAndUpdate(originalTemplate.category, {
      $inc: { templateCount: 1 }
    });
    
    res.status(201).json(clonedTemplate);
  } catch (error) {
    console.error('克隆模板失败:', error);
    res.status(500).json({ message: '服务器错误，克隆模板失败' });
  }
};

// 更新模板使用次数
const updateTemplateUsage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    
    // 更新使用次数
    template.usageCount += 1;
    await template.save();
    
    res.json(template);
  } catch (error) {
    console.error('更新模板使用次数失败:', error);
    res.status(500).json({ message: '服务器错误，更新模板使用次数失败' });
  }
};

// 获取模板统计数据
const getTemplateStatistics = async (req, res) => {
  try {
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以查看模板统计数据' });
    }
    
    const total = await Template.countDocuments();
    const published = await Template.countDocuments({ status: 'published' });
    const reviewing = await Template.countDocuments({ status: 'reviewing' });
    const rejected = await Template.countDocuments({ status: 'rejected' });
    const offline = await Template.countDocuments({ status: 'offline' });
    
    // 获取总使用次数
    const usageStats = await Template.aggregate([
      { $group: { _id: null, totalUsage: { $sum: '$usageCount' } } }
    ]);
    const totalUsage = usageStats.length > 0 ? usageStats[0].totalUsage : 0;
    
    // 获取策略类型统计
    const categoryStats = await Template.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryInfo' } },
      { $unwind: '$categoryInfo' },
      { $project: { _id: 0, category: '$categoryInfo.name', count: 1 } }
    ]);
    
    // 获取来源统计
    const sourceStats = await Template.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    
    // 获取付费统计
    const paidStats = await Template.aggregate([
      { $group: { _id: '$isPaid', count: { $sum: 1 } } }
    ]);
    
    res.json({
      total,
      published,
      reviewing,
      rejected,
      offline,
      totalUsage,
      categoryStats,
      sourceStats,
      paidStats
    });
  } catch (error) {
    console.error('获取模板统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板统计数据失败' });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  updateTemplateStatus,
  cloneTemplate,
  updateTemplateUsage,
  getTemplateStatistics
};