import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import App from './App';
import LoginModal from './components/modals/LoginModal';
import RegisterModal from './components/modals/RegisterModal';
import './index.css';
import { loadUser } from './store/actions/authActions';
import { fetchStrategies } from './store/actions/strategyActions';
import { refreshMarketData } from './store/actions/marketActions';

// 在应用启动时加载用户信息和初始化数据
store.dispatch(loadUser());
store.dispatch(fetchStrategies());
store.dispatch(refreshMarketData());

// 创建应用包装器，包含登录模态框和注册模态框
const AppWrapper = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // 暴露全局方法用于显示登录模态框
  useEffect(() => {
    window.showLoginModal = () => {
      console.log('showLoginModal called');
      setShowLoginModal(true);
    };

    // 暴露全局方法用于显示注册模态框
    window.showRegisterModal = () => {
      console.log('showRegisterModal called');
      setShowRegisterModal(true);
    };

    // 清理函数
    return () => {
      delete window.showLoginModal;
      delete window.showRegisterModal;
    };
  }, []);

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterSuccess = () => {
    // 注册成功后关闭注册模态框，打开登录模态框
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <App />
      <LoginModal
        visible={showLoginModal}
        onCancel={handleCloseLoginModal}
      />
      <RegisterModal
        visible={showRegisterModal}
        onCancel={handleCloseRegisterModal}
        onRegisterSuccess={handleRegisterSuccess}
      />
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// 注意：已移除错误的脚本加载代码，该代码尝试从错误路径加载文件