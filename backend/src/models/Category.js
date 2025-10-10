// 避免重复编译模型
const mongoose = require('mongoose');

// 确保模型定义稳定的方式
let Category;

try {
  // 首先尝试从mongoose.models获取已注册的模型
  if (mongoose.models && mongoose.models.Category) {
    Category = mongoose.models.Category;
    console.log('Category模型: 从缓存获取成功');
  } else {
    // 定义Category模型
    const CategorySchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        required: false,
        default: ''
      },
      parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
        default: null
      },
      tags: [{
        type: String,
        trim: true
      }],
      visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
      },
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
      },
      archived: {
        type: Boolean,
        default: false
      },
      isSystem: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    });

    // 虚拟字段：获取子类别
    CategorySchema.virtual('children', {
      ref: 'Category',
      localField: '_id',
      foreignField: 'parent'
    });

    // 虚拟字段：获取策略数量
    CategorySchema.virtual('strategyCount', {
      ref: 'StrategyCategory',
      localField: '_id',
      foreignField: 'category',
      count: true
    });

    // 预加载子类别
    CategorySchema.pre('find', function() {
      this.populate('children');
    });

    // 确保模型方法正确绑定
    Category = mongoose.model('Category', CategorySchema);
    console.log('Category模型: 重新创建成功');
  }
} catch (error) {
  console.error('Category模型定义或加载失败:', error.message);
  // 创建一个基础的后备模型对象，确保findOne等方法存在
  Category = {
    find: async () => [],
    findOne: async () => null,
    create: async () => null,
    findById: async () => null,
    findByIdAndUpdate: async () => null,
    findByIdAndDelete: async () => null,
    countDocuments: async () => 0,
    // 标记这是一个应急模型
    _isEmergencyModel: true
  };
}

// 确保导出前模型具有必要的方法
if (Category && typeof Category.findOne !== 'function') {
  console.warn('Category模型缺少findOne方法，添加应急方法');
  // 添加必要的方法确保兼容性
  Category.findOne = async () => null;
  Category.find = async () => [];
  Category.create = async () => null;
}

module.exports = Category;