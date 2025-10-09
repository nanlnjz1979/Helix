const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // 首先尝试从URL参数获取token
    let token = req.query.token;
    
    // 如果URL参数中没有token，则尝试从请求头获取token
    if (!token && req.header('Authorization')) {
      token = req.header('Authorization').replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ message: '无访问权限，请先登录' });
    }
    
    // 验证token
    let decoded;
    
    // 检查是否是前端生成的模拟令牌
    if (token.startsWith('mock-jwt-token-')) {
      // 对于模拟令牌，直接解析出用户信息
      // 这里假设模拟令牌的格式是 mock-jwt-token-<timestamp>
      // 由于前端存储了用户信息在localStorage，这里直接设置为admin角色
      // 注意：这只是为了开发环境测试用，生产环境应该使用真实的JWT验证
      decoded = {
        id: '1',
        role: 'admin' // 前端登录使用的是admin账号，直接设置为admin角色
      };
    } else {
      // 对于真实JWT令牌，使用jwt.verify验证
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    }
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ message: '无效的令牌，请重新登录', error: error.message });
  }
};