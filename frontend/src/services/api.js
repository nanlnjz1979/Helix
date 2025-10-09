import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    console.log('[API REQUEST] 发送请求到:', config.url);
    console.log('[API REQUEST] 请求方法:', config.method);
    console.log('[API REQUEST] 请求数据:', config.data);
    console.log('[API REQUEST] 请求头:', config.headers);
    
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      // 如果存在token，则添加到请求头
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API REQUEST] 添加认证token到请求头');
    }
    return config;
  },
  error => {
    console.error('[API REQUEST] 请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    console.log('[API RESPONSE] 收到来自', response.config.url, '的响应');
    console.log('[API RESPONSE] 状态码:', response.status);
    console.log('[API RESPONSE] 响应头:', response.headers);
    console.log('[API RESPONSE] Content-Type:', response.headers['content-type']);
    
    // 检查响应是否包含HTML内容
    if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      console.error('[API RESPONSE] WARNING: 响应包含HTML内容而不是JSON!');
      console.error('[API RESPONSE] HTML内容预览:', response.data.substring(0, 500));
      throw new Error('无效的响应格式：收到HTML内容而不是JSON');
    }
    
    // 检查响应数据是否为空
    if (response.data === undefined || response.data === null) {
      console.warn('[API RESPONSE] 警告: 响应数据为空');
    }
    
    // 检查响应数据是否为字符串而非对象
    if (typeof response.data === 'string') {
      console.warn('[API RESPONSE] 警告: 响应数据是字符串，尝试解析为JSON');
      try {
        // 尝试解析字符串为JSON对象
        response.data = JSON.parse(response.data);
        console.log('[API RESPONSE] 成功解析字符串为JSON');
      } catch (parseError) {
        console.error('[API RESPONSE] 错误: 无法解析响应为JSON:', parseError.message);
        console.error('[API RESPONSE] 原始响应字符串:', response.data.substring(0, 500));
        throw parseError;
      }
    }
    
    console.log('[API RESPONSE] 响应数据:', response.data);
    return response;
  },
  error => {
    console.error('[API RESPONSE ERROR] 请求', error.config?.url, '失败');
    
    // 检查是否是axios错误
    if (error.isAxiosError) {
      console.error('[API RESPONSE ERROR] Axios错误详情:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data ? 
          (typeof error.response.data === 'string' ? error.response.data.substring(0, 500) : error.response.data) 
          : '无数据'
      });
      
      // 检查错误响应是否包含HTML
      if (error.response?.headers && error.response.headers['content-type'] && 
          error.response.headers['content-type'].includes('text/html')) {
        console.error('[API RESPONSE ERROR] 错误响应包含HTML内容:', error.response.data.substring(0, 500));
      } else if (error.response?.data && typeof error.response.data === 'string') {
        // 尝试解析错误响应字符串为JSON
        try {
          const parsedError = JSON.parse(error.response.data);
          console.log('[API RESPONSE ERROR] 成功解析错误响应为JSON:', parsedError);
          error.response.data = parsedError;
        } catch (parseError) {
          console.error('[API RESPONSE ERROR] 无法解析错误响应为JSON:', parseError.message);
        }
      }
    } else if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      console.error('[API RESPONSE ERROR] 严重错误: JSON解析错误 - 这可能是导致"Unexpected token '<'"错误的原因');
      console.error('[API RESPONSE ERROR] 解析错误详情:', error.message);
      
      // 尝试提供更详细的错误信息
      if (error.stack) {
        console.error('[API RESPONSE ERROR] 错误堆栈:', error.stack);
      }
    }
    
    // 处理401错误（未授权）
    if (error.response && error.response.status === 401) {
      console.log('[API RESPONSE ERROR] 401未授权错误，清除localStorage并跳转到登录页面');
      // 清除localStorage中的token和user
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 跳转到登录页面
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 登录
  login: async (username, password) => {
    console.log('[AUTH API] 执行登录操作 - 用户名:', username);
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      console.log('[AUTH API] 登录成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[AUTH API] 登录失败:', error);
      
      // 检查是否是JSON解析错误
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        console.error('[AUTH API] 严重错误: 登录请求返回了无法解析的内容!');
        throw new Error('登录失败: 服务器返回了无效的响应格式');
      }
      
      // 抛出带有更明确错误信息的错误
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          '登录失败，请检查您的用户名和密码';
      throw new Error(errorMessage);
    }
  },
  
  // 注册
  register: async (userData) => {
    console.log('[AUTH API] 执行注册操作:', userData.username);
    try {
      const response = await api.post('/auth/register', userData);
      console.log('[AUTH API] 注册成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[AUTH API] 注册失败:', error);
      throw error;
    }
  },
  
  // 修改密码
  changePassword: async (currentPassword, newPassword) => {
    console.log('[AUTH API] 执行修改密码操作');
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      console.log('[AUTH API] 修改密码成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[AUTH API] 修改密码失败:', error);
      throw error;
    }
  }
};

// 导出api实例
export default api;