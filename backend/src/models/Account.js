const mongoose = require('mongoose');

// 避免重复编译模型
let Account;

// 检查Account模型是否已经存在
if (mongoose.models.Account) {
  Account = mongoose.models.Account;
} else {
  // 定义Account模型
  const AccountSchema = new mongoose.Schema({
    // 关联策略ID
    strategiesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Strategy',
      required: true
    },
    // 用户ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // 网关名称
    gatewayName: {
      type: String,
      required: true,
      trim: true
    },
    // 总资金
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    // 可用资金
    available: {
      type: Number,
      default: 0,
      min: 0
    },
    // 冻结资金
    frozen: {
      type: Number,
      default: 0,
      min: 0
    },
    // 账户状态：ACTIVE/FROZEN/CLOSED/KILLPOS
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'FROZEN', 'CLOSED', 'KILLPOS'],
      default: 'ACTIVE'
    },
    // 总盈亏
    totalPnl: {
      type: Number,
      default: 0
    },
    // 已实现盈亏
    realizedPnl: {
      type: Number,
      default: 0
    },
    // 浮动盈亏
    unrealizedPnl: {
      type: Number,
      default: 0
    },
    // 变动时间
    changeTime: {
      type: Date,
      default: Date.now
    },
    // 变动类型：TRADE/DEPOSIT/WITHDRAW/INITIAL
    changeType: {
      type: String,
      required: true,
      enum: ['TRADE', 'DEPOSIT', 'WITHDRAW', 'INITIAL']
    },
    // 创建时间
    createdAt: {
      type: Date,
      default: Date.now
    },
    // 更新时间
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, {
    // 联合唯一索引，用于幂等性操作
    indexes: [
      {
        fields: { strategiesId: 1, userId: 1, gatewayName: 1 },
        unique: true,
        name: 'unique_account_index'
      }
    ]
  });

  // 更新updatedAt字段
  AccountSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });

  Account = mongoose.model('Account', AccountSchema);
}

module.exports = Account;
