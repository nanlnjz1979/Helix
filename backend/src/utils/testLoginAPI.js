const axios = require('axios');

// 测试登录API
const testLoginAPI = async () => {
  const loginUrl = 'http://localhost:5000/api/auth/login';
  const credentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log(`\n正在测试登录API: ${loginUrl}`);
  console.log('使用凭据:', { username: credentials.username, password: '******' });

  try {
    const response = await axios.post(loginUrl, credentials);
    
    console.log('登录成功!');
    console.log('响应状态码:', response.status);
    console.log('返回的用户信息:', {
      id: response.data.user?.id,
      username: response.data.user?.username,
      role: response.data.user?.role
    });
    console.log('JWT令牌:', response.data.token ? '已生成' : '未生成');
    
  } catch (error) {
    console.error('登录失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('错误消息:', error.response.data);
    }
  }
};

// 运行测试
testLoginAPI();