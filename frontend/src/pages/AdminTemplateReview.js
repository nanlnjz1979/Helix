import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Card, Radio, Form, message, Drawer, Alert, Divider } from 'antd';
import { SearchOutlined, EditOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import templateAPI from '../services/templateAPI';
import categoryAPI from '../services/categoryAPI';

const { TextArea } = Input;

const AdminTemplateReview = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [visible, setVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [reviewForm] = Form.useForm();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // 获取待审核的模板
  const fetchPendingTemplates = async () => {
    try {
      setLoading(true);
      const data = await templateAPI.getPendingTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('获取待审核模板失败:', error);
      message.error('获取待审核模板失败');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取模板分类
  const fetchTemplateCategories = async () => {
    try {
      const response = await categoryAPI.getCategoryTree();
      // 处理不同的数据格式
      let categoriesData = [];
      if (response && response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.categories)) {
          categoriesData = response.categories;
        } else if (Array.isArray(response.tree)) {
          categoriesData = response.tree;
        }
      }
      setCategories(categoriesData);
    } catch (error) {
      console.error('获取模板分类失败:', error);
      setCategories([]);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchPendingTemplates();
    fetchTemplateCategories();
  }, []);

  // 处理审核
  const handleReview = (template) => {
    setCurrentTemplate(template);
    reviewForm.resetFields();
    setTestResult(null);
    setVisible(true);
  };

  // 关闭审核抽屉
  const handleClose = () => {
    setVisible(false);
    setCurrentTemplate(null);
    setTestResult(null);
  };

  // 执行模板测试
  const runTemplateTest = async () => {
    if (!currentTemplate || !currentTemplate._id) {
      message.error('模板信息不完整');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const data = await templateAPI.testTemplateCode(currentTemplate._id, currentTemplate.code);
      setTestResult(data);
    } catch (error) {
      console.error('测试模板失败:', error);
      message.error('测试模板失败');
      // 不使用模拟数据作为后备
      setTestResult(null);
    } finally {
      setIsTesting(false);
    }
  };

  // 通过审核
  const approveTemplate = async () => {
    try {
      if (!currentTemplate || !currentTemplate._id) {
        message.error('模板信息不完整');
        return;
      }

      await templateAPI.reviewTemplate(currentTemplate._id, {
        status: 'approved'
      });
      
      message.success('模板审核通过');
      handleClose();
      fetchPendingTemplates(); // 刷新列表
    } catch (error) {
      console.error('审核失败:', error);
      message.error('审核失败');
    }
  };

  // 驳回审核
  const rejectTemplate = async () => {
    try {
      if (!currentTemplate || !currentTemplate._id) {
        message.error('模板信息不完整');
        return;
      }

      const values = await reviewForm.validateFields();
      
      await templateAPI.reviewTemplate(currentTemplate._id, {
        status: 'rejected',
        reason: values.rejectReason
      });
      
      message.success('模板已驳回');
      handleClose();
      fetchPendingTemplates(); // 刷新列表
    } catch (error) {
      console.error('驳回失败:', error);
      message.error('驳回失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '缩略图',
      dataIndex: 'coverImage',
      key: 'coverImage',
      width: 80,
      render: (coverImage) => (
        <img src={coverImage} alt="缩略图" style={{ width: 60, height: 40, objectFit: 'cover' }} />
      ),
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      filters: categories.map(cat => ({
        text: cat.name,
        value: cat.name
      })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      render: author => author?.username || '未知用户'
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source) => (
        <Tag color={source === 'official' ? 'blue' : 'green'}>
          {source === 'official' ? '官方发布' : '用户分享'}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (riskLevel) => {
        let color = 'green';
        if (riskLevel === 'medium') color = 'orange';
        if (riskLevel === 'high') color = 'red';
        
        let text = '低风险';
        if (riskLevel === 'medium') text = '中风险';
        if (riskLevel === 'high') text = '高风险';
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => date ? new Date(date).toLocaleString() : '',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleReview(record)}>
            审核
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>模板审核</h2>
        <Button type="link" onClick={() => navigate('/admin/templates')}>
          返回模板列表
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          loading={loading}
        />
      </Card>

      {/* 审核抽屉 */}
      <Drawer
        title="模板审核"
        width={800}
        placement="right"
        onClose={handleClose}
        open={visible}
        footer={null}
      >
        {currentTemplate && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
              <img 
                src={currentTemplate.coverImage} 
                alt="模板封面" 
                style={{ width: '150px', height: '100px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <h3>{currentTemplate.name}</h3>
                <p style={{ color: '#666', marginBottom: 8 }}>{currentTemplate.description}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Tag>{currentTemplate.category}</Tag>
                  <Tag color={currentTemplate.source === 'official' ? 'blue' : 'green'}>
                    {currentTemplate.source === 'official' ? '官方发布' : '用户分享'}
                  </Tag>
                  <Tag 
                    color={currentTemplate.riskLevel === 'high' ? 'red' : 
                           currentTemplate.riskLevel === 'medium' ? 'orange' : 'green'}
                  >
                    {currentTemplate.riskLevel === 'high' ? '高风险' : 
                     currentTemplate.riskLevel === 'medium' ? '中风险' : '低风险'}
                  </Tag>
                </div>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                  <div>作者: {currentTemplate.author?.username || '未知用户'}</div>
                  <div>创建时间: {currentTemplate.createdAt ? new Date(currentTemplate.createdAt).toLocaleString() : ''}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>详细说明</h4>
              <div style={{ 
                backgroundColor: '#fafafa', 
                padding: '12px', 
                borderRadius: '4px', 
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {currentTemplate.detailedDescription}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>策略代码</h4>
              <div style={{ 
                backgroundColor: '#fafafa', 
                padding: '12px', 
                borderRadius: '4px', 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '13px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {currentTemplate.code}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={runTemplateTest}
                disabled={isTesting}
                style={{ marginBottom: 8 }}
              >
                {isTesting ? '测试中...' : '运行测试'}
              </Button>
              
              {testResult && (
                <div style={{ marginTop: 16 }}>
                  <Alert 
                    message={testResult.success ? '测试通过' : '测试失败'} 
                    type={testResult.success ? 'success' : 'error'} 
                    showIcon 
                    style={{ marginBottom: 8 }}
                  />
                  
                  {testResult.errors && testResult.errors.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <h5 style={{ color: '#ff4d4f', marginBottom: 4 }}>错误:</h5>
                      <ul style={{ color: '#ff4d4f', margin: 0, paddingLeft: 20 }}>
                        {testResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {testResult.warnings && testResult.warnings.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <h5 style={{ color: '#faad14', marginBottom: 4 }}>警告:</h5>
                      <ul style={{ color: '#faad14', margin: 0, paddingLeft: 20 }}>
                        {testResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {testResult.backtestStats && (
                    <div>
                      <h5 style={{ color: '#1890ff', marginBottom: 4 }}>回测统计:</h5>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        <li>总收益率: {testResult.backtestStats.totalReturn}%</li>
                        <li>最大回撤: {testResult.backtestStats.maxDrawdown}%</li>
                        <li>夏普比率: {testResult.backtestStats.sharpeRatio}</li>
                        <li>执行时间: {testResult.executionTime}ms</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Divider />

            <Form form={reviewForm} layout="vertical">
              <Form.Item
                name="reviewAction"
                label="审核操作"
                rules={[{ required: true, message: '请选择审核操作' }]}
              >
                <Radio.Group>
                  <Radio value="approve">通过</Radio>
                  <Radio value="reject">驳回</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="rejectReason"
                label="驳回理由"
                rules={[
                  {
                    required: ({ getFieldValue }) => getFieldValue('reviewAction') === 'reject',
                    message: '请填写驳回理由'
                  }
                ]}
              >
                <TextArea rows={4} placeholder="请填写驳回理由" />
              </Form.Item>
            </Form>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button onClick={handleClose}>取消</Button>
              <Button 
                type="primary" 
                icon={<CloseOutlined />} 
                danger 
                onClick={rejectTemplate}
              >
                驳回
              </Button>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={approveTemplate}
              >
                通过
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AdminTemplateReview;