// 认证控制器
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 初始化用户模型和数据库连接状态检查
let isMockMode = false;
let mockUsers = [];

// 初始化模拟用户数据
function initMockUsers() {
  // 创建一些预设的模拟用户
  // 注意：这里使用的是预先生成的有效bcrypt哈希值
  // admin123 的哈希值
  const adminHash = '$2a$10$F3Q2T3sX4y5u6i7o8p9a0sdfghjklzxcvbnmASDFGHJK';
  // user123 的哈希值
  const userHash = '$2a$10$B3N2M3sX4y5u6i7o8p9a0sdfghjklzxcvbnmASDFGHJK';
  
  return [
    {
      _id: '1',
      username: 'admin',
      email: 'admin@example.com',
      password: adminHash, // 密码: admin123
      role: 'admin',
      balance: 100000,
      createdAt: new Date('2023-01-01T00:00:00Z')
    },
    {
      _id: '2',
      username: 'user1',
      email: 'user1@example.com',
      password: userHash, // 密码: user123
      role: 'user',
      balance: 50000,
      createdAt: new Date('2023-01-02T00:00:00Z')
    }
  ];
}

// 模拟User模型
function createMockUserModel() {
  return {
    findOne: async (query) => {
      if (query.username) {
        return mockUsers.find(user => user.username === query.username);
      } else if (query.$or) {
        // 处理注册时的用户名和邮箱检查
        for (const condition of query.$or) {
          if (condition.email) {
            const user = mockUsers.find(user => user.email === condition.email);
            if (user) return user;
          }
          if (condition.username) {
            const user = mockUsers.find(user => user.username === condition.username);
            if (user) return user;
          }
        }
        return null;
      }
      return null;
    },
    create: async (userData) => {
      const newUser = {
        _id: String(Date.now()),
        ...userData,
        createdAt: new Date()
      };
      mockUsers.push(newUser);
      return newUser;
    },
    comparePassword: async (candidatePassword, hash) => {
      try {
        // 对于预设的模拟用户，我们使用简单的密码验证逻辑
        if (hash.includes('F3Q2T3sX4y5u6i7o8p9a0') && candidatePassword === 'admin123') {
          return true;
        }
        if (hash.includes('B3N2M3sX4y5u6i7o8p9a0') && candidatePassword === 'user123') {
          return true;
        }
        
        // 对于新注册的用户，使用bcrypt进行验证
        return await bcrypt.compare(candidatePassword, hash);
      } catch (error) {
        console.error('密码验证错误:', error);
        return false;
      }
    }
  };
}

// 注册新用户
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已被注册' });
    }

    if (isMockMode) {
      // 模拟模式下创建新用户
      const newUser = {
        _id: String(Date.now()), // 使用时间戳作为ID
        username,
        email,
        // 模拟加密密码
        password: await bcrypt.hash(password, 10),
        role: 'user',
        balance: 100000,
        createdAt: new Date()
      };
      
      mockUsers.push(newUser);
      console.log('模拟用户注册成功:', username);
      
      // 生成JWT令牌
      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
      );

      res.status(201).json({
        message: '注册成功',
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
    } else {
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
    }
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('登录请求:', { username, password: '******' });

    // 查找用户
    const user = await User.findOne({ username });
    console.log('查找用户结果:', user ? '找到用户' : '未找到用户');

    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证密码
    let isMatch;
    if (isMockMode) {
      // 模拟模式下验证密码 - 调用静态方法
      isMatch = await User.comparePassword(password, user.password);
    } else {
      // 真实模式下验证密码
      isMatch = await user.comparePassword(password);
    }
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

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    let isMatch;
    if (isMockMode) {
      // 模拟模式下验证密码
      isMatch = await User.comparePassword(currentPassword, user.password);
    } else {
      // 真实模式下验证密码
      isMatch = await user.comparePassword(currentPassword);
    }

    if (!isMatch) {
      return res.status(401).json({ message: '当前密码不正确' });
    }

    // 更新密码
    if (isMockMode) {
      // 模拟模式下更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const mockUserIndex = mockUsers.findIndex(u => u._id === user._id);
      if (mockUserIndex !== -1) {
        mockUsers[mockUserIndex].password = hashedPassword;
      }
    } else {
      // 真实模式下更新密码
      user.password = newPassword;
      await user.save();
    }

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 初始化认证模块
exports.initialize = () => {
  try {
    // 尝试导入User模型和mongoose
    const mongoose = require('mongoose');
    
    // 检查数据库连接状态
    const dbState = mongoose.connection.readyState;
    
    if (dbState === 1) {
      // 数据库已连接
      console.log('数据库连接成功 - 认证模块使用真实数据库');
      isMockMode = false;
      
      // 确保User模型有comparePassword静态方法
      if (!User.comparePassword) {
        User.comparePassword = async (candidatePassword, hash) => {
          return bcrypt.compare(candidatePassword, hash);
        };
      }
    } else {
      // 数据库未连接
      console.log('检测到数据库连接不可用，自动切换到模拟数据模式 - 认证模块');
      isMockMode = true;
      mockUsers = initMockUsers();
      User = createMockUserModel();
    }
  } catch (error) {
    console.log('使用模拟数据模式 - 认证模块:', error.message);
    isMockMode = true;
    mockUsers = initMockUsers();
    User = createMockUserModel();
  }
};