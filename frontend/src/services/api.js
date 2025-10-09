import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // 后端API基础URL
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果token存在，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 处理认证错误
    if (error.response && error.response.status === 401) {
      // 清除localStorage中的数据
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 可以选择在此处重定向到登录页面
      // window.location.href = '/login';
    }
    
    // 返回错误信息
    return Promise.reject(error.response ? error.response.data : { message: '网络错误' });
  }
);

// 认证相关API
export const authAPI = {
  // 用户登录
  login: (username, password) => {
    return api.post('/auth/login', { username, password });
  },
  
  // 用户注册
  register: (userData) => {
    return api.post('/auth/register', userData);
  },
  
  // 获取当前用户信息
  getUserInfo: () => {
    return api.get('/users/me');
  },
  
  // 修改密码
  changePassword: (currentPassword, newPassword) => {
    return api.post('/auth/change-password', { currentPassword, newPassword });
  }
};

// 管理员相关API
export const adminAPI = {
  // 获取用户列表
  getUsers: () => {
    return api.get('/admin/users');
  },
  
  // 获取策略列表
  getStrategies: () => {
    return api.get('/admin/strategies');
  }
};

export default api;