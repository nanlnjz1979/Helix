import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Tag,
  List,
  Empty,
  message,
  Spin,
  Row,
  Col,
  Statistic,
  Divider,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Transfer,
  Popconfirm
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  LinkOutlined,
  FilterOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import categoryAPI from '../services/categoryAPI';
import api from '../services/api';

const {
  Title,
  Text,
  Paragraph
} = Typography;

const AdminCategoryDetails = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  
  const [category, setCategory] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isAssignStrategiesModalVisible, setIsAssignStrategiesModalVisible] = useState(false);
  const [allStrategies, setAllStrategies] = useState([]);
  const [selectedStrategies, setSelectedStrategies] = useState([]);
  const [editForm] = Form.useForm();
  const [performanceData, setPerformanceData] = useState({});
  const [topLevelCategories, setTopLevelCategories] = useState([]);

  // 获取类别详情
  const fetchCategoryDetails = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getCategoryById(categoryId);
      setCategory(data);
    } catch (error) {
      message.error('获取类别详情失败：' + (error.response?.data?.message || error.message));
      navigate('/admin/categories');
    } finally {
      setLoading(false);
    }
  };

  // 获取类别下的策略
  const fetchCategoryStrategies = async () => {
    setStrategyLoading(true);
    try {
      const data = await categoryAPI.getStrategiesByCategory(categoryId);
      setStrategies(data);
      // 计算策略绩效数据
      calculatePerformanceData(data);
    } catch (error) {
      message.error('获取策略列表失败：' + (error.response?.data?.message || error.message));
    } finally {
      setStrategyLoading(false);
    }
  };

  // 类别变更历史功能已删除

  // 计算绩效数据
  const calculatePerformanceData = (strategies) => {
    if (!strategies || strategies.length === 0) {
      setPerformanceData({});
      return;
    }

    // 简单计算示例 - 根据实际数据结构调整
    const totalReturn = strategies.reduce((sum, strategy) => {
      const returnValue = strategy.performance?.totalReturn || 0;
      return sum + returnValue;
    }, 0);

    const avgReturn = totalReturn / strategies.length;
    const activeStrategies = strategies.filter(s => s.status === 'active').length;
    const avgDrawdown = strategies.reduce((sum, strategy) => {
      const drawdown = strategy.performance?.maxDrawdown || 0;
      return sum + drawdown;
    }, 0) / strategies.length;

    // 构建图表数据
    const performanceChart = {
      title: {
        text: '策略表现对比',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['年化收益率', '最大回撤'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: strategies.slice(0, 10).map(s => s.name)
      },
      series: [
        {
          name: '年化收益率',
          type: 'bar',
          data: strategies.slice(0, 10).map(s => (s.performance?.annualReturn || 0).toFixed(2)),
          itemStyle: {
            color: '#52c41a'
          }
        },
        {
          name: '最大回撤',
          type: 'bar',
          data: strategies.slice(0, 10).map(s => (s.performance?.maxDrawdown || 0).toFixed(2)),
          itemStyle: {
            color: '#ff4d4f'
          }
        }
      ]
    };

    setPerformanceData({
      avgReturn: avgReturn.toFixed(2),
      avgDrawdown: avgDrawdown.toFixed(2),
      activeStrategies,
      chart: performanceChart
    });
  };

  // 获取所有可关联的策略
  const fetchAllStrategies = async () => {
    try {
      const response = await api.get('/admin/strategies');
      const availableStrategies = response.data.filter(s => 
        !strategies.some(ss => ss._id === s._id)
      );
      setAllStrategies(availableStrategies.map(s => ({
        key: s._id,
        title: s.name,
        description: s.description
      })));
    } catch (error) {
      message.error('获取策略列表失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理编辑类别
  const handleEditCategory = async (values) => {
    try {
      const categoryData = {
        name: values.name,
        description: values.description,
        parent: values.parent || null,
        tags: values.tags || [],
        visibility: values.isPublic !== false ? 'public' : 'private'
      };
      await categoryAPI.updateCategory(categoryId, categoryData);
      message.success('类别更新成功！');
      setIsEditModalVisible(false);
      fetchCategoryDetails();
    } catch (error) {
      message.error('更新类别失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理删除类别
  const handleDeleteCategory = async () => {
    try {
      await categoryAPI.deleteCategory(categoryId);
      message.success('类别删除成功！');
      setIsDeleteConfirmVisible(false);
      navigate('/admin/categories');
    } catch (error) {
      message.error('删除类别失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理关联策略
  const handleAssignStrategies = async () => {
    try {
      // 对每个选中的策略进行关联
      const promises = selectedStrategies.map(strategyId => {
        // 获取该策略当前关联的所有类别
        return categoryAPI.getStrategyCategories(strategyId)
          .then(currentCategories => {
            // 合并现有类别和当前类别
            const allCategoryIds = [...currentCategories.map(c => c._id), categoryId];
            // 去重
            const uniqueCategoryIds = [...new Set(allCategoryIds)];
            // 更新策略的类别关联
            return categoryAPI.assignStrategyToCategory(strategyId, uniqueCategoryIds);
          });
      });

      await Promise.all(promises);
      message.success('策略关联成功！');
      setIsAssignStrategiesModalVisible(false);
      setSelectedStrategies([]);
      // 重新加载策略列表
      fetchCategoryStrategies();
    } catch (error) {
      message.error('关联策略失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 获取所有顶级类别（parent==null）
  const fetchTopLevelCategories = async () => {
    try {
      const allCategories = await categoryAPI.getAllCategories();
      // 过滤出 parent==null 的顶级类别+


      
      const topCategories = allCategories.filter(cat => 
        cat.parent === null && cat._id !== categoryId
      );
      setTopLevelCategories(topCategories);
    } catch (error) {
      console.error('获取顶级类别失败:', error);
      message.error('加载父类别列表失败');
    }
  };

  // 打开编辑模态框
  const showEditModal = async () => {
    editForm.setFieldsValue({
      name: category.name,
      description: category.description,
      parent: category.parent?._id || undefined,
      tags: category.tags || []
    });
    
    // 先加载顶级类别列表，再显示模态框
    try {
      const data = await categoryAPI.getAllCategories();
      console.log('原始类别数据:', data);
      
      // 增强数据处理逻辑，处理多种可能的数据格式
      let allCategories = [];
      if (Array.isArray(data)) {
        allCategories = data;
      } else if (data && typeof data === 'object') {
        // 检查常见的数据嵌套格式
        if (Array.isArray(data.data)) {
          allCategories = data.data;
          console.log('发现嵌套数据格式，使用data.data作为类别数组');
        } else if (Array.isArray(data.categories)) {
          allCategories = data.categories;
          console.log('发现嵌套数据格式，使用data.categories作为类别数组');
        } else {
          console.warn('响应数据不是数组，也不包含可识别的数组属性');
        }
      }
      
      // 过滤出 parent==null 的顶级类别，并排除当前类别
      const topCategories = allCategories.filter(cat => 
        cat.parent === null && cat._id !== categoryId
      );
      console.log('加载的顶级类别:', topCategories);
      setTopLevelCategories(topCategories);
      
      // 数据加载完成后再显示模态框
      setIsEditModalVisible(true);
    } catch (error) {
      console.error('获取顶级类别失败:', error);
      message.error('加载父类别列表失败');
      // 即使加载失败也显示模态框，让用户可以编辑其他字段
      setIsEditModalVisible(true);
    }
  };

  // 打开关联策略模态框
  const showAssignStrategiesModal = () => {
    setSelectedStrategies([]);
    fetchAllStrategies();
    setIsAssignStrategiesModalVisible(true);
  };

  // 查看策略详情
  const viewStrategyDetails = (strategyId) => {
    navigate(`/admin/strategies/${strategyId}`);
  };

  // 表格列配置
  const strategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Button type="link" onClick={() => viewStrategyDetails(record._id)}>
          {text}
        </Button>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: type => <Tag color="blue">{type}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => {
        let color = 'default';
        if (status === 'active') color = 'green';
        if (status === 'pending') color = 'orange';
        if (status === 'inactive') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: '创建者',
      dataIndex: ['user', 'username'],
      key: 'username',
      render: username => username || '未知'
    },
    {
      title: '年化收益',
      key: 'annualReturn',
      render: (_, record) => (
        <Text>
          {record.performance?.annualReturn ? `${record.performance.annualReturn.toFixed(2)}%` : '-'} 
          {record.performance?.annualReturn > 0 && (
            <Text type="success">↑</Text>
          )}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要从该类别移除这个策略吗？"
          onConfirm={async () => {
            try {
              // 获取该策略当前关联的所有类别
              const currentCategories = await categoryAPI.getStrategyCategories(record._id);
              // 确保currentCategories始终是数组
              const categoriesArray = Array.isArray(currentCategories) ? currentCategories : [];
              // 移除当前类别
              const newCategoryIds = categoriesArray
                .filter(c => c._id !== categoryId)
                .map(c => c._id);
              // 更新策略的类别关联
              await categoryAPI.assignStrategyToCategory(record._id, newCategoryIds);
              message.success('策略移除成功！');
              // 重新加载策略列表
              fetchCategoryStrategies();
            } catch (error) {
              message.error('移除策略失败：' + (error.response?.data?.message || error.message));
            }
          }}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger size="small">
            移除
          </Button>
        </Popconfirm>
      )
    }
  ];

  // 初始加载数据
  useEffect(() => {
    if (categoryId) {
      fetchCategoryDetails();
    }
  }, [categoryId]);

  // 加载策略和历史记录
  useEffect(() => {
    if (category) {
      fetchCategoryStrategies();
    }
  }, [category]);

  // 当策略加载完成后，无需加载历史记录（功能已删除）

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/admin/categories')}
        style={{ marginBottom: 16 }}
      >
        返回类别列表
      </Button>
      
      {/* 类别基本信息 */}
      <Card 
        title={
          <Space>
            {category.name}
            {category.isPublic === false && <Tag color="red">私有</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button type="link" icon={<EditOutlined />} onClick={showEditModal}>
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个类别吗？"
              description="删除后，关联的策略将不再属于该类别，但不会被删除。"
              onConfirm={() => setIsDeleteConfirmVisible(true)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>描述：</Text>
          <Paragraph>{category.description || '暂无描述'}</Paragraph>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>父类别：</Text>
          <Text>
            {category.parent ? (
              <Button 
                type="link" 
                onClick={() => navigate(`/admin/categories/${category.parent._id}`)}
              >
                {category.parent.name}
              </Button>
            ) : (
              '无'
            )}
          </Text>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>标签：</Text>
          <Space wrap>
            {category.tags?.map(tag => (
              <Tag key={tag} color="blue">{tag}</Tag>
            )) || <Text type="secondary">无</Text>}
          </Space>
        </div>
        
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>创建时间：</Text>
          <Text>{new Date(category.createdAt).toLocaleString()}</Text>
        </div>
      </Card>
      
      {/* 类别统计和图表 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="关联策略数"
              value={strategies.length}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃策略数"
              value={performanceData.activeStrategies || 0}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均年化收益"
              value={performanceData.avgReturn || 0}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均最大回撤"
              value={performanceData.avgDrawdown || 0}
              suffix="%"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 策略表现图表 */}
      <Card title="策略表现对比" style={{ marginBottom: 16 }}>
        {Object.keys(performanceData.chart || {}).length > 0 ? (
          <ReactECharts option={performanceData.chart} style={{ height: 400 }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '100px 0' }}>
            暂无足够数据生成图表
          </div>
        )}
      </Card>
      
      {/* 关联策略列表 */}
      <Card 
        title="关联策略列表"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAssignStrategiesModal}
          >
            关联策略
          </Button>
        }
        loading={strategyLoading}
      >
        {strategies.length > 0 ? (
          <Table
            columns={strategyColumns}
            dataSource={strategies}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="暂无关联策略" />
        )}
      </Card>
      
      {/* 变更历史功能已删除 */}

      {/* 编辑类别模态框 */}
      <Modal
        title="编辑类别"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditCategory}
        >
          <Form.Item
            name="name"
            label="类别名称"
            rules={[{ required: true, message: '请输入类别名称' }]}
          >
            <Input placeholder="请输入类别名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="类别描述"
          >
            <Input.TextArea placeholder="请输入类别描述" rows={4} />
          </Form.Item>
          
          <Form.Item
            name="parent"
            label="父类别"
          >
            <Select placeholder="选择父类别（可选）">
              {topLevelCategories.map(cat => (
                <Select.Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              allowCreate
            >
              {category.tags?.map(tag => (
                <Select.Option key={tag} value={tag}>{tag}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsEditModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 关联策略模态框 */}
      <Modal
        title="关联策略"
        open={isAssignStrategiesModalVisible}
        onCancel={() => setIsAssignStrategiesModalVisible(false)}
        footer={null}
        width={800}
      >
        <Transfer
          dataSource={allStrategies}
          titles={['可关联策略', '已选择策略']}
          targetKeys={selectedStrategies}
          onChange={setSelectedStrategies}
          listStyle={{ height: 400 }}
          render={item => item.title}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setIsAssignStrategiesModalVisible(false)}>
            取消
          </Button>
          <Button type="primary" onClick={handleAssignStrategies}>
            确认关联
          </Button>
        </div>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={isDeleteConfirmVisible}
        onCancel={() => setIsDeleteConfirmVisible(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ marginBottom: '20px' }}>
            确定要删除类别 "{category.name}" 吗？
          </p>
          <p style={{ color: '#ff4d4f', marginBottom: '30px' }}>
            注意：删除后，关联的策略将不再属于该类别，但不会被删除。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Button onClick={() => setIsDeleteConfirmVisible(false)}>
              取消
            </Button>
            <Button type="primary" danger onClick={handleDeleteCategory}>
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCategoryDetails;