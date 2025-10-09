const mongoose = require('mongoose');

// 避免重复编译模型
let Strategy;

// 检查Strategy模型是否已经存在
if (mongoose.models.Strategy) {
  Strategy = mongoose.models.Strategy;
} else {
  // 定义Strategy模型
  const StrategySchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['技术指标', '机器学习', '统计套利', '事件驱动']
    },
    code: {
      type: String,
      required: true
    },
    parameters: {
      type: Object,
      default: {}
    },
    status: {
      type: String,
      enum: ['已启用', '未启用'],
      default: '未启用'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // 管理员审核相关字段
    approved: {
      type: Boolean,
      default: false
    },
    reviewComment: {
      type: String
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
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

  Strategy = mongoose.model('Strategy', StrategySchema);
}

module.exports = Strategy;