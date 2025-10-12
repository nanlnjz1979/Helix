// 模板分类控制器
const mongoose = require('mongoose');
const TemplateCategory = require('../models/TemplateCategory');
const Template = require('../models/Template');

// 获取所有模板分类
const getAllTemplateCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', visibility = '', parent = '' } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 搜索条件
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // 可见性过滤
    if (visibility) {
      query.visibility = visibility;
    }
    
    // 父分类过滤
    if (parent) {
      query.parent = parent;
    } else if (parent === 'null') {
      query.parent = null;
    }
    
    // 非管理员只能查看公开分类和自己创建的私有分类
    if (req.user.role !== 'admin') {
      query.$or = [
        { visibility: 'public' },
        { owner: req.user._id }
      ];
    }
    
    // 分页查询
    const categories = await TemplateCategory.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await TemplateCategory.countDocuments(query);
    
    res.json({
      categories,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取模板分类列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板分类列表失败' });
  }
};

// 获取模板分类树状结构
const getTemplateCategoryTree = async (req, res) => {
  try {
    // 非管理员只能查看公开分类和自己创建的私有分类
    const query = req.user.role === 'admin' ? 
      { parent: null } : 
      { $or: [{ visibility: 'public' }, { owner: req.user._id }], parent: null };
    
    const rootCategories = await TemplateCategory.find(query).sort({ name: 1 });
    
    // 递归构建分类树
    const buildCategoryTree = async (categories) => {
      const tree = [];
      
      for (const category of categories) {
        // 获取子分类
        const subQuery = req.user.role === 'admin' ? 
          { parent: category._id } : 
          { $or: [{ visibility: 'public' }, { owner: req.user._id }], parent: category._id };
        
        const children = await TemplateCategory.find(subQuery).sort({ name: 1 });
        
        const categoryNode = {
          ...category.toObject(),
          children: await buildCategoryTree(children)
        };
        
        tree.push(categoryNode);
      }
      
      return tree;
    };
    
    const categoryTree = await buildCategoryTree(rootCategories);
    
    res.json(categoryTree);
  } catch (error) {
    console.error('获取模板分类树状结构失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板分类树状结构失败' });
  }
};

// 创建新模板分类
const createTemplateCategory = async (req, res) => {
  try {
    const { name, description, parent, tags, visibility } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分类名称是必填项' });
    }
    
    // 检查分类名称是否已存在
    const existingCategory = await TemplateCategory.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: '分类名称已存在' });
    }
    
    // 验证父分类是否存在
    if (parent) {
      const parentCategory = await TemplateCategory.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ message: '指定的父分类不存在' });
      }
      
      // 确保父分类是公开的或由当前用户创建的
      if (req.user.role !== 'admin' && parentCategory.visibility === 'private' && parentCategory.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: '无法在他人的私有分类下创建子分类' });
      }
    }
    
    // 创建新分类
    const category = new TemplateCategory({
      name: name.trim(),
      description: description || '',
      parent: parent || null,
      tags: tags || [],
      visibility: visibility || 'public',
      owner: req.user.role === 'user' ? req.user._id : null,
      isSystem: false,
      templateCount: 0
    });
    
    await category.save();
    
    res.status(201).json(category);
  } catch (error) {
    console.error('创建模板分类失败:', error);
    res.status(500).json({ message: '服务器错误，创建模板分类失败' });
  }
};

// 更新模板分类
const updateTemplateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags, visibility } = req.body;
    
    const category = await TemplateCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: '模板分类不存在' });
    }
    
    // 检查权限：只有管理员或分类所有者可以更新分类
    if (req.user.role !== 'admin' && category.owner && category.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限更新该分类' });
    }
    
    // 系统分类只能由管理员更新
    if (category.isSystem && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限更新系统分类' });
    }
    
    // 检查分类名称是否已存在（如果更新了名称）
    if (name && name.trim() !== category.name) {
      const existingCategory = await TemplateCategory.findOne({ name: name.trim() });
      if (existingCategory) {
        return res.status(400).json({ message: '分类名称已存在' });
      }
      category.name = name.trim();
    }
    
    // 更新其他字段
    if (description !== undefined) category.description = description;
    if (tags !== undefined) category.tags = tags;
    if (visibility !== undefined) category.visibility = visibility;
    
    await category.save();
    
    res.json(category);
  } catch (error) {
    console.error('更新模板分类失败:', error);
    res.status(500).json({ message: '服务器错误，更新模板分类失败' });
  }
};

// 删除模板分类
const deleteTemplateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await TemplateCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: '模板分类不存在' });
    }
    
    // 检查权限：只有管理员或分类所有者可以删除分类
    if (req.user.role !== 'admin' && category.owner && category.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限删除该分类' });
    }
    
    // 系统分类不能删除
    if (category.isSystem) {
      return res.status(403).json({ message: '系统分类不能删除' });
    }
    
    // 检查是否有子分类
    const subCategories = await TemplateCategory.find({ parent: id });
    if (subCategories.length > 0) {
      return res.status(400).json({ message: '该分类下有子分类，请先删除子分类' });
    }
    
    // 检查是否有模板使用该分类
    const templatesInCategory = await Template.find({ category: id });
    if (templatesInCategory.length > 0) {
      return res.status(400).json({ message: '该分类下有模板，请先将模板移至其他分类' });
    }
    
    await TemplateCategory.findByIdAndDelete(id);
    
    res.json({ message: '模板分类删除成功' });
  } catch (error) {
    console.error('删除模板分类失败:', error);
    res.status(500).json({ message: '服务器错误，删除模板分类失败' });
  }
};

// 获取模板分类详情
const getTemplateCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await TemplateCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: '模板分类不存在' });
    }
    
    // 检查权限：管理员或分类所有者可以查看所有分类，其他用户只能查看公开分类
    if (req.user.role !== 'admin' && category.visibility === 'private' && category.owner && category.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限查看该分类' });
    }
    
    // 获取子分类
    const subCategories = await TemplateCategory.find({ parent: id });
    
    // 获取分类下的模板数量（实际数量，而不是缓存的数量）
    const actualTemplateCount = await Template.countDocuments({ category: id });
    
    res.json({
      ...category.toObject(),
      children: subCategories,
      actualTemplateCount
    });
  } catch (error) {
    console.error('获取模板分类详情失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板分类详情失败' });
  }
};

// 获取模板分类统计数据
const getTemplateCategoryStatistics = async (req, res) => {
  try {
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以查看模板分类统计数据' });
    }
    
    // 获取分类统计
    const statistics = await TemplateCategory.aggregate([
      {
        $lookup: {
          from: 'templates',
          localField: '_id',
          foreignField: 'category',
          as: 'templates'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          parent: 1,
          visibility: 1,
          isSystem: 1,
          templateCount: { $size: '$templates' },
          publishedCount: {
            $size: {
              $filter: {
                input: '$templates',
                as: 'template',
                cond: { $eq: ['$$template.status', 'published'] }
              }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);
    
    res.json(statistics);
  } catch (error) {
    console.error('获取模板分类统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，获取模板分类统计数据失败' });
  }
};

module.exports = {
  getAllTemplateCategories,
  getTemplateCategoryTree,
  createTemplateCategory,
  updateTemplateCategory,
  deleteTemplateCategory,
  getTemplateCategoryById,
  getTemplateCategoryStatistics
};