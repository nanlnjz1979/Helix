import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import App from './App';
import LoginModal from './components/modals/LoginModal';
import './index.css';
import { loadUser } from './store/actions/authActions';
import { fetchStrategies } from './store/actions/strategyActions';
import { refreshMarketData } from './store/actions/marketActions';

// 在应用启动时加载用户信息和初始化数据
store.dispatch(loadUser());
store.dispatch(fetchStrategies());
store.dispatch(refreshMarketData());

// 创建应用包装器，包含登录模态框
const AppWrapper = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 暴露全局方法用于显示登录模态框
  useEffect(() => {
    window.showLoginModal = () => {
      setShowLoginModal(true);
    };

    // 清理函数
    return () => {
      delete window.showLoginModal;
    };
  }, []);

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  return (
    <>
      <App />
      <LoginModal
        visible={showLoginModal}
        onCancel={handleCloseLoginModal}
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