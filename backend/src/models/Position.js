const mongoose = require('mongoose');

// 避免重复编译模型
let Position;

// 检查Position模型是否已经存在
if (mongoose.models.Position) {
  Position = mongoose.models.Position;
} else {
  // 定义Position模型
  const PositionSchema = new mongoose.Schema({
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
    // 合约代码
    symbol: {
      type: String,
      required: true,
      trim: true
    },
    // 交易所
    exchange: {
      type: String,
      required: true,
      trim: true
    },
    // 持仓方向：LONG/SHORT
    direction: {
      type: String,
      required: true,
      enum: ['LONG', 'SHORT'],
      trim: true
    },
    // 持仓数量
    volume: {
      type: Number,
      required: true,
      min: 0
    },
    // 持仓均价（成本价）
    price: {
      type: Number,
      required: true,
      min: 0
    },
    // 冻结数量
    frozen: {
      type: Number,
      default: 0,
      min: 0
    },
    // 总盈亏
    totalPnl: {
      type: Number,
      default: 0
    },
    // 变动时间
    changeTime: {
      type: Date,
      default: Date.now
    },
    // 变动类型：TRADE/PRICE_CHANGE/INITIAL
    changeType: {
      type: String,
      required: true,
      enum: ['TRADE', 'PRICE_CHANGE', 'INITIAL']
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
        fields: { strategiesId: 1, userId: 1, gatewayName: 1, symbol: 1 },
        unique: true,
        name: 'unique_position_index'
      }
    ]
  });

  // 更新updatedAt字段
  PositionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });

  Position = mongoose.model('Position', PositionSchema);
}

module.exports = Position;
