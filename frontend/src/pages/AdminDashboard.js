import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Button, Tag, Badge, Progress } from 'antd';
import { UserOutlined, CodeOutlined, BarChartOutlined, LockOutlined, DollarOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    strategyCount: 0,
    activeUsers: 0,
    activeStrategies: 0,
    pendingStrategies: 0,
    totalBalance: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingStrategies, setPendingStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 获取统计数据
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        // 使用模拟数据
        setStats({
          userCount: 100,
          strategyCount: 50,
          activeUsers: 75,
          activeStrategies: 30,
          pendingStrategies: 5,
          totalBalance: 2500000
        });
      }
    };

    // 获取最近创建的用户
    const fetchRecentUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        // 按创建时间排序，取最近5个用户
        const sortedUsers = response.data
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentUsers(sortedUsers);
      } catch (error) {
        console.error('获取用户列表失败:', error);
        // 使用模拟数据
        setRecentUsers([
          { _id: '1', username: 'user5', email: 'user5@example.com', role: 'user', balance: 50000, createdAt: new Date().toISOString() },
          { _id: '2', username: 'user6', email: 'user6@example.com', role: 'user', balance: 75000, createdAt: new Date(Date.now() - 86400000).toISOString() },
          { _id: '3', username: 'user7', email: 'user7@example.com', role: 'user', balance: 100000, createdAt: new Date(Date.now() - 2*86400000).toISOString() },
          { _id: '4', username: 'user8', email: 'user8@example.com', role: 'user', balance: 0, createdAt: new Date(Date.now() - 3*86400000).toISOString() },
          { _id: '5', username: 'user9', email: 'user9@example.com', role: 'user', balance: 125000, createdAt: new Date(Date.now() - 4*86400000).toISOString() }
        ]);
      }
    };

    // 获取待审核的策略
    const fetchPendingStrategies = async () => {
      try {
        const response = await api.get('/admin/strategies', {
          params: { approved: false }
        });
        // 按创建时间排序，取最近5个待审核策略
        const sortedStrategies = response
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setPendingStrategies(sortedStrategies);
      } catch (error) {
        console.error('获取策略列表失败:', error);
        // 使用模拟数据
        setPendingStrategies([
          { _id: 's4', name: '波动率策略', user: { username: 'user5' }, createdAt: new Date().toISOString() },
          { _id: 's5', name: '动量交易策略', user: { username: 'user6' }, createdAt: new Date(Date.now() - 86400000).toISOString() },
          { _id: 's6', name: '均值回归策略', user: { username: 'user7' }, createdAt: new Date(Date.now() - 2*86400000).toISOString() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchRecentUsers();
    fetchPendingStrategies();
  }, []);

  // 图表配置
  const getUserDistributionOption = () => {
    return {
      tooltip: { 
        trigger: 'item' 
      },
      legend: {
        top: '5%',
        left: 'center'
      },
      series: [
        {
          name: '用户分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: stats.activeUsers,
              name: '活跃用户',
              itemStyle: { color: '#1890ff' }
            },
            {
              value: stats.userCount - stats.activeUsers,
              name: '非活跃用户',
              itemStyle: { color: '#d9d9d9' }
            }
          ]
        }
      ]
    };
  };

  // 表格列配置 - 最近用户
  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: role => (
        <Tag color={role === 'admin' ? 'green' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '账户余额',
      dataIndex: 'balance',
      key: 'balance',
      render: balance => balance ? `¥${balance.toLocaleString()}` : '¥0'
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/admin/users/${record._id}`)}
        >
          查看详情
        </Button>
      )
    }
  ];

  // 表格列配置 - 待审核策略
  const strategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '创建用户',
      dataIndex: ['user', 'username'],
      key: 'username',
      render: username => username || '未知用户'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => new Date(date).toLocaleString()
    },
    {
      title: '状态',
      key: 'status',
      render: () => (
        <Badge status="warning" text="待审核" />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          onClick={() => navigate(`/admin/strategies/${record._id}`)}
        >
          审核
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={4}>管理控制台</Title>
      
      {/* 关键指标卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.userCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总策略数"
              value={stats.strategyCount}
              prefix={<CodeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核策略"
              value={stats.pendingStrategies}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={`/ ${stats.strategyCount}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平台总资金"
              value={stats.totalBalance}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
              formatter={(value) => value ? `¥${(value / 10000).toFixed(2)}万` : '¥0'}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 附加指标 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card loading={loading}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>活跃用户比例</Text>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    <Progress percent={(stats.activeUsers / (stats.userCount || 1) * 100).toFixed(0)} strokeColor="#1890ff" />
                    <Text type="secondary" style={{ marginLeft: 16 }}>
                      {stats.activeUsers} / {stats.userCount}
                    </Text>
                  </div>
                </div>
                <div>
                  <Text strong>活跃策略比例</Text>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    <Progress percent={(stats.activeStrategies / (stats.strategyCount || 1) * 100).toFixed(0)} strokeColor="#52c41a" />
                    <Text type="secondary" style={{ marginLeft: 16 }}>
                      {stats.activeStrategies} / {stats.strategyCount}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <Text type="secondary">数据概览</Text>
                    </div>
                    <Button type="link" size="small" onClick={() => navigate('/admin/analytics')}>查看详细分析</Button>
                  </div>
                  <ReactECharts option={getUserDistributionOption()} style={{ height: 200 }} />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* 最近活动区域 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card 
            title="最近注册的用户"
            loading={loading}
            extra={<Button type="link" onClick={() => navigate('/admin/users')}>查看全部</Button>}
          >
            <Table 
              columns={userColumns} 
              dataSource={recentUsers}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="待审核策略"
            loading={loading}
            extra={<Button type="link" onClick={() => navigate('/admin/strategies')}>查看全部</Button>}
          >
            <Table 
              columns={strategyColumns} 
              dataSource={pendingStrategies}
              rowKey="_id"
              pagination={false}
              size="small"
              locale={{
                emptyText: '暂无待审核策略'
              }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 快速操作区域 */}
      <Card style={{ marginTop: 16 }}>
        <Title level={5}>快速操作</Title>
        <div style={{ display: 'flex', gap: 16 }}>
          <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/admin/users')}>
            管理用户
          </Button>
          <Button type="primary" icon={<CodeOutlined />} onClick={() => navigate('/admin/strategies')}>
            管理策略
          </Button>
          <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate('/admin/analytics')}>
            数据分析
          </Button>
          <Button type="default" icon={<LockOutlined />} onClick={() => navigate('/profile')}>
            安全设置
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;