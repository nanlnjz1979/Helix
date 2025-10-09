import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import Footer from '../Footer';
import '../Footer.css';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  LineChartOutlined,
  CodeOutlined,
  ExperimentOutlined,
  SwapOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const userMenu = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile')
    },
    {
      key: 'faq',
      label: '常见问题',
      icon: <QuestionCircleOutlined />,
      onClick: () => navigate('/faq')
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];
  
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'market',
      icon: <LineChartOutlined />,
      label: '市场行情',
      onClick: () => navigate('/market')
    },
    {
      key: 'strategy',
      icon: <CodeOutlined />,
      label: '交易策略',
      onClick: () => navigate('/strategy')
    },
    {
      key: 'backtest',
      icon: <ExperimentOutlined />,
      label: '策略回测',
      onClick: () => navigate('/backtest')
    },
    {
      key: 'trading',
      icon: <SwapOutlined />,
      label: '自动交易',
      onClick: () => navigate('/trading')
    },
    {
      key: 'faq',
      icon: <QuestionCircleOutlined />,
      label: '常见问题',
      onClick: () => navigate('/faq')
    }
  ];
  
  const selectedKey = location.pathname.split('/')[1] || 'dashboard';
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo">
          {!collapsed ? '量化交易平台' : 'QT'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ float: 'right', marginRight: 20 }}>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Button type="text" style={{ height: 64 }}>
                <Avatar icon={<UserOutlined />} />
                {!collapsed && <span style={{ marginLeft: 8 }}>{user.username || '用户'}</span>}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 'calc(100vh - 240px)' }}>
          {children}
        </Content>
        <Footer />
      </Layout>
    </Layout>
  );
};

export default MainLayout;