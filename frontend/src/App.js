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
import AdminSystemMonitor from './pages/AdminSystemMonitor';
import AdminCategories from './pages/AdminCategories';
import AdminCategoryDetails from './pages/AdminCategoryDetails';
import AdminTemplates from './pages/AdminTemplates';
import AdminTemplateEdit from './pages/AdminTemplateEdit';
import AdminTemplateReview from './pages/AdminTemplateReview';
import StrategyCreate from './pages/StrategyCreate';
import StrategyEdit from './pages/StrategyEdit';
import StrategyClone from './pages/StrategyClone';
import AdminBackup from './pages/AdminBackup';

// 导入布局组件
import MainLayout from './components/layouts/MainLayout';
import AdminLayout from './components/layouts/AdminLayout';

// 导入路由守卫组件
import AuthPrivateRoute from './components/AuthPrivateRoute';
import AuthAdminPrivateRoute from './components/AuthAdminPrivateRoute';

function App() {
  const authToken = useSelector(state => state?.auth?.token);

  useEffect(() => {
    // 可以在此处处理全局初始化或用户状态同步
  }, [authToken]);

  return (
    <div className="App">
      <Routes>
        {/* 管理员路由 */}
        <Route path="/admin" element={
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
        <Route path="/admin/system" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminSystemMonitor />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/categories" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminCategories />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/categories/:categoryId" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminCategoryDetails />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/backup" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminBackup />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        
        {/* 模板管理路由 */}
        <Route path="/admin/templates" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminTemplates />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
       <Route path="/admin/templates/create" element={
         <AuthAdminPrivateRoute>
           <AdminLayout>
             <AdminTemplateEdit />
           </AdminLayout>
         </AuthAdminPrivateRoute>
       } />
        <Route path="/admin/templates/:templateId/edit" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminTemplateEdit />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />
        <Route path="/admin/templates/:templateId/review" element={
          <AuthAdminPrivateRoute>
            <AdminLayout>
              <AdminTemplateReview />
            </AdminLayout>
          </AuthAdminPrivateRoute>
        } />

        {/* 用户路由 */}
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
        <Route path="/strategy/create" element={
          <AuthPrivateRoute>
            <MainLayout>
              <StrategyCreate />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/strategy/edit/:id" element={
          <AuthPrivateRoute>
            <MainLayout>
              <StrategyEdit />
            </MainLayout>
          </AuthPrivateRoute>
        } />
        <Route path="/strategy/clone" element={
          <AuthPrivateRoute>
            <MainLayout>
              <StrategyClone />
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