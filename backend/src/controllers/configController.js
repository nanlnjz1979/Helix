// 配置控制器

// 初始化配置模型
let mongoose = null;
let Config = null;

// 加载真实模型
exports.loadRealModels = async function() {
  try {
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    // 加载Config模型
    if (!Config) {
      try {
        // 首先检查是否已经在全局注册了Config模型
        if (mongoose.models.Config) {
          Config = mongoose.models.Config;
        } else {
          delete require.cache[require.resolve('../models/Config')];
          Config = require('../models/Config');
        }
      } catch (err) {
        console.error('加载Config模型失败:', err.message);
        throw err;
      }
    }
    
    return true;
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    console.error('完整错误:', error);
    throw error;
  }
}

// 获取所有配置
exports.getAllConfigs = async (req, res) => {
  try {
    // 加载真实模型
    await exports.loadRealModels();

    // 获取所有配置
    const configs = await Config.find();

    res.json({
      configs,
      total: configs.length
    });
  } catch (error) {
    console.error('获取配置列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 根据key获取单个配置
exports.getConfigByKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    // 加载真实模型
    await exports.loadRealModels();

    const config = await Config.findOne({ key });

    if (!config) {
      return res.status(404).json({ message: '配置不存在' });
    }

    res.json(config);
  } catch (error) {
    console.error('获取配置详情错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 设置配置（如果存在则更新，不存在则创建）
exports.setConfig = async (req, res) => {
  try {
    const { key, value, description, type } = req.body;
    
    // 加载真实模型
    await exports.loadRealModels();

    // 查找配置是否存在
    let config = await Config.findOne({ key });

    if (config) {
      // 更新现有配置
      config = await Config.findOneAndUpdate(
        { key },
        { value, description, type, updatedAt: new Date() },
        { new: true }
      );
      
      // 刷新配置缓存
      const configUtil = require('../utils/configUtil');
      await configUtil.refreshConfigCache();
      
      res.json({
        message: '配置更新成功',
        config
      });
    } else {
      // 创建新配置
      config = await Config.create({
        key,
        value,
        description,
        type
      });
      
      // 刷新配置缓存
      const configUtil = require('../utils/configUtil');
      await configUtil.refreshConfigCache();
      
      res.json({
        message: '配置创建成功',
        config
      });
    }
  } catch (error) {
    console.error('设置配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除配置
exports.deleteConfig = async (req, res) => {
  try {
    const { key } = req.params;
    
    // 加载真实模型
    await exports.loadRealModels();

    const deletedConfig = await Config.findOneAndDelete({ key });
    
    if (!deletedConfig) {
      return res.status(404).json({ message: '配置不存在' });
    }
    
    // 刷新配置缓存
    const configUtil = require('../utils/configUtil');
    await configUtil.refreshConfigCache();

    res.json({
      message: '配置删除成功',
      config: deletedConfig
    });
  } catch (error) {
    console.error('删除配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化配置控制器
exports.initialize = async () => {
  try {
    console.log('配置控制器初始化...');
    
    // 加载真实模型
    await exports.loadRealModels();
    
    // 设置默认配置
    await exports.setDefaultConfigs();
    
    console.log('配置控制器初始化完成');
  } catch (error) {
    console.log('初始化配置控制器时出错:', error.message);
    throw error;
  }
};

// 设置默认配置
exports.setDefaultConfigs = async () => {
  try {
    // 加载真实模型
    await exports.loadRealModels();
    
    // 默认配置列表
    const defaultConfigs = [
      {
        key: 'virtual_live',
        value: { url: 'redis://127.0.0.1:6379/0' },
        description: '虚拟实盘Redis配置',
        type: 'redis'
      },
      {
        key: 'backtest',
        value: { url: 'redis://127.0.0.1:6379/0' },
        description: '回测Redis配置',
        type: 'redis'
      },
      {
        key: 'virtual_live_start_time',
        value: { time: '09:10:00' },
        description: '虚拟实盘启动时间',
        type: 'time'
      }
    ];
    
    // 遍历默认配置，确保它们存在
    for (const defaultConfig of defaultConfigs) {
      const existingConfig = await Config.findOne({ key: defaultConfig.key });
      if (!existingConfig) {
        await Config.create(defaultConfig);
        console.log(`默认配置创建成功: ${defaultConfig.key}`);
      }
    }
  } catch (error) {
    console.error('设置默认配置错误:', error.message);
  }
};