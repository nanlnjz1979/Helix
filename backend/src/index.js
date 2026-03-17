const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cluster = require('cluster');
const os = require('os');
require('dotenv').config();

// 检查是否为Cluster模式，并且是主进程
const isClusterMaster = cluster.isMaster && process.env.USE_CLUSTER !== 'false';
const PORT = process.env.PORT || 5000;

// 如果是主进程，启动Cluster模式
if (isClusterMaster) {
  const numCPUs = os.cpus().length;
  console.log(`主进程 ${process.pid} 正在运行`);
  console.log(`系统CPU核心数: ${numCPUs}`);
  console.log('Cluster模式已启用，将创建', numCPUs, '个工作进程');

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // 监听工作进程退出事件
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出，退出码: ${code}, 信号: ${signal}`);
    // 重启退出的工作进程
    console.log('正在重启工作进程...');
    cluster.fork();
  });

  // 监听工作进程在线事件
  cluster.on('online', (worker) => {
    console.log(`工作进程 ${worker.process.pid} 已启动`);
  });

  // 优雅关闭主进程
  process.on('SIGINT', () => {
    console.log('主进程收到终止信号，正在关闭所有工作进程...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

  // 主进程不导出任何内容
  module.exports = null;
} else {
  // 工作进程逻辑
  const backupRoutes = require('./routes/backupRoutes');

  // 初始化Express应用
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // 增加请求大小限制到10mb
  app.use(morgan('dev'));
  app.use('/api/admin/backup', require('./routes/backupRoutes'));

  // 设置路由和启动服务器的函数
  async function setupRoutesAndStartServer() {
    // 导入路由
    const authRoutes = require('./routes/auth');
    const strategyRoutes = require('./routes/strategies');
    const adminRoutes = require('./routes/admin');
    const categoryRoutesModule = require('./routes/categoryRoutes');
    const categoryController = require('./controllers/categoryController');
    // 导入模板相关路由
    const templateRoutes = require('./routes/templateRoutes');
    const backtestRoutes = require('./routes/backtestRoutes');
    const monitorRoutes = require('./routes/monitorRoutes');
    // 导入模拟器相关路由
    const simulatorRoutes = require('./routes/simulatorRoutes');
    // 导入订单相关路由
    const orderRoutes = require('./routes/orderRoutes');
    
    // 路由
    app.use('/api/auth', authRoutes);
    app.use('/api/strategies', strategyRoutes);
    app.use('/api/admin', adminRoutes);
    // 挂载模板相关路由
    app.use('/api', templateRoutes);
    // 回测相关路由
    app.use('/api/backtest', backtestRoutes);
    // 系统监控路由
    app.use('/api/monitor', monitorRoutes);
    // 模拟器相关路由
    app.use('/api/simulator', simulatorRoutes);
    // 订单相关路由
    app.use('/api/orders', orderRoutes);
   
    // 只有当categoryRoutesModule存在且有router属性时才挂载
    if (categoryRoutesModule && categoryRoutesModule.router) {
      app.use('/api', categoryRoutesModule.router); // 将类别路由挂载到公共API路径，允许普通用户访问受限操作
      app.use('/api/admin', categoryRoutesModule.router); // 同时挂载到admin路径用于管理员完整操作
      console.log(`工作进程 ${process.pid}: 类别路由已成功挂载到/api和/admin路径`);
    } else {
      console.log(`工作进程 ${process.pid}: 类别路由模块加载失败，无法挂载`);
    }
   
    // 初始化类别控制器，使用真实数据库模式
    try {
      if (categoryController.initialize) {
        categoryController.initialize();
        console.log(`工作进程 ${process.pid}: 类别控制器初始化请求已发送 - 使用真实数据库模式`);
      } else {
        console.log(`工作进程 ${process.pid}: 类别控制器没有initialize方法`);
      }
    } catch (error) {
      console.error(`工作进程 ${process.pid}: 初始化类别控制器时出错:`, error.message);
    }
    
    // 初始化配置控制器，设置默认配置
    try {
      const configController = require('./controllers/configController');
      if (configController.initialize) {
        await configController.initialize();
        console.log(`工作进程 ${process.pid}: 配置控制器初始化完成`);
        
        // 初始化配置缓存
        const configUtil = require('./utils/configUtil');
        await configUtil.initializeConfigCache();
        console.log(`工作进程 ${process.pid}: 配置缓存初始化完成`);
      } else {
        console.log(`工作进程 ${process.pid}: 配置控制器没有initialize方法`);
      }
    } catch (error) {
      console.error(`工作进程 ${process.pid}: 初始化配置控制器时出错:`, error.message);
    }
   
    // 根路由
    app.get('/', (req, res) => {
      res.json({ 
        message: '量化交易平台API服务',
        workerId: process.pid,
        clusterMode: true
      });
    });
   
    // 错误处理中间件
    app.use((err, req, res, next) => {
      console.error(`工作进程 ${process.pid}: 错误堆栈:`, err.stack);
      res.status(500).json({
        message: err.message || '服务器内部错误',
        error: process.env.NODE_ENV === 'production' ? {} : err,
        workerId: process.pid
      });
    });
   
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`工作进程 ${process.pid} 运行在端口 ${PORT}`);
    });
  }

  // 连接数据库
  console.log(`工作进程 ${process.pid} 正在尝试连接到MongoDB:`, process.env.MONGODB_URI);
  console.log('当前环境:', process.env.NODE_ENV);

  // 添加连接超时处理
  const connectionTimeout = setTimeout(() => {
    console.error(`工作进程 ${process.pid}: MongoDB连接超时`);
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
      console.log(`工作进程 ${process.pid}: 数据库连接成功`);
      console.log(`工作进程 ${process.pid}: 数据库状态:`, mongoose.connection.readyState);
      // 数据库连接成功后，导入路由和启动服务器
      setupRoutesAndStartServer();
    })
    .catch(err => {
      clearTimeout(connectionTimeout); // 清除超时计时器
      console.error(`工作进程 ${process.pid}: 数据库连接失败:`, err.message);
      console.error(`工作进程 ${process.pid}: 完整错误信息:`, err);
      console.log(`工作进程 ${process.pid}: 检测到数据库连接不可用，将使用模拟数据模式启动服务器`);
      // 数据库连接失败，仍然导入路由和启动服务器
      setupRoutesAndStartServer();
    });

  // 监听mongoose连接事件
  mongoose.connection.on('connected', () => {
    console.log(`工作进程 ${process.pid}: Mongoose已连接到数据库`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`工作进程 ${process.pid}: Mongoose连接错误:`, err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log(`工作进程 ${process.pid}: Mongoose已断开连接`);
  });

  // 工作进程导出app
  module.exports = app;
}