import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

// 受保护的用户路由守卫
// 使用方式：
// <AuthPrivateRoute requireAuth>
//   {children}
// </AuthPrivateRoute>
// 当 requireAuth 为 false 时，无需登录也可访问（用于首页等），否则需登录
const AuthPrivateRoute = ({ children, requireAuth = true }) => {
  const auth = useSelector(state => state?.auth);
  const location = useLocation();

  const token = auth?.token || localStorage.getItem('token');

  // 不要求登录，直接放行
  if (!requireAuth) {
    return children;
  }

  // 需要登录但没有令牌，跳转到登录页
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已登录，放行
  return children;
};

export default AuthPrivateRoute;