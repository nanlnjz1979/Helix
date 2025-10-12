import React, { useState, useCallback, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, message, Typography, Tag, Card, Input } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { categoryAPI } from '../services/categoryAPI';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminStrategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [form] = Form.useForm();
  const [deleteStrategyId, setDeleteStrategyId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const navigate = useNavigate();

  // 获取策略列表
  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/strategies');
      
      let filteredStrategies = response.data.strategies || [];
      if (filterStatus !== 'all') {
        filteredStrategies = filteredStrategies.filter(
          strategy => strategy.approved === (filterStatus === 'approved')
        );
      }
      
      setStrategies(filteredStrategies);
    } catch (error) {
      console.error('获取策略列表失败:', error);
      message.error('获取策略列表失败');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // 获取策略分类数据
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryAPI.getAllCategories();
      // 确保返回的是数组
      const categoriesList = Array.isArray(data.categories) ? data.categories : [];
      setCategories(categoriesList);
    } catch (error) {
      console.error('获取策略分类失败:', error);
      message.error('获取策略分类失败');
      // 不使用默认分类作为后备，保持categories为空数组
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    fetchCategories();
  }, [filterStatus, fetchStrategies]);

  // 显示审核模态框
  const showReviewModal = (strategy) => {
    setCurrentStrategy(strategy);
    form.setFieldsValue({
      approved: strategy.approved,
      comment: strategy.reviewComment || ''
    });
    setIsReviewModalVisible(true);
  };

  // 处理审核提交
  const handleReviewSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      await api.put(`/admin/strategies/${currentStrategy._id}/review`, {
        approved: values.approved,
        comment: values.comment
      });
      
      message.success('策略审核成功');
      setIsReviewModalVisible(false);
      fetchStrategies();
    } catch (error) {
      console.error('审核失败:', error);
      message.error('审核失败');
    }
  };

  // 显示删除确认模态框
  const showDeleteConfirm = (strategyId) => {
    setDeleteStrategyId(strategyId);
    setIsDeleteModalVisible(true);
  };

  // 处理删除策略
  const handleDelete = async () => {
    try {
      await api.delete(`/admin/strategies/${deleteStrategyId}`);
      message.success('策略删除成功');
      setIsDeleteModalVisible(false);
      fetchStrategies();
    } catch (error) {
      console.error('删除策略失败:', error);
      message.error('删除策略失败');
    }
  };

  // 查看策略详情
  const viewStrategyDetails = (strategyId) => {
    navigate(`/strategy/${strategyId}`);
  };

  // 表格列配置
  const columns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '创建用户',
      dataIndex: 'user',
      key: 'user',
      render: user => user?.username || '未知用户'
    },
    {
      title: '策略类型',
      dataIndex: 'type',
      key: 'type',
      filters: categories.map(category => ({
        text: category.name,
        value: category.name
      })),
      onFilter: (value, record) => record.type === value
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={status === '已启用' ? 'green' : 'default'}>
          {status}
        </Tag>
      )
    },
    {
      title: '审核状态',
      dataIndex: 'approved',
      key: 'approved',
      render: approved => (
        <Tag color={approved ? 'green' : 'red'}>
          {approved ? '已通过' : '待审核'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewStrategyDetails(record._id)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showReviewModal(record)}
          >
            审核
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(record._id)}
          >
            删除
          </Button>
        </>
      )
    }
  ];

  return (
    <div>
      <Title level={4}>策略管理</Title>
      
      <div style={{ marginBottom: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 16 }}>筛选：</span>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
            >
              <Option value="all">全部策略</Option>
              <Option value="approved">已审核</Option>
              <Option value="pending">待审核</Option>
            </Select>
            <div style={{ marginLeft: 'auto' }}>
              <TextArea rows={1} placeholder="搜索策略..." />
            </div>
          </div>
        </Card>
      </div>

      <Table
        columns={columns}
        dataSource={strategies}
        rowKey="_id"
        loading={loading || loadingCategories}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个策略`
        }}
      />

      {/* 审核策略模态框 */}
      <Modal
        title={`审核策略：${currentStrategy?.name}`}
        open={isReviewModalVisible}
        onOk={handleReviewSubmit}
        onCancel={() => setIsReviewModalVisible(false)}
        width={600}
      >
        {currentStrategy && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>策略信息：</div>
            <div>用户：{currentStrategy.user?.username}</div>
            <div>类型：{currentStrategy.type}</div>
            <div>状态：{currentStrategy.status}</div>
          </div>
        )}
        
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="审核状态"
            name="approved"
            rules={[{ required: true, message: '请选择审核状态' }]}
          >
            <Select placeholder="请选择审核状态">
              <Option value={true}>通过</Option>
              <Option value={false}>不通过</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label="审核意见"
            name="comment"
          >
            <TextArea rows={4} placeholder="请输入审核意见" />
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
        <p>确定要删除此策略吗？此操作不可撤销。</p>
      </Modal>
    </div>
  );
};

export default AdminStrategies;