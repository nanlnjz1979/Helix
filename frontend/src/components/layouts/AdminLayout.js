import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  CodeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  
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
      label: '管理仪表盘',
      onClick: () => navigate('/admin/dashboard')
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
      onClick: () => navigate('/admin/analytics')
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
      onClick: () => navigate('/admin/users')
    },
    {
      key: 'strategies',
      icon: <CodeOutlined />,
      label: '策略管理',
      onClick: () => navigate('/admin/strategies')
    }
  ];
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo">
          {!collapsed ? '管理后台' : 'Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
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
                <Avatar icon={<SettingOutlined />} />
                {!collapsed && <span style={{ marginLeft: 8 }}>{user.username || '管理员'}</span>}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;