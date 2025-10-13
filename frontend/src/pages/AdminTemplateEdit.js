import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Form, Input, Button, Upload, Select, InputNumber, Switch, Space, Card, Divider, Radio, message } from 'antd';
import { InboxOutlined, CodeOutlined, SaveOutlined, SendOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import templateAPI from '../services/templateAPI';
import categoryAPI from '../services/categoryAPI';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;
const { TabPane } = Tabs;

// 模拟代码编辑器组件
const MonacoEditor = ({ value, onChange }) => {
  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', minHeight: '400px', backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: '12px', fontSize: '14px', backgroundColor: '#e6f7ff', borderBottom: '1px solid #d9d9d9' }}>
        <CodeOutlined /> 策略代码编辑器 (Monaco Editor)
      </div>
      <TextArea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ minHeight: '350px', border: 0, resize: 'vertical' }}
        placeholder="在此输入策略代码..."
        fontSize={14}
      />
    </div>
  );
};

const AdminTemplateEdit = () => {
  const navigate = useNavigate();
  const params = useParams();
  const templateId = params.id;
  // 定义isEditMode，检查templateId是否存在且不为空字符串
  const isEditMode = templateId && typeof templateId === 'string' && templateId.trim() !== '';
  const [activeTab, setActiveTab] = useState('1');
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    coverImage: '',
    detailedDescription: '',
    categories: [],
    tags: [],
    riskLevel: 'medium',
    code: '',
    parameters: [],
    isPaid: false,
    price: 0,
    allowTrial: false,
    accessGroups: [],
    dependencies: [],
    versionLog: ''
  });
  const [allCategories, setAllCategories] = useState([]);
  const [allAccessGroups, setAllAccessGroups] = useState([]);
  const [parsedParams, setParsedParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 获取模板分类
  const fetchCategories = async () => {
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
      setAllCategories(categoriesData);
    } catch (error) {
      console.error('获取模板分类失败:', error);
      message.error('获取模板分类失败');
    }
  };

  // 获取访问权限组
  const fetchAccessGroups = async () => {
    try {
      // 实际项目中应该调用获取访问权限组的API
      // 这里暂时使用模拟数据，但不使用默认数据作为后备
      const mockGroups = [
        { id: '1', name: '普通用户' },
        { id: '2', name: 'VIP用户' },
        { id: '3', name: '高级用户' },
        { id: '4', name: '专业用户' },
      ];
      setAllAccessGroups(mockGroups);
    } catch (error) {
      console.error('获取访问权限组失败:', error);
      message.error('获取访问权限组失败');
    }
  };

  // 获取模板详情 - 使用useCallback缓存函数
  const fetchTemplateDetail = useCallback(async () => {
    // 直接使用isEditMode判断
    if (isEditMode) {
      try {
        setLoading(true);
        const response = await templateAPI.getTemplateDetail(templateId);
        // 处理不同的数据格式，确保能正确获取模板数据
        const template = response.template || response; // 如果response中没有template属性，直接使用response
        // 确保关键数组属性存在且为数组，防止后续join操作出错
        const safeTemplate = {
          ...template,
          tags: Array.isArray(template.tags) ? template.tags : [],
          dependencies: Array.isArray(template.dependencies) ? template.dependencies : [],
          categories: Array.isArray(template.categories) ? template.categories : [],
          accessGroups: Array.isArray(template.accessGroups) ? template.accessGroups : []
        };
        setTemplateData(safeTemplate);
        form.setFieldsValue(safeTemplate);
        // 解析参数
        if (safeTemplate.code) {
          parseParamsFromCode(safeTemplate.code);
        }
      } catch (error) {
        console.error('获取模板详情失败:', error);
        message.error('获取模板详情失败');
      } finally {
        setLoading(false);
      }
    } else {
      console.warn('无效的templateId，无法获取模板详情');
    }
  }, [isEditMode, templateId, form]);

  // 从代码中解析参数
  const parseParamsFromCode = (code) => {
    // 这是一个简化的解析器，实际项目中需要更复杂的解析逻辑
    const params = [];
    const paramClassRegex = /class\s+StrategyParams[\s\S]*?def\s+__init__\(self\):([\s\S]*?)class|$/;
    const match = code.match(paramClassRegex);
    
    if (match && match[1]) {
      const paramLines = match[1].split('\n');
      paramLines.forEach(line => {
        const paramRegex = /self\.(\w+)\s*=\s*([^#]+)\s*#\s*(.+)/;
        const paramMatch = line.match(paramRegex);
        if (paramMatch) {
          const [, name, value, description] = paramMatch;
          try {
            // 安全地解析值，避免使用eval
            let parsedValue;
            if (value.trim() === 'true') parsedValue = true;
            else if (value.trim() === 'false') parsedValue = false;
            else if (!isNaN(value.trim())) parsedValue = Number(value.trim());
            else parsedValue = value.trim().replace(/'/g, '');
            
            params.push({
              name,
              value: parsedValue,
              description,
              type: typeof parsedValue,
              controlType: 'number' // 默认控件类型
            });
          } catch (e) {
            console.error(`解析参数 ${name} 失败:`, e);
          }
        }
      });
    }
    
    setParsedParams(params);
  };

  // 初始化数据
  useEffect(() => {
    fetchCategories();
    fetchAccessGroups();
    if (isEditMode) { // 只有在编辑模式下才获取模板详情
      fetchTemplateDetail();
    }
  }, [isEditMode, fetchTemplateDetail]);

  // 处理表单字段变化
  const handleFormChange = (changedValues) => {
    setTemplateData(prev => ({ ...prev, ...changedValues }));
    
    // 如果代码发生变化，重新解析参数
    if (changedValues.code) {
      parseParamsFromCode(changedValues.code);
    }
  };

  // 处理上传封面图
  const handleUpload = ({ file }) => {
    // 实际项目中需要上传到服务器
    // 这里使用URL.createObjectURL处理本地预览
    setTemplateData(prev => ({ ...prev, coverImage: URL.createObjectURL(file.originFileObj) }));
    return false; // 阻止默认上传行为
  };

  // 处理标签变化
  const handleTagsChange = (tags) => {
    setTemplateData(prev => ({ ...prev, tags }));
  };

  // 处理依赖项变化
  const handleDependenciesChange = (e) => {
    const dependencies = e.target.value.split('\n').filter(line => line.trim());
    setTemplateData(prev => ({ ...prev, dependencies }));
  };

  // 处理控件类型变化
  const handleControlTypeChange = (index, type) => {
    const newParsedParams = [...parsedParams];
    newParsedParams[index].controlType = type;
    setParsedParams(newParsedParams);
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const draftData = { ...values, status: 'draft' };
      
      if (isEditMode) {
        await templateAPI.updateTemplate(templateId, draftData);
      } else {
        await templateAPI.createTemplate(draftData);
      }
      
      message.success('草稿保存成功');
      navigate('/admin/templates');
    } catch (error) {
      console.error('保存草稿失败:', error);
      message.error('保存草稿失败');
    } finally {
      setLoading(false);
    }
  };

  // 提交审核
  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const reviewData = { ...values, status: 'reviewing' };
      
      if (isEditMode) {
        await templateAPI.updateTemplate(templateId, reviewData);
      } else {
        await templateAPI.createTemplate(reviewData);
      }
      
      message.success('已提交审核，请等待管理员审核');
      navigate('/admin/templates');
    } catch (error) {
      console.error('提交审核失败:', error);
      message.error('提交审核失败');
    } finally {
      setLoading(false);
    }
  };

  // 立即发布
  const handlePublish = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const publishData = { ...values, status: 'published' };
      
      if (isEditMode) {
        await templateAPI.updateTemplate(templateId, publishData);
      } else {
        await templateAPI.createTemplate(publishData);
      }
      
      message.success('模板发布成功');
      navigate('/admin/templates');
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>{isEditMode ? '编辑模板' : '创建新模板'}</h2>
        <Button type="link" onClick={() => navigate('/admin/templates')}>
          返回模板列表
        </Button>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          initialValues={templateData}
          loading={!!loading}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* 基础信息标签页 */}
            <TabPane tab="基础信息" key="1">
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="请输入模板名称" />
              </Form.Item>

              <Form.Item
                name="description"
                label="简介"
                rules={[{ required: true, message: '请输入模板简介' }]}
              >
                <Input placeholder="请输入模板简介（一两句话）" />
              </Form.Item>

              <Form.Item
                name="coverImage"
                label="封面图"
                rules={[{ required: true, message: '请上传封面图' }]}
              >
                <Dragger
                  customRequest={handleUpload}
                  showUploadList={false}
                  beforeUpload={handleUpload}
                  fileList={templateData.coverImage ? [{ uid: 'cover', url: templateData.coverImage }] : []}
                >
                  {templateData.coverImage ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={templateData.coverImage} alt="封面图" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      <Button type="link" onClick={() => setTemplateData(prev => ({ ...prev, coverImage: '' }))}>
                        更换图片
                      </Button>
                    </div>
                  ) : (
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                  )}
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 JPG, PNG 格式，建议尺寸 300x200
                  </p>
                </Dragger>
              </Form.Item>

              <Form.Item
                name="detailedDescription"
                label="详细描述"
                rules={[{ required: true, message: '请输入详细描述' }]}
              >
                <TextArea 
                  placeholder="请输入详细描述（支持Markdown语法）" 
                  rows={10}
                />
              </Form.Item>

              <Form.Item
                name="categories"
                label="所属分类"
                rules={[{ required: true, message: '请选择所属分类' }]}
              >
                <Select mode="multiple" placeholder="请选择所属分类">
                  {allCategories.map(category => (
                    <Option key={category.id} value={category.id || ''}>{category.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
              >
                <Input 
                  placeholder="输入标签后按回车确认"
                  value={templateData.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    handleTagsChange(tags);
                  }}
                />
              </Form.Item>

              <Form.Item
                name="riskLevel"
                label="风险等级"
                rules={[{ required: true, message: '请选择风险等级' }]}
              >
                <Radio.Group>
                  <Radio.Button value="low">低风险</Radio.Button>
                  <Radio.Button value="medium">中风险</Radio.Button>
                  <Radio.Button value="high">高风险</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </TabPane>

            {/* 策略代码与参数标签页 */}
            <TabPane tab="策略代码与参数" key="2">
              <div style={{ marginBottom: 16 }}>
                <p style={{ marginBottom: 8, color: '#888' }}>
                  请在下方编写策略代码，系统会自动解析StrategyParams类中的参数
                </p>
              </div>
              
              <Form.Item
                name="code"
                label="策略代码"
                rules={[{ required: true, message: '请输入策略代码' }]}
              >
                <MonacoEditor 
                  value={templateData.code}
                  onChange={(value) => form.setFieldsValue({ code: value })}
                />
              </Form.Item>

              <Card title="已解析参数" style={{ marginTop: 16 }}>
                {parsedParams.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {parsedParams.map((param, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: '150px', fontWeight: 'bold' }}>{param.name}</div>
                        <div style={{ width: '200px' }}>{param.description}</div>
                        <div style={{ width: '100px' }}>{typeof param.value}</div>
                        <div style={{ width: '100px' }}>{param.value}</div>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <p style={{ color: '#888', textAlign: 'center' }}>未解析到参数，请检查StrategyParams类的定义</p>
                )}
              </Card>
            </TabPane>

            {/* 参数配置UI标签页 */}
            <TabPane tab="参数配置UI" key="3">
              <div style={{ marginBottom: 16 }}>
                <p style={{ marginBottom: 8, color: '#888' }}>
                  自定义每个参数在前端显示的控件类型
                </p>
              </div>
              
              <Card>
                {parsedParams.length > 0 ? (
                  <Form layout="vertical">
                    {parsedParams.map((param, index) => (
                      <Form.Item
                        key={index}
                        label={param.name}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: '200px' }}>{param.description}</div>
                          <div style={{ width: '100px' }}>{typeof param.value}</div>
                          <div style={{ width: '100px' }}>{param.value}</div>
                          <Select
                            style={{ width: '150px' }}
                            value={param.controlType}
                            onChange={(value) => handleControlTypeChange(index, value)}
                          >
                            <Option key="number" value="number">数字输入框</Option>
                            <Option key="slider" value="slider">滑块</Option>
                            <Option key="switch" value="switch">开关</Option>
                            <Option key="select" value="select">下拉选择</Option>
                            <Option key="checkbox" value="checkbox">复选框</Option>
                          </Select>
                        </div>
                      </Form.Item>
                    ))}
                  </Form>
                ) : (
                  <p style={{ color: '#888', textAlign: 'center' }}>未解析到参数，请先在代码中定义StrategyParams类</p>
                )}
              </Card>
            </TabPane>

            {/* 元数据与设置标签页 */}
            <TabPane tab="元数据与设置" key="4">
              <Form.Item
                name="isPaid"
                label="定价设置"
                valuePropName="checked"
              >
                <Switch checkedChildren="付费" unCheckedChildren="免费" />
              </Form.Item>

              {templateData.isPaid && (
                <Form.Item
                  name="price"
                  label="价格"
                  rules={[{ required: true, message: '请输入价格' }]}
                >
                  <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
                </Form.Item>
              )}

              {templateData.isPaid && (
                <Form.Item
                  name="allowTrial"
                  label="允许试用"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              )}

              <Form.Item
                name="accessGroups"
                label="权限设置"
                rules={[{ required: true, message: '请选择访问权限组' }]}
              >
                <Select mode="multiple" placeholder="请选择哪些用户组可以访问此模板">
                  {allAccessGroups.map(group => (
                    <Option key={group.id} value={group.id || ''}>{group.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="dependencies"
                label="依赖管理"
              >
                <TextArea
                  placeholder="指定此模板运行所需的三方库及其版本，一行一个"
                  rows={4}
                  value={templateData.dependencies.join('\n')}
                  onChange={handleDependenciesChange}
                />
              </Form.Item>

              <Form.Item
                name="versionLog"
                label="版本日志"
              >
                <TextArea placeholder="请输入本次更新的内容" rows={3} />
              </Form.Item>
            </TabPane>

            {/* 预览与发布标签页 */}
            <TabPane tab="预览与发布" key="5">
              <Card title="模板预览" style={{ marginBottom: 16 }}>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '16px', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    {templateData.coverImage && (
                      <img 
                        src={templateData.coverImage} 
                        alt="模板封面" 
                        style={{ width: '150px', height: '100px', objectFit: 'cover' }}
                      />
                    )}
                    <div>
                      <h3>{templateData.name || '模板名称'}</h3>
                      <p>{templateData.description || '模板简介'}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {templateData.tags.map((tag, index) => (
                          <span key={`${tag}-${index}`} style={{
                            backgroundColor: '#e6f7ff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <div style={{ marginBottom: 16 }}>
                    <h4>详细说明</h4>
                    <div style={{ color: '#666', whiteSpace: 'pre-wrap' }}>
                      {templateData.detailedDescription || '暂无详细说明'}
                    </div>
                  </div>
                </div>
              </Card>

              <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
                <Button onClick={handleSaveDraft} icon={<SaveOutlined />} loading={!!loading}>
                  保存草稿
                </Button>
                <Button type="primary" onClick={handleSubmitReview} icon={<SendOutlined />} loading={!!loading}>
                  提交审核
                </Button>
                <Button type="primary" danger onClick={handlePublish} icon={<EditOutlined />} loading={!!loading}>
                  立即发布
                </Button>
              </div>
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </div>
  );
};

export default AdminTemplateEdit;