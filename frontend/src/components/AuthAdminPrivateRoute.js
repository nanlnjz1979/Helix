import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

// 管理员路由守卫
// 只有 user.role 为 'admin' 的用户可以访问
const AuthAdminPrivateRoute = ({ children }) => {
  const auth = useSelector(state => state?.auth);
  const location = useLocation();

  const token = auth?.token || localStorage.getItem('token');
  const user = auth?.user || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);

  // 未登录，跳转到登录页
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已登录但不是管理员，跳转到首页
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 管理员用户，放行
  return children;
};

export default AuthAdminPrivateRoute;