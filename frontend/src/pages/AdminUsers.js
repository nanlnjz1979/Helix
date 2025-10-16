import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, InputNumber, DatePicker, Popconfirm, Switch, Space, Divider, Card, Tag, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, UserOutlined, EyeOutlined, LockOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    role: undefined,
    balanceRange: [0, 1000000],
    registrationDate: undefined
  });
  const [form] = Form.useForm();
  const [deleteUserId, setDeleteUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = {};
      if (searchText) params.search = searchText;
      if (filters.role) params.role = filters.role;
      if (filters.balanceRange) {
        params.minBalance = filters.balanceRange[0];
        params.maxBalance = filters.balanceRange[1];
      }
      if (filters.registrationDate) {
        params.startDate = filters.registrationDate[0].format('YYYY-MM-DD');
        params.endDate = filters.registrationDate[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get('/admin/users', {
        params
      });
      // 后端返回的是包含users数组的对象，需要正确提取
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
      setUsers([]); // 发生错误时设置为空数组
    } finally {
      setLoading(false);
    }
  }, [searchText, filters]);

  // 获取用户列表
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
    fetchUsers();
  };

  // 处理筛选
  const handleFilter = (values) => {
    setFilters({
      ...filters,
      ...values
    });
    fetchUsers();
    setIsFilterVisible(false);
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      role: undefined,
      balanceRange: [0, 1000000],
      registrationDate: undefined
    });
    setSearchText('');
    fetchUsers();
  };

  // 显示用户详情
  const showUserDetail = (user) => {
    setCurrentUser(user);
    setIsDetailModalVisible(true);
  };

  // 显示重置密码模态框
  const showResetPasswordModal = (user) => {
    setCurrentUser(user);
    setIsResetPasswordModalVisible(true);
  };

  // 处理重置密码
  const handleResetPassword = async () => {
    try {
      await api.post(`/admin/users/${currentUser._id}/reset-password`);
      message.success('密码已重置，新密码已发送到用户邮箱');
      setIsResetPasswordModalVisible(false);
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    try {
      await api.post('/admin/users/batch-delete', { userIds: selectedRowKeys });
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    }
  };

  // 处理用户状态切换
  const handleStatusChange = async (userId, status) => {
    try {
      // 使用现有的updateUser路由来更新用户状态
      await api.put(`/admin/users/${userId}`, { active: status });
      message.success(status ? '用户已启用' : '用户已禁用');
      fetchUsers();
    } catch (error) {
      console.error('修改用户状态失败:', error);
      message.error('修改用户状态失败');
    }
  };

  // 显示编辑用户模态框
  const showModal = (user = null) => {
    setCurrentUser(user);
    if (user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 处理表单提交
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (currentUser) {
        // 更新用户
        await api.put(`/admin/users/${currentUser._id}/role`, { role: values.role });
        message.success('用户更新成功');
      } else {
        // 创建用户（这里只是示例，实际创建用户应使用注册API）
        message.info('请使用注册页面创建新用户');
      }
      
      setIsModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  // 显示删除确认模态框
  const showDeleteConfirm = (userId) => {
    setDeleteUserId(userId);
    setIsDeleteModalVisible(true);
  };

  // 处理删除用户
  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${deleteUserId}`);
      message.success('用户删除成功');
      setIsDeleteModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败');
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: '管理员', value: 'admin' },
        { text: '普通用户', value: 'user' }
      ],
      onFilter: (value, record) => record.role === value,
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
      sorter: (a, b) => a.balance - b.balance,
      render: balance => `¥${balance.toLocaleString()}`
    },
    {
      title: '交易总额',
      dataIndex: 'tradingVolume',
      key: 'tradingVolume',
      sorter: (a, b) => a.tradingVolume - b.tradingVolume,
      render: volume => volume ? `¥${volume.toLocaleString()}` : '¥0'
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: date => new Date(date).toLocaleString()
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      sorter: (a, b) => new Date(a.lastLogin) - new Date(b.lastLogin),
      render: date => date ? new Date(date).toLocaleString() : '从未登录'
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      filters: [
        { text: '活跃', value: true },
        { text: '非活跃', value: false }
      ],
      onFilter: (value, record) => record.active === value,
      render: (active, record) => (
        record.role === 'admin' ? (
          <Tag color="default">管理员</Tag>
        ) : (
          <Switch
            checked={active}
            onChange={(checked) => handleStatusChange(record._id, checked)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showUserDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            disabled={record.role === 'admin' && localStorage.getItem('username') === record.username}
          >
            编辑角色
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => showResetPasswordModal(record)}
            disabled={record.role === 'admin'}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            description="此操作不可撤销，删除后用户数据将无法恢复。"
            onConfirm={() => showDeleteConfirm(record._id)}
            okText="确定"
            cancelText="取消"
            placement="left"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.role === 'admin'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record) => ({
      disabled: record.role === 'admin',
    }),
  };

  return (
    <div>
      <Title level={4}>用户管理</Title>
      
      {/* 搜索和筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="搜索用户名或邮箱"
              allowClear
              enterButton="搜索"
              size="middle"
              onSearch={handleSearch}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col>
            <Button
              type="default"
              icon={<FilterOutlined />}
              onClick={() => setIsFilterVisible(true)}
            >
              高级筛选
            </Button>
          </Col>
          <Col>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={resetFilters}
            >
              重置
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 批量操作区域 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            添加用户
          </Button>
          <Button
            type="danger"
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个用户`
        }}
        rowSelection={rowSelection}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: loading ? '加载中...' : '暂无用户数据'
        }}
      />

      {/* 编辑用户模态框 */}
      <Modal
        title={currentUser ? '编辑用户角色' : '添加用户'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
        >
          {currentUser ? (
            <>
              <Form.Item label="用户名" name="username" disabled>
                <Input placeholder="用户名" />
              </Form.Item>
              <Form.Item label="邮箱" name="email" disabled>
                <Input placeholder="邮箱" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="用户名" />
              </Form.Item>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[{ required: true, message: '请输入邮箱' }]}
              >
                <Input placeholder="邮箱" />
              </Form.Item>
              <Form.Item
                label="初始密码"
                name="password"
                rules={[{ required: true, message: '请设置初始密码' }]}
              >
                <Input.Password placeholder="初始密码" />
              </Form.Item>
            </>
          )}
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={isDeleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="确认"
        cancelText="取消"
        okType="danger"
      >
        <p>确定要删除此用户吗？此操作不可撤销，删除后用户数据将无法恢复。</p>
      </Modal>

      {/* 用户详情模态框 */}
      <Modal
        title="用户详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {currentUser && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Paragraph>
                <Text strong>用户名：</Text>
                {currentUser.username}
              </Paragraph>
              <Paragraph>
                <Text strong>邮箱：</Text>
                {currentUser.email}
              </Paragraph>
              <Paragraph>
                <Text strong>角色：</Text>
                <Tag color={currentUser.role === 'admin' ? 'green' : 'blue'}>
                  {currentUser.role === 'admin' ? '管理员' : '普通用户'}
                </Tag>
              </Paragraph>
              <Paragraph>
                <Text strong>账户余额：</Text>
                ¥{currentUser.balance.toLocaleString()}
              </Paragraph>
              <Paragraph>
                <Text strong>交易总额：</Text>
                ¥{currentUser.tradingVolume ? currentUser.tradingVolume.toLocaleString() : '0'}
              </Paragraph>
            </div>
            <Divider />
            <div>
              <Paragraph>
                <Text strong>注册时间：</Text>
                {new Date(currentUser.createdAt).toLocaleString()}
              </Paragraph>
              <Paragraph>
                <Text strong>最后登录：</Text>
                {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : '从未登录'}
              </Paragraph>
              <Paragraph>
                <Text strong>状态：</Text>
                {currentUser.active ? (
                  <Tag color="green">活跃</Tag>
                ) : (
                  <Tag color="red">禁用</Tag>
                )}
              </Paragraph>
            </div>
          </div>
        )}
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title="重置密码"
        open={isResetPasswordModalVisible}
        onOk={handleResetPassword}
        onCancel={() => setIsResetPasswordModalVisible(false)}
        okText="确认重置"
        cancelText="取消"
        okType="primary"
      >
        <p>确定要重置用户 "{currentUser?.username}" 的密码吗？</p>
        <p style={{ color: '#faad14', marginTop: 8 }}>重置后，系统将生成随机密码并发送到用户邮箱。</p>
      </Modal>

      {/* 筛选条件模态框 */}
      <Modal
        title="高级筛选"
        open={isFilterVisible}
        onOk={() => {
          const values = form.getFieldsValue();
          handleFilter(values);
        }}
        onCancel={() => setIsFilterVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="role" label="角色">
            <Select placeholder="选择角色">
              <Option value="admin">管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>
          <Form.Item label="余额范围">
            <Space>
              <Form.Item name="minBalance" noStyle>
                <InputNumber placeholder="最小余额" min={0} style={{ width: 120 }} />
              </Form.Item>
              <span>至</span>
              <Form.Item name="maxBalance" noStyle>
                <InputNumber placeholder="最大余额" min={0} style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="registrationDate" label="注册日期范围">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;