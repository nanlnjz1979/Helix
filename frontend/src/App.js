import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useSelector } from 'react-redux';
import './App.css';

// 导入页面组件
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Strategy from './pages/Strategy';
import Backtest from './pages/Backtest';
import Trading from './pages/Trading';
import Profile from './pages/Profile';
import FAQ from './pages/FAQ';
// 导入管理员页面组件
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminStrategies from './pages/AdminStrategies';
import AdminAnalytics from './pages/AdminAnalytics';

// 导入布局组件
import MainLayout from './components/layouts/MainLayout';
import AdminLayout from './components/layouts/AdminLayout';

// 权限控制组件 - 基础认证 - 修改为允许未登录用户查看首页部分内容
const PrivateRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  console.log('PrivateRoute isAuthenticated:', isAuthenticated, 'requireAuth:', requireAuth);
  
  // 对于首页，允许未登录用户查看基本内容
  if (!requireAuth) {
    return children;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 不使用React.memo，确保组件能响应Redux状态变化
const AuthPrivateRoute = PrivateRoute;

// 管理员权限控制组件
const AdminPrivateRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (isAuthenticated && user && user.role !== 'admin') {
    // 非管理员用户不能访问管理后台，重定向到用户仪表盘
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// 不使用React.memo，确保组件能响应Redux状态变化
const AuthAdminPrivateRoute = AdminPrivateRoute;

function App() {
  // 检查是否需要显示登录模态框
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLogin') === 'true') {
      setTimeout(() => {
        if (window.showLoginModal) {
          window.showLoginModal();
        }
      }, 100);
    }
  }, []);

  // 检查是否需要显示注册模态框
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showRegister') === 'true') {
      setTimeout(() => {
        if (window.showRegisterModal) {
          window.showRegisterModal();
        }
      }, 100);
    }
  }, []);

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Routes>
        {/* 无需认证的路由 */}
        <Route path="/login" element={<Navigate to="/?showLogin=true" replace />} />
        <Route path="/register" element={
          <React.Fragment>
            <div style={{ display: 'none' }}>
              <Register />
            </div>
            <Navigate to="/?showRegister=true" replace />
          </React.Fragment>
        } />
        
        {/* 管理员路由 - 使用精确匹配 */}
        <Route path="/admin" element={
          <AuthAdminPrivateRoute>
            <Navigate to="/admin/dashboard" replace />
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/dashboard" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/users" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/strategies" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminStrategies />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/analytics" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminAnalytics />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        
        {/* 临时添加一个无需认证的测试路由，用于调试 */}
        <Route path="/test" element={
          <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
            <h1>测试页面 - 这是一个无需认证的页面</h1>
            <p>如果您能看到这个页面，说明路由系统工作正常</p>
            <button onClick={() => window.location.href = '/'}>返回首页</button>
          </div>
        } />
        
        {/* 用户路由 - 使用精确匹配 */}
        {/* 对于首页，设置requireAuth为false，允许未登录用户查看基本内容 */}
        <Route path="/" element={
          <AuthPrivateRoute requireAuth={false}>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/dashboard" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/market" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Market />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/strategy" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Strategy />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/backtest" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Backtest />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/trading" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Trading />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/profile" element={
          <AuthPrivateRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/faq" element={
          <AuthPrivateRoute>
            <MainLayout>
              <FAQ />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        
        {/* 通配符路由 - 确保其他路径都重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;