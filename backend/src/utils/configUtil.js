// 配置工具模块，用于加载和访问系统配置

const Config = require('../models/Config');

// 缓存配置，避免频繁查询数据库
let configCache = null;
let isLoading = false;

// 初始化配置缓存
exports.initializeConfigCache = async () => {
  if (isLoading) {
    // 如果正在加载，等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, 100));
    return exports.initializeConfigCache();
  }
  
  isLoading = true;
  try {
    console.log('正在初始化配置缓存...');
    const configs = await Config.find();
    
    // 将配置转换为键值对格式
    configCache = {};
    configs.forEach(config => {
      configCache[config.key] = config.value;
    });
    
    console.log('配置缓存初始化完成，共加载', Object.keys(configCache).length, '个配置项');
    console.log('已加载的配置项:', Object.keys(configCache));
    
    return configCache;
  } catch (error) {
    console.error('初始化配置缓存失败:', error.message);
    // 使用默认配置作为备选
    configCache = {
      virtual_live: { url: 'redis://127.0.0.1:6379/0' },
      backtest: { url: 'redis://127.0.0.1:6379/0' },
      virtual_live_start_time: { time: '09:10:00' }
    };
    console.log('使用默认配置作为备选');
    return configCache;
  } finally {
    isLoading = false;
  }
};

// 获取所有配置
exports.getAllConfigs = () => {
  if (!configCache) {
    console.warn('配置缓存尚未初始化，返回空对象');
    return {};
  }
  return { ...configCache };
};

// 根据key获取配置
exports.getConfig = (key, defaultValue = null) => {
  if (!configCache) {
    console.warn('配置缓存尚未初始化，返回默认值');
    return defaultValue;
  }
  return configCache[key] !== undefined ? configCache[key] : defaultValue;
};

// 刷新配置缓存（用于配置更新后）
exports.refreshConfigCache = async () => {
  console.log('正在刷新配置缓存...');
  return await exports.initializeConfigCache();
};

// 检查配置是否存在
exports.hasConfig = (key) => {
  if (!configCache) {
    return false;
  }
  return configCache.hasOwnProperty(key);
};

// 获取Redis配置
exports.getRedisConfig = (type = 'virtual_live') => {
  if (type === 'backtest') {
    return exports.getConfig('backtest', { url: 'redis://127.0.0.1:6379/0' });
  }
  return exports.getConfig('virtual_live', { url: 'redis://127.0.0.1:6379/0' });
};

// 获取虚拟实盘启动时间
exports.getVirtualLiveStartTime = () => {
  return exports.getConfig('virtual_live_start_time', { time: '09:10:00' });
};