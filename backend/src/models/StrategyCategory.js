// 避免重复编译模型
const mongoose = require('mongoose');
let StrategyCategory;

// 检查StrategyCategory模型是否已经存在
if (mongoose.models.StrategyCategory) {
  StrategyCategory = mongoose.models.StrategyCategory;
} else {
  // 定义StrategyCategory模型
  const StrategyCategorySchema = new mongoose.Schema({
    strategy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Strategy',
      required: true,
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    autoAssigned: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  // 复合索引，确保每个策略和类别的组合唯一
  StrategyCategorySchema.index({ strategy: 1, category: 1 }, { unique: true });

  // 预加载关联的策略和类别
  StrategyCategorySchema.pre('find', function() {
    this.populate('strategy', 'name')
        .populate('category', 'name');
  });

  StrategyCategory = mongoose.model('StrategyCategory', StrategyCategorySchema);
}

module.exports = StrategyCategory;