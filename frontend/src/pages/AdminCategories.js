import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  TreeSelect,
  Tag,
  Popconfirm,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Divider,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TagOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  FilterOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import categoryAPI from '../services/categoryAPI';

const {
  Title,
  Text
} = Typography;

const {
  Option
} = Select;

const AdminCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [statistics, setStatistics] = useState({
    totalCategories: 0,
    totalStrategies: 0,
    averageStrategiesPerCategory: 0
  });
  const [categoryDistributionChart, setCategoryDistributionChart] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // 组件初始化时加载数据
  useEffect(() => {
    // 同时加载类别数据和统计数据
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchCategories(),
          fetchCategoryStatistics()
        ]);
      } catch (error) {
        console.error('初始化数据加载失败:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // 获取所有类别
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getAllCategories();
      console.log('原始响应数据:', data);
      
      // 增强数据处理逻辑，处理多种可能的数据格式
      let categoriesData = [];
      if (Array.isArray(data)) {
        categoriesData = data;
      } else if (data && typeof data === 'object') {
        // 检查常见的数据嵌套格式
        if (Array.isArray(data.data)) {
          categoriesData = data.data;
          console.log('发现嵌套数据格式，使用data.data作为类别数组');
        } else if (Array.isArray(data.categories)) {
          categoriesData = data.categories;
          console.log('发现嵌套数据格式，使用data.categories作为类别数组');
        } else {
          console.warn('响应数据不是数组，也不包含可识别的数组属性');
        }
      }
      
      console.log('处理后的类别数据:', categoriesData);
      setCategories(categoriesData);
      // 构建树结构数据
      const tree = buildTreeData(categoriesData);
      setTreeData(tree);
      // 收集所有标签
      const tags = new Set();
      categoriesData.forEach(category => {
        if (category.tags) {
          category.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error('获取类别失败:', error);
      message.error('获取类别失败：' + (error.response?.data?.message || error.message));
      // 出错时确保categories是数组
      setCategories([]);
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取类别统计数据
  const fetchCategoryStatistics = async () => {
    try {
      const data = await categoryAPI.getCategoryStatistics();
      setStatistics(data);
      // 构建类别分布图表数据
      const chartData = data.categoryDistribution.map(item => ({
        name: item.name,
        value: item.strategyCount
      }));
      setCategoryDistributionChart({
        title: {
          text: '策略类别分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 10,
          data: data.categoryDistribution.map(item => item.name)
        },
        series: [
          {
            name: '策略数量',
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
            data: chartData
          }
        ]
      });
    } catch (error) {
      console.error('获取类别统计数据失败:', error);
    }
  };

  // 构建树形结构数据
  const buildTreeData = (categories, parentId = null) => {
    // 确保categories始终是数组
    if (!Array.isArray(categories)) {
      console.warn('buildTreeData: categories不是数组，返回空数组');
      return [];
    }
    
    return categories
      .filter(category => category.parent?.toString() === parentId?.toString() || (!parentId && !category.parent))
      .map(category => {
        const children = buildTreeData(categories, category._id);
        return {
          title: (
            <Tooltip title={`策略数量: ${category.strategyCount || 0}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {category.name}
                {category.tags && category.tags.length > 0 && (
                  <span style={{ color: '#888', fontSize: '12px' }}>({category.tags.length}个标签)</span>
                )}
              </span>
            </Tooltip>
          ),
          value: category._id,
          key: category._id,
          children: children.length > 0 ? children : undefined,
          disabled: false,
          selectable: true
        };
      });
  };

  // 处理创建类别
  const handleCreateCategory = async (values) => {
    try {
      const categoryData = {
        name: values.name,
        description: values.description,
        parent: values.parent || null,
        tags: values.tags || [],
        visibility: values.isPublic !== false ? 'public' : 'private'
      };
      await categoryAPI.createCategory(categoryData);
      message.success('类别创建成功！');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      fetchCategories();
      fetchCategoryStatistics();
    } catch (error) {
      message.error('创建类别失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理编辑类别
  const handleEditCategory = async (values) => {
    if (!currentCategory) return;
    try {
      const categoryData = {
        name: values.name,
        description: values.description,
        parent: values.parent || null,
        tags: values.tags || [],
        visibility: values.isPublic !== false ? 'public' : 'private'
      };
      await categoryAPI.updateCategory(currentCategory._id, categoryData);
      message.success('类别更新成功！');
      setIsEditModalVisible(false);
      setCurrentCategory(null);
      fetchCategories();
      fetchCategoryStatistics();
    } catch (error) {
      message.error('更新类别失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理删除类别
  const handleDeleteCategory = async () => {
    if (!currentCategory) return;
    try {
      await categoryAPI.deleteCategory(currentCategory._id);
      message.success('类别删除成功！');
      setIsDeleteConfirmVisible(false);
      setCurrentCategory(null);
      fetchCategories();
      fetchCategoryStatistics();
    } catch (error) {
      message.error('删除类别失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 打开创建模态框
  const showCreateModal = () => {
    createForm.resetFields();
    setIsCreateModalVisible(true);
    // 确保数据已加载，必要时刷新数据
    if (categories.length === 0) {
      fetchCategories();
    }
  };

  // 打开编辑模态框
  const showEditModal = (category) => {
    setCurrentCategory(category);
    editForm.setFieldsValue({
      name: category.name,
      description: category.description,
      parent: category.parent?._id || undefined,
      tags: category.tags || [],
      isPublic: category.isPublic !== false
    });
    setIsEditModalVisible(true);
  };

  // 打开删除确认框
  const showDeleteConfirm = (category) => {
    setCurrentCategory(category);
    setIsDeleteConfirmVisible(true);
  };

  // 查看类别详情
  const viewCategoryDetails = (categoryId) => {
    navigate(`/admin/categories/${categoryId}`);
  };

  // 查看该类别下的所有策略
  const viewCategoryStrategies = async (categoryId) => {
    navigate(`/admin/strategies?category=${categoryId}`);
  };

  // 表格列配置
  const columns = [
    {
      title: '类别名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.isPublic === false && <Tag color="red">私有</Tag>}
        </Space>
      )
    },
    {
      title: '父类别',
      dataIndex: 'parent',
      key: 'parent',
      render: (parent) => {
        if (!parent) return '无';
        if (typeof parent === 'string') {
          // 查找对应的父类别名称
          const parentCategory = categories.find(c => c._id === parent);
          return parentCategory ? parentCategory.name : '未找到';
        }
        return parent.name || '无';
      }
    },
    {
      title: '策略数量',
      dataIndex: 'strategyCount',
      key: 'strategyCount',
      render: (count = 0) => (
        <Button 
          type="link" 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            viewCategoryStrategies(currentCategory?._id);
          }}
        >
          {count}
        </Button>
      )
    },
    {
      title: '标签',
      key: 'tags',
      render: (_, record) => (
        <Space wrap>
          {record.tags?.map(tag => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          )) || <Text type="secondary">无</Text>}
        </Space>
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
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            size="small" 
            onClick={() => viewCategoryDetails(record._id)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个类别吗？"
            description="删除后，关联的策略将不再属于该类别，但不会被删除。"
            onConfirm={() => showDeleteConfirm(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 筛选类别 - 确保categories始终是数组
  const filteredCategories = Array.isArray(categories) ? 
    categories.filter(category => {
      // 标签筛选逻辑
      const tagCondition = selectedTags.length === 0 || 
        (category.tags && selectedTags.some(tag => category.tags.includes(tag)));
      
      // 类别层次结构筛选逻辑
      const categoryCondition = !selectedCategory || 
        category._id === selectedCategory || 
        (category.parent && (typeof category.parent === 'string' ? 
          category.parent === selectedCategory : category.parent._id === selectedCategory));
      
      return tagCondition && categoryCondition;
    }) : [];

  // 清空选择的类别
  const clearSelectedCategory = () => {
    setSelectedCategory(null);
  }

  return (
    <div>
      <Title level={4}>策略类型管理</Title>
      
      {/* 统计数据卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总类别数"
              value={statistics.totalCategories}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="关联策略总数"
              value={statistics.totalStrategies}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均每类别策略数"
              value={statistics.averageStrategiesPerCategory?.toFixed(1) || '0.0'}
              prefix={<FilterOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={showCreateModal}
            >
              创建新类别
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 图表和筛选区域 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="类别分布" loading={loading}>
            {Object.keys(categoryDistributionChart).length > 0 ? (
              <ReactECharts option={categoryDistributionChart} style={{ height: 300 }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>
                暂无数据
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按标签筛选">
            <div style={{ marginBottom: 16 }}>
              <Text strong>选择标签：</Text>
            </div>
            <Select
              mode="multiple"
              placeholder="请选择标签"
              value={selectedTags}
              onChange={setSelectedTags}
              style={{ width: '100%' }}
              allowClear
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                已选择 {selectedTags.length} 个标签，筛选出 {filteredCategories.length} 个类别
              </Text>
            </div>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>类别层级结构：</Text>
                {selectedCategory && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={clearSelectedCategory}
                    style={{ marginLeft: 8 }}
                  >
                    清空选择
                  </Button>
                )}
              </div>
              <Button 
                type="link" 
                icon={<BarChartOutlined />}
                onClick={fetchCategoryStatistics}
              >
                刷新统计
              </Button>
            </div>
            <TreeSelect
              treeData={treeData}
              placeholder="选择类别"
              style={{ width: '100%', marginTop: 8 }}
              allowClear
              treeDefaultExpandAll
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* 类别列表 */}
      <Card title="类别列表" loading={loading}>
        <Table
          columns={columns}
          dataSource={filteredCategories}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: '暂无类别数据'
          }}
        />
      </Card>

      {/* 创建类别模态框 */}
      <Modal
        title="创建新类别"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateCategory}
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
            <TreeSelect
              treeData={treeData}
              placeholder="选择父类别（可选）"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              allowCreate
            />
          </Form.Item>
          
          <Form.Item
            name="isPublic"
            label="公开类别"
            valuePropName="checked"
          >
            <Select
              placeholder="选择类别可见性"
              style={{ width: '100%' }}
            >
              <Option value={true}>公开（所有成员可见）</Option>
              <Option value={false}>私有（仅创建者可见）</Option>
            </Select>
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsCreateModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 编辑类别模态框 */}
      <Modal
        title="编辑类别"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setCurrentCategory(null);
        }}
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
            <TreeSelect
              treeData={treeData.filter(item => item.key !== currentCategory?._id)}
              placeholder="选择父类别（可选）"
              treeDefaultExpandAll
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              allowCreate
            />
          </Form.Item>
          
          <Form.Item
            name="isPublic"
            label="公开类别"
          >
            <Select
              placeholder="选择类别可见性"
              style={{ width: '100%' }}
            >
              <Option value={true}>公开（所有成员可见）</Option>
              <Option value={false}>私有（仅创建者可见）</Option>
            </Select>
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => {
              setIsEditModalVisible(false);
              setCurrentCategory(null);
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={isDeleteConfirmVisible}
        onCancel={() => {
          setIsDeleteConfirmVisible(false);
          setCurrentCategory(null);
        }}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ marginBottom: '20px' }}>
            确定要删除类别 "{currentCategory?.name}" 吗？
          </p>
          <p style={{ color: '#ff4d4f', marginBottom: '30px' }}>
            注意：删除后，关联的策略将不再属于该类别，但不会被删除。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Button 
              onClick={() => {
                setIsDeleteConfirmVisible(false);
                setCurrentCategory(null);
              }}
            >
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

export default AdminCategories;