import { message } from 'antd';
import { authAPI } from '../../services/api';

// 登录请求
export const loginRequest = () => ({
  type: 'LOGIN_REQUEST'
});

// 登录成功
export const loginSuccess = (user, token) => ({
  type: 'LOGIN_SUCCESS',
  payload: { user, token }
});

// 登录失败
export const loginFailure = (error) => ({
  type: 'LOGIN_FAILURE',
  payload: error
});

// 注册请求
export const registerRequest = () => ({
  type: 'REGISTER_REQUEST'
});

// 注册成功
export const registerSuccess = (user, token) => ({
  type: 'REGISTER_SUCCESS',
  payload: { user, token }
});

// 注册失败
export const registerFailure = (error) => ({
  type: 'REGISTER_FAILURE',
  payload: error
});

// 加载用户请求
export const loadUserRequest = () => ({
  type: 'LOAD_USER_REQUEST'
});

// 加载用户成功
export const loadUserSuccess = (user) => ({
  type: 'LOAD_USER_SUCCESS',
  payload: user
});

// 加载用户失败
export const loadUserFailure = (error) => ({
  type: 'LOAD_USER_FAILURE',
  payload: error
});

// 加载用户信息
export const loadUser = () => {
  return async (dispatch) => {
    dispatch(loadUserRequest());
    
    try {
      // 尝试从localStorage获取用户信息
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (userStr && token) {
        const user = JSON.parse(userStr);
        dispatch(loadUserSuccess(user));
      } else {
        dispatch(loadUserFailure('未登录'));
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      dispatch(loadUserFailure('加载用户失败'));
    }
  };
};

// 修改密码请求
export const changePasswordRequest = () => ({
  type: 'CHANGE_PASSWORD_REQUEST'
});

// 修改密码成功
export const changePasswordSuccess = () => ({
  type: 'CHANGE_PASSWORD_SUCCESS'
});

// 修改密码失败
export const changePasswordFailure = (error) => ({
  type: 'CHANGE_PASSWORD_FAILURE',
  payload: error
});

// 修改密码
export const changePassword = (currentPassword, newPassword) => {
  return async (dispatch) => {
    dispatch(changePasswordRequest());
    
    try {
      // 调用API修改密码
      await authAPI.changePassword(currentPassword, newPassword);
      
      // 分发修改密码成功action
      dispatch(changePasswordSuccess());
      
      // 显示成功消息
      message.success('密码修改成功');
    } catch (error) {
      console.error('修改密码失败:', error);
      // 分发修改密码失败action
      dispatch(changePasswordFailure(error.message || '修改密码失败，请稍后再试'));
      
      // 抛出错误，让调用者可以处理
      throw error;
    }
  };
};

// 登出
export const logout = () => {
  return (dispatch) => {
    // 清除localStorage中的数据
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 分发登出action
    dispatch({ type: 'LOGOUT' });
    
    // 显示成功消息
    message.success('已成功登出');
  };
};

// 登录
export const login = (username, password) => {
  return async (dispatch) => {
    dispatch(loginRequest());
    
    try {
      // 实际调用后端API进行登录验证
      const response = await authAPI.login(username, password);
      
      // 保存到localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // 分发登录成功action
      dispatch(loginSuccess(response.user, response.token));
      
      // 显示成功消息
      message.success('登录成功');
    } catch (error) {
      console.error('登录失败:', error);
      // 分发登录失败action
      dispatch(loginFailure(error.message || '用户名或密码错误'));
      
      // 显示错误消息
      message.error(error.message || '用户名或密码错误');
    }
  };
};

// 注册
export const register = (username, email, password, fullName, phone) => {
  return async (dispatch) => {
    dispatch(registerRequest());
    
    try {
      // 准备注册数据
      const userData = {
        username,
        email,
        password,
        fullName,
        phone
      };
      
      // 实际调用后端API进行注册
      const response = await authAPI.register(userData);
      
      // 保存到localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // 分发注册成功action
      dispatch(registerSuccess(response.user, response.token));
      
      // 显示成功消息
      message.success('注册成功');
    } catch (error) {
      console.error('注册失败:', error);
      // 分发注册失败action
      dispatch(registerFailure(error.message || '注册失败，请检查填写的信息'));
      
      // 显示错误消息
      message.error(error.message || '注册失败，请检查填写的信息');
    }
  };
};