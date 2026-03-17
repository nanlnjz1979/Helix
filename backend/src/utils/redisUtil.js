// Redis工具模块，用于发送策略代码到Celery
// 引入celery-node库
const celery = require('celery-node');
// 引入Redis客户端
const { createClient } = require('redis');
// 引入配置工具
const configUtil = require('./configUtil');

// 设置策略在Redis中的状态
async function setStrategyStatusInRedis(strategyId, status) {
  try {
    console.log(`设置策略 ${strategyId} 在Redis中的状态为: ${status}`);

    // 从数据库配置中获取Redis URL
    const redisConfig = configUtil.getRedisConfig('virtual_live');
    const redisUrl = redisConfig?.url || 'redis://127.0.0.1:6379/0';
    
    console.log(`使用Redis URL: ${redisUrl}`);
    
    // 连接Redis
    const redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('Redis客户端错误:', err.message);
    });

    await redisClient.connect();
    console.log('已连接到Redis');

    // 设置策略状态
    const statusKey = `strategy:${strategyId}:status`;
    await redisClient.set(statusKey, status);
    console.log(`已设置策略 ${strategyId} 的Redis状态为: ${status}`);

    // 关闭Redis连接
    await redisClient.disconnect();
    console.log('已关闭Redis连接');

    return {
      success: true,
      strategyId: strategyId,
      status: status
    };
  } catch (err) {
    console.error(`设置策略 ${strategyId} 在Redis中的状态失败:`, err);
    return { success: false, message: err.message };
  }
}

// 发送策略代码到Celery - 修复task_id参数问题
async function sendStrategyToCelery(strategyId, code) {
  try {
    console.log(`发送 Celery 任务: program_id=${strategyId}`);

    // 1. 从数据库配置中获取Redis URL
    const redisConfig = configUtil.getRedisConfig('virtual_live');
    const redisUrl = redisConfig?.url || 'redis://127.0.0.1:6379/0';
    
    console.log(`使用Redis URL: ${redisUrl}`);
    
    // 2. 连接Redis，检查并删除已存在的任务
    const redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('Redis客户端错误:', err.message);
    });

    await redisClient.connect();
    console.log('已连接到Redis');

    // 2. 检查任务ID是否存在
    const taskKey = `celery-task-meta-${strategyId}`;
    const exists = await redisClient.exists(taskKey);
    console.log(`任务ID ${strategyId} 在Redis中是否存在: ${exists === 1 ? '是' : '否'}`);

    // 3. 如果存在，删除该任务
    if (exists === 1) {
      await redisClient.del(taskKey);
      console.log(`已删除Redis中存在的任务ID: ${strategyId}`);
    }

    // 4. 设置策略状态为waiting
    const statusKey = `strategy:${strategyId}:status`;
    await redisClient.set(statusKey, 'waiting');
    console.log(`已设置策略 ${strategyId} 的Redis状态为: waiting`);

    // 5. 关闭Redis连接
    await redisClient.disconnect();
    console.log('已关闭Redis连接');

    // 6. 创建 Celery 客户端 - 使用从配置中获取的Redis URL
    const celeryClient = celery.createClient(
      redisUrl,   // broker - 使用从配置中获取的URL
      redisUrl    // backend - 使用从配置中获取的URL
    );

    // 直接调用client.sendTask方法，这样可以指定taskId
    // sendTask方法签名：sendTask(taskName, args, kwargs, taskId)
    const result = celeryClient.sendTask(
      'tasks.run_code',       // taskName
      [strategyId, code, "python"],  // args数组：program_id, code, language
      {},                     // kwargs对象，为空
      strategyId              // taskId，使用策略ID作为任务ID
    );

    console.log("Celery 任务已提交，task id =", result.taskId);

    return {
      success: true,
      taskId: result.taskId
    };

  } catch (err) {
    console.error("发送 Celery 任务失败:", err);
    return { success: false, message: err.message };
  }
}

module.exports = {
  sendStrategyToCelery,
  setStrategyStatusInRedis
};
