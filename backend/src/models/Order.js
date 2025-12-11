const mongoose = require('mongoose');

// 避免重复编译模型
let Order;

// 检查Order模型是否已经存在
if (mongoose.models.Order) {
  Order = mongoose.models.Order;
} else {
  // 定义Order模型
  const OrderSchema = new mongoose.Schema({
    // 关联策略ID
    strategyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Strategy',
      required: true
    },
    // 网关名称
    gatewayName: {
      type: String,
      required: true,
      trim: true
    },
    // 交易标的
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
    // 订单ID
    orderId: {
      type: String,
      required: true,
      trim: true
    },
    // 订单类型
    type: {
      type: String,
      required: true,
      trim: true
    },
    // 交易方向 (买入/卖出)
    direction: {
      type: String,
      required: true,
      enum: ['buy', 'sell','多','空']
    },
    // 开平方向 (开仓/平仓)
    offset: {
      type: String,
      required: true,
      enum: ['open', 'close','开','平']
    },
    // 订单价格
    price: {
      type: Number,
      required: true,
      min: 0
    },
    // 订单数量
    volume: {
      type: Number,
      required: true,
      min: 1
    },
    // 已成交数量
    traded: {
      type: Number,
      default: 0,
      min: 0
    },
    // 订单状态
    status: {
      type: String,
      required: true,
      enum: ['SUBMITTING', 'SUBMITTED', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED']
    },
    // 订单时间
    datetime: {
      type: Date,
      default: Date.now
    },
    // 佣金
    commission: {
      type: Number,
      default: 0,
      min: 0
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
  });

  // 更新updatedAt字段
  OrderSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
  });

  Order = mongoose.model('Order', OrderSchema);
}

module.exports = Order;