// 测试登录API的脚本
const axios = require('axios');

// 测试函数
async function testLoginAPI() {
  const loginUrl = 'http://localhost:5000/api/auth/login';
  const credentials = {
    username: 'admin', // 使用模拟用户的用户名
    password: 'admin123' // 使用模拟用户的密码
  };

  console.log(`\n正在测试登录API: ${loginUrl}`);
  console.log('使用凭据:', { username: credentials.username, password: '******' });

  try {
    const response = await axios.post(loginUrl, credentials);
    
    console.log('登录成功!');
    console.log('响应状态码:', response.status);
    console.log('响应内容类型:', response.headers['content-type']);
    console.log('返回的数据结构:', {
      token: response.data?.token ? '已生成' : '未生成',
      user: response.data?.user ? '包含用户信息' : '不包含用户信息'
    });
    console.log('完整响应数据:', response.data);
    
  } catch (error) {
    console.error('登录失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应内容类型:', error.response.headers['content-type']);
      console.error('错误响应数据:', error.response.data);
      // 检查是否是HTML响应
      if (error.response.headers['content-type']?.includes('text/html')) {
        console.error('注意: 后端返回了HTML内容而不是JSON');
        // 只打印HTML的前200个字符，避免输出过多
        const htmlPreview = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 200) + '...'
          : error.response.data;
        console.error('HTML预览:', htmlPreview);
      }
    } else if (error.request) {
      console.error('没有收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
  }
}

// 运行测试
console.log('开始测试登录API...');
testLoginAPI().then(() => {
  console.log('\n测试完成');
  process.exit(0);
}).catch(error => {
  console.error('测试过程中发生未捕获的错误:', error);
  process.exit(1);
});