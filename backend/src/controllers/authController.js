// 认证控制器
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 初始化用户模型和数据库连接
let mongoose = null;
let User = null;

// 加载真实模型
exports.loadRealModels = async function() {
  try {
    // 始终加载真实模型
    if (!mongoose) {
      mongoose = require('mongoose');
    }
    
    if (mongoose.connection.readyState === 1) {
      // 数据库已连接，尝试加载User模型
      console.log('MongoDB已连接，尝试加载真实User模型...');
      
      // 单独检查和加载User模型
      if (!User || !User.findOne) {
        try {
          // 首先检查是否已经在全局注册了User模型
          if (mongoose.models.User) {
            User = mongoose.models.User;
            console.log('成功加载已注册的User模型');
          } else {
            // 安全地加载User模型
            try {
              delete require.cache[require.resolve('../models/User')];
              User = require('../models/User');
              console.log('成功从文件加载User模型');
            } catch (err) {
              console.error('重新加载User模型失败，尝试直接加载:', err.message);
              User = require('../models/User');
            }
          }
          
          // 确保模型有comparePassword静态方法
          if (!User.comparePassword) {
            User.comparePassword = async (candidatePassword, hash) => {
              return bcrypt.compare(candidatePassword, hash);
            };
            console.log('已添加comparePassword静态方法');
          }
        } catch (err) {
          console.error('加载User模型失败:', err.message);
          throw err;
        }
      }
      
      console.log('真实数据库模型加载成功');
    } else {
      console.log('MongoDB未连接（状态码:', mongoose.connection.readyState, '），无法使用真实数据库');
      throw new Error('MongoDB未连接');
    }
  } catch (error) {
    console.error('加载真实模型失败:', error.message);
    console.error('完整错误:', error);
    throw error;
  }
}

// 注册新用户
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 确保User模型已正确初始化
    if (!User || !User.findOne) {
      console.log('User模型未正确初始化，尝试加载...');
      await exports.loadRealModels();
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已被注册' });
    }

    // 真实模式下创建新用户
    const user = new User({
      username,
      email,
      password
    });

    // 保存用户到数据库
    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(username);
    console.log('登录请求:', { username, password: '******' });
    // 在生产环境中不应打印明文密码
    // console.log('登录请求:', { username, password });

    // 确保User模型已正确初始化
    if (!User || !User.findOne) {
      console.log('User模型未正确初始化，尝试加载...');
      await loadRealModels();
    }

    // 查找用户
    const user = await User.findOne({ username });
    console.log('查找用户结果:', user ? '找到用户' : '未找到用户');

    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证密码
    let isMatch;
    // 真实模式下验证密码
    isMatch = await bcrypt.compare(password, user.password);
    console.log('密码验证结果:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 修改用户密码
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // 从JWT中获取用户ID

    // 确保User模型已正确初始化
    if (!User || !User.findById) {
      console.log('User模型未正确初始化，尝试加载...');
      await exports.loadRealModels();
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: '当前密码不正确' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化认证模块
exports.initialize = async () => {
  try {
    console.log('认证模块初始化...');
    
    // 加载数据库模型
    await exports.loadRealModels();
    
    console.log('认证模块初始化完成');
  } catch (error) {
    console.log('初始化认证模块时出错:', error.message);
    throw error;
  }
};

// 在文件末尾调用初始化函数，确保所有函数都已定义
// 由于initialize是异步函数，我们需要使用IIFE来处理异步初始化
(async () => {
  try {
    await exports.initialize();
  } catch (error) {
    console.error('异步初始化失败:', error.message);
  }
})();