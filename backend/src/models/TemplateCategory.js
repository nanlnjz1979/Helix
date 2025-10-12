const mongoose = require('mongoose');

// 避免重复编译模型
let TemplateCategory;

try {
  // 首先尝试从mongoose.models获取已注册的模型
  if (mongoose.models && mongoose.models.TemplateCategory) {
    TemplateCategory = mongoose.models.TemplateCategory;
    console.log('TemplateCategory模型: 从缓存获取成功');
  } else {
    // 定义TemplateCategory模型
    const TemplateCategorySchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        trim: true,
        unique: true
      },
      description: {
        type: String,
        required: false,
        default: ''
      },
      parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TemplateCategory',
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
      archived: {
        type: Boolean,
        default: false
      },
      isSystem: {
        type: Boolean,
        default: false
      },
      templateCount: {
        type: Number,
        default: 0
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
    TemplateCategorySchema.virtual('children', {
      ref: 'TemplateCategory',
      localField: '_id',
      foreignField: 'parent'
    });

    // 预加载子类别
    TemplateCategorySchema.pre('find', function() {
      this.populate('children');
    });

    // 预保存钩子，自动更新updatedAt
    TemplateCategorySchema.pre('save', function(next) {
      this.updatedAt = Date.now();
      next();
    });

    // 确保模型方法正确绑定
    TemplateCategory = mongoose.model('TemplateCategory', TemplateCategorySchema);
    console.log('TemplateCategory模型: 创建成功');
  }
} catch (error) {
  console.error('TemplateCategory模型定义或加载失败:', error.message);
  throw error;
}

module.exports = TemplateCategory;