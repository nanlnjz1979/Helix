const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 连接数据库
console.log('正在尝试连接到MongoDB:', process.env.MONGODB_URI);
console.log('当前环境:', process.env.NODE_ENV);

// 添加连接超时处理
const connectionTimeout = setTimeout(() => {
  console.error('MongoDB连接超时');
  // 即使超时，仍然启动服务器
  setupRoutesAndStartServer();
}, 10000); // 10秒超时

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 服务器选择超时时间
})
  .then(() => {
    clearTimeout(connectionTimeout); // 清除超时计时器
    console.log('数据库连接成功');
    console.log('数据库状态:', mongoose.connection.readyState);
    // 数据库连接成功后，导入路由和启动服务器
    setupRoutesAndStartServer();
  })
  .catch(err => {
    clearTimeout(connectionTimeout); // 清除超时计时器
    console.error('数据库连接失败:', err.message);
    console.error('完整错误信息:', err);
    console.log('检测到数据库连接不可用，将使用模拟数据模式启动服务器');
    // 数据库连接失败，仍然导入路由和启动服务器
    setupRoutesAndStartServer();
  });

// 监听mongoose连接事件
mongoose.connection.on('connected', () => {
  console.log('Mongoose已连接到数据库');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose已断开连接');
});

// 设置路由和启动服务器的函数
function setupRoutesAndStartServer() {
  // 导入路由
  const authRoutes = require('./routes/auth');
  const strategyRoutes = require('./routes/strategies');
  const adminRoutes = require('./routes/admin');
  
  // 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/strategies', strategyRoutes);
  app.use('/api/admin', adminRoutes);
  
  // 根路由
  app.get('/', (req, res) => {
    res.json({ message: '量化交易平台API服务' });
  });
  
  // 错误处理中间件
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      message: err.message || '服务器内部错误',
      error: process.env.NODE_ENV === 'production' ? {} : err
    });
  });
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}

module.exports = app;