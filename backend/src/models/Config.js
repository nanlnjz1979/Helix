// 避免重复编译模型
const mongoose = require('mongoose');

// 确保模型定义稳定的方式
let Config;

try {
  // 首先尝试从mongoose.models获取已注册的模型
  if (mongoose.models && mongoose.models.Config) {
    Config = mongoose.models.Config;
    console.log('Config模型: 从缓存获取成功');
  } else {
    // 定义Config模型（k-v方式）
    const ConfigSchema = new mongoose.Schema({
      key: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      description: {
        type: String,
        required: false,
        default: ''
      },
      type: {
        type: String,
        enum: ['redis', 'time', 'string', 'number', 'boolean', 'object'],
        default: 'object'
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

    // 添加更新时间中间件
    ConfigSchema.pre('save', function(next) {
      this.updatedAt = new Date();
      next();
    });

    // 确保模型方法正确绑定
    Config = mongoose.model('Config', ConfigSchema);
    console.log('Config模型: 重新创建成功');
  }
} catch (error) {
  console.error('Config模型定义或加载失败:', error.message);
  // 创建一个基础的后备模型对象，确保findOne等方法存在
  Config = {
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
if (Config && typeof Config.findOne !== 'function') {
  console.warn('Config模型缺少findOne方法，添加应急方法');
  // 添加必要的方法确保兼容性
  Config.findOne = async () => null;
  Config.find = async () => [];
  Config.create = async () => null;
  Config.updateOne = async () => null;
}

module.exports = Config;