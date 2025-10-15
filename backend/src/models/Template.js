const mongoose = require('mongoose');

// 避免重复编译模型
let Template;

try {
  // 首先尝试从mongoose.models获取已注册的模型
  if (mongoose.models && mongoose.models.Template) {
    Template = mongoose.models.Template;
    console.log('Template模型: 从缓存获取成功');
  } else {
    // 定义Template模型
    const TemplateSchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        required: true,
        trim: true
      },
      detailedDescription: {
        type: String,
        trim: true
      },
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
      },
      version: {
        type: String,
        required: true,
        default: '1.0.0'
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      source: {
        type: String,
        enum: ['official', 'user'],
        default: 'user'
      },
      usageCount: {
        type: Number,
        default: 0
      },
      status: {
        type: String,
        enum: ['published', 'reviewing', 'rejected', 'offline', 'draft'],
        default: 'reviewing'
      },
      isPaid: {
        type: Boolean,
        default: false
      },
      price: {
        type: Number,
        default: 0
      },
      thumbnail: {
        type: String,
        trim: true
      },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      code: {
        type: String,
        required: true
      },
      params: {
        type: mongoose.Schema.Types.Mixed,
        default: []
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      rejectedReason: {
        type: String,
        trim: true
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

    // 预保存钩子，自动更新updatedAt
    TemplateSchema.pre('save', function(next) {
      this.updatedAt = Date.now();
      next();
    });

    // 确保模型方法正确绑定
    Template = mongoose.model('Template', TemplateSchema);
    console.log('Template模型: 创建成功');
  }
} catch (error) {
  console.error('Template模型定义或加载失败:', error.message);
  throw error;
}

module.exports = Template;