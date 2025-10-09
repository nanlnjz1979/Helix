const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 导入模型
const User = require('../models/User');
const Strategy = require('../models/Strategy');

// 连接数据库
const connectDB = async () => {
  try {
    console.log('正在连接到MongoDB数据库...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    return false;
  }
};

// 断开数据库连接
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB连接已断开');
  } catch (error) {
    console.error('断开MongoDB连接失败:', error.message);
  }
};

// 初始化数据库
const initDB = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('数据库连接失败，无法初始化数据');
    return;
  }

  try {
    // 清除现有数据（可选，用于重置数据库）
    console.log('正在清除现有数据...');
    await User.deleteMany({});
    await Strategy.deleteMany({});
    console.log('现有数据已清除');

    // 创建默认管理员用户
    console.log('正在创建默认管理员用户...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      balance: 0
    });
    await adminUser.save();
    console.log('管理员用户创建成功:', adminUser.username);

    // 创建普通用户
    console.log('正在创建普通用户...');
    const user1Password = await bcrypt.hash('user123', 10);
    const user1 = new User({
      username: 'user1',
      email: 'user1@example.com',
      password: user1Password,
      role: 'user',
      balance: 150000
    });
    await user1.save();
    console.log('普通用户创建成功:', user1.username);

    const user2Password = await bcrypt.hash('user456', 10);
    const user2 = new User({
      username: 'user2',
      email: 'user2@example.com',
      password: user2Password,
      role: 'user',
      balance: 200000
    });
    await user2.save();
    console.log('普通用户创建成功:', user2.username);

    // 创建示例策略
    console.log('正在创建示例策略...');
    
    const strategy1 = new Strategy({
      name: '均线交叉策略',
      description: '基于短期和长期均线交叉的交易策略',
      type: '技术指标',
      code: `def strategy(data):\n    # 计算短期和长期均线\n    data['short_ma'] = data['close'].rolling(window=5).mean()\n    data['long_ma'] = data['close'].rolling(window=20).mean()\n    # 生成交易信号\n    data['signal'] = 0\n    data.loc[data['short_ma'] > data['long_ma'], 'signal'] = 1\n    data.loc[data['short_ma'] < data['long_ma'], 'signal'] = -1\n    return data`,
      parameters: { short_period: 5, long_period: 20 },
      status: '已启用',
      user: user1._id,
      approved: true,
      reviewedBy: adminUser._id,
      reviewedAt: new Date()
    });
    await strategy1.save();
    console.log('策略创建成功:', strategy1.name);

    const strategy2 = new Strategy({
      name: 'MACD策略',
      description: '基于MACD指标的交易策略',
      type: '技术指标',
      code: `def strategy(data):\n    # 计算MACD\n    exp1 = data['close'].ewm(span=12, adjust=False).mean()\n    exp2 = data['close'].ewm(span=26, adjust=False).mean()\n    data['macd'] = exp1 - exp2\n    data['signal_line'] = data['macd'].ewm(span=9, adjust=False).mean()\n    # 生成交易信号\n    data['signal'] = 0\n    data.loc[data['macd'] > data['signal_line'], 'signal'] = 1\n    data.loc[data['macd'] < data['signal_line'], 'signal'] = -1\n    return data`,
      parameters: {},
      status: '未启用',
      user: user2._id,
      approved: true,
      reviewedBy: adminUser._id,
      reviewedAt: new Date()
    });
    await strategy2.save();
    console.log('策略创建成功:', strategy2.name);

    const strategy3 = new Strategy({
      name: '随机森林预测',
      description: '使用随机森林算法预测股票价格',
      type: '机器学习',
      code: `import pandas as pd\nfrom sklearn.ensemble import RandomForestRegressor\ndef strategy(data):\n    # 准备特征\n    data['return'] = data['close'].pct_change()\n    data['volume_change'] = data['volume'].pct_change()\n    # 简单的随机森林模型\n    # 实际应用中需要更复杂的特征工程和模型调优\n    return data`,
      parameters: { n_estimators: 100 },
      status: '已启用',
      user: user1._id,
      approved: false
    });
    await strategy3.save();
    console.log('策略创建成功:', strategy3.name);

    console.log('\n数据库初始化完成!');
    console.log('--------------------------');
    console.log('默认管理员账户:');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('--------------------------');
    console.log('测试用户账户:');
    console.log('用户名: user1 / 密码: user123');
    console.log('用户名: user2 / 密码: user456');
    console.log('--------------------------');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  } finally {
    await disconnectDB();
  }
};

// 运行初始化脚本
initDB();