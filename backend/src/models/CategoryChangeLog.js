// 避免重复编译模型
const mongoose = require('mongoose');
let CategoryChangeLog;

// 检查CategoryChangeLog模型是否已经存在
if (mongoose.models.CategoryChangeLog) {
  CategoryChangeLog = mongoose.models.CategoryChangeLog;
} else {
  // 定义CategoryChangeLog模型
  const CategoryChangeLogSchema = new mongoose.Schema({
    strategy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Strategy',
      required: true,
      index: true
    },
    fromCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    toCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    changeType: {
      type: String,
      enum: ['assign', 'remove', 'update'],
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  // 预加载关联的策略和类别
  CategoryChangeLogSchema.pre('find', function() {
    this.populate('strategy', 'name')
        .populate('fromCategories', 'name')
        .populate('toCategories', 'name')
        .populate('changedBy', 'username');
  });

  CategoryChangeLog = mongoose.model('CategoryChangeLog', CategoryChangeLogSchema);
}

module.exports = CategoryChangeLog;