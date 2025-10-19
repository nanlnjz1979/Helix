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
      // 使用一个有效的MongoDB ObjectId字符串，避免模型保存时报CastError
      decoded = {
        id: '000000000000000000000001',
        role: 'admin'
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