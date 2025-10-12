import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, Select, Card, Row, Col, Modal, message } from 'antd';
import { SearchOutlined, EditOutlined, EyeOutlined, LockOutlined, UnlockOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import templateAPI from '../services/templateAPI';

const { Option } = Select;
const { Search } = Input;

const AdminTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [templateStats, setTemplateStats] = useState({
    total: 0,
    published: 0,
    reviewing: 0,
    draft: 0
  });

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateAPI.getTemplates({
        page: 1,
        pageSize: 1000, // 获取所有模板
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        search: searchText
      });
      setTemplates(response.templates || []);
      filterTemplates(response.templates || []);
      updateTemplateStats(response.templates || []);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      message.error('获取模板列表失败');
      setTemplates([]);
      setFilteredTemplates([]);
      setTemplateStats({
        total: 0,
        published: 0,
        reviewing: 0,
        draft: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取模板分类
  const fetchCategories = async () => {
    try {
      const response = await templateAPI.getTemplateCategories();
      
      // 增强数据处理逻辑，处理多种可能的数据格式
      let categoriesData = [];
      if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && typeof response === 'object') {
        // 检查常见的数据嵌套格式
        if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (Array.isArray(response.categories)) {
          categoriesData = response.categories;
        } else {
          console.warn('响应数据不是数组，也不包含可识别的数组属性');
        }
      }
      
      console.log('处理后的模板分类数据:', categoriesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('获取模板分类失败:', error);
      message.error('获取模板分类失败：' + (error.response?.data?.message || error.message));
      setCategories([]);
    }
  };

  // 更新模板统计信息
  const updateTemplateStats = (templateList) => {
    const stats = {
      total: templateList.length,
      published: templateList.filter(t => t.status === 'published').length,
      reviewing: templateList.filter(t => t.status === 'reviewing').length,
      draft: templateList.filter(t => t.status === 'draft').length
    };
    setTemplateStats(stats);
  };

  // 过滤模板
  const filterTemplates = (templateList) => {
    let result = [...templateList];
    
    // 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(template => template.status === statusFilter);
    }
    
    // 分类过滤
    if (categoryFilter !== 'all') {
      result = result.filter(template => 
        template.categories && template.categories.includes(categoryFilter)
      );
    }
    
    // 搜索过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(template => 
        (template.name && template.name.toLowerCase().includes(searchLower)) ||
        (template.description && template.description.toLowerCase().includes(searchLower)) ||
        (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    setFilteredTemplates(result);
  };

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
    filterTemplates(templates);
  };

  // 处理状态筛选
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    filterTemplates(templates);
  };

  // 处理分类筛选
  const handleCategoryFilterChange = (value) => {
    setCategoryFilter(value);
    filterTemplates(templates);
  };

  // 处理编辑模板
  const handleEditTemplate = (templateId) => {
    navigate(`/admin/templates/edit/${templateId}`);
  };

  // 处理预览模板
  const handlePreviewTemplate = (templateId) => {
    navigate(`/admin/templates/preview/${templateId}`);
  };

  // 处理切换模板状态
  const handleToggleStatus = async (templateId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await templateAPI.toggleTemplateStatus(templateId, newStatus);
      message.success('模板状态已更新');
      fetchTemplates(); // 重新获取模板列表
    } catch (error) {
      console.error('切换模板状态失败:', error);
      message.error('切换模板状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理克隆模板
  const handleCloneTemplate = async (templateId) => {
    try {
      setLoading(true);
      await templateAPI.cloneTemplate(templateId);
      message.success('模板克隆成功');
      fetchTemplates(); // 重新获取模板列表
    } catch (error) {
      console.error('克隆模板失败:', error);
      message.error('克隆模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除模板
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      setLoading(true);
      await templateAPI.deleteTemplate(templateToDelete);
      message.success('模板已删除');
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
      fetchTemplates(); // 重新获取模板列表
    } catch (error) {
      console.error('删除模板失败:', error);
      message.error('删除模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开删除确认模态框
  const showDeleteModal = (templateId) => {
    setTemplateToDelete(templateId);
    setDeleteModalVisible(true);
  };

  // 表格列配置
  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: '分类',
      dataIndex: 'categories',
      key: 'categories',
      render: (templateCategories) => {
        if (!templateCategories || templateCategories.length === 0) return '-';
        return templateCategories.map(categoryId => {
          const category = categories.find(c => c.id === categoryId || c._id === categoryId);
          return category ? (
            <Tag key={categoryId} color="blue">{category.name}</Tag>
          ) : (
            <Tag key={categoryId} color="default">{categoryId}</Tag>
          );
        });
      }
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      sorter: (a, b) => parseFloat(a.version || '0') - parseFloat(b.version || '0')
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (riskLevel) => {
        const colorMap = {
          low: 'green',
          medium: 'orange',
          high: 'red'
        };
        const textMap = {
          low: '低风险',
          medium: '中风险',
          high: '高风险'
        };
        return (
          <Tag color={colorMap[riskLevel] || 'default'}>
            {textMap[riskLevel] || riskLevel}
          </Tag>
        );
      },
      filters: [
        { text: '低风险', value: 'low' },
        { text: '中风险', value: 'medium' },
        { text: '高风险', value: 'high' }
      ],
      onFilter: (value, record) => record.riskLevel === value
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => {
        return price > 0 ? `¥${price}` : '免费';
      },
      sorter: (a, b) => (a.price || 0) - (b.price || 0)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          draft: 'default',
          reviewing: 'orange',
          published: 'green',
          rejected: 'red'
        };
        const textMap = {
          draft: '草稿',
          reviewing: '审核中',
          published: '已发布',
          rejected: '已驳回'
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {textMap[status] || status}
          </Tag>
        );
      },
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '审核中', value: 'reviewing' },
        { text: '已发布', value: 'published' },
        { text: '已驳回', value: 'rejected' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditTemplate(record.id)} 
            size="small"
          >
            编辑
          </Button>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handlePreviewTemplate(record.id)} 
            size="small"
          >
            预览
          </Button>
          {record.status === 'published' ? (
            <Button 
              type="text" 
              icon={<LockOutlined />} 
              onClick={() => handleToggleStatus(record.id, 'published')} 
              size="small"
              danger
            >
              下架
            </Button>
          ) : (
            <Button 
              type="text" 
              icon={<UnlockOutlined />} 
              onClick={() => handleToggleStatus(record.id, record.status)} 
              size="small"
              disabled={record.status !== 'draft'}
            >
              发布
            </Button>
          )}
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            onClick={() => handleCloneTemplate(record.id)} 
            size="small"
          >
            克隆
          </Button>
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            onClick={() => showDeleteModal(record.id)} 
            size="small"
            danger
          >
            删除
          </Button>
        </Space>
      ),
      fixed: 'right',
      width: 280
    },
  ];

  // 初始化数据
  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>策略模板管理</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/admin/templates/edit')}
          style={{ marginTop: 8 }}
        >
          创建新模板
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={24} md={12} lg={6} xl={6}>
          <Card bordered={false}>
            <div className="dashboard-card-content">
              <p className="dashboard-card-title">模板总数</p>
              <p className="dashboard-card-value">{templateStats.total}</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12} lg={6} xl={6}>
          <Card bordered={false}>
            <div className="dashboard-card-content">
              <p className="dashboard-card-title">已发布</p>
              <p className="dashboard-card-value">{templateStats.published}</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12} lg={6} xl={6}>
          <Card bordered={false}>
            <div className="dashboard-card-content">
              <p className="dashboard-card-title">审核中</p>
              <p className="dashboard-card-value">{templateStats.reviewing}</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12} lg={6} xl={6}>
          <Card bordered={false}>
            <div className="dashboard-card-content">
              <p className="dashboard-card-title">草稿</p>
              <p className="dashboard-card-value">{templateStats.draft}</p>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="搜索模板名称、描述或标签"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 150 }}
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">草稿</Option>
              <Option value="reviewing">审核中</Option>
              <Option value="published">已发布</Option>
              <Option value="rejected">已驳回</Option>
            </Select>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 150 }}
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
            >
              <Option value="all">全部分类</Option>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTemplates}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          loading={loading}
        />
      </Card>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDeleteTemplate}
        onCancel={() => {
          setDeleteModalVisible(false);
          setTemplateToDelete(null);
        }}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
      >
        <p>确定要删除此模板吗？此操作不可撤销。</p>
      </Modal>
    </div>
  );
};

export default AdminTemplates;