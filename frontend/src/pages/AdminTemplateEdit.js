import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Form, Input, Button, Upload, Select, InputNumber, Switch, Space, Card, Divider, Radio, message, TreeSelect } from 'antd';
import { InboxOutlined, CodeOutlined, SaveOutlined, SendOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import templateAPI from '../services/templateAPI';
import categoryAPI from '../services/categoryAPI';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;
const { TabPane } = Tabs;
const { TreeNode } = TreeSelect;

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
  // 获取当前登录用户ID，这里模拟从localStorage获取，实际项目中应从认证上下文或全局状态获取
  const getCurrentUser = () => {
    try {
      const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : { _id: 'admin' };
      return currentUser._id || currentUser.id || 'admin';
    } catch (error) {
      console.error('获取当前用户失败:', error);
      return 'admin';
    }
  };
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    coverImage: '',
    detailedDescription: '',
    category: null, // 使用category字段，与后端保持一致
    tags: [],
    riskLevel: 'medium',
    code: '',
    parameters: [],
    isPaid: false,
    price: 0,
    allowTrial: false,
    accessGroups: [],
    dependencies: [],
    versionLog: '',
    author: getCurrentUser() // 自动添加作者字段，使用当前登录用户
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
      
      // 保持树形结构，不再扁平化
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

  // 添加renderTreeNodes函数用于渲染树形结构
  const renderTreeNodes = (data) => {
    return data.map(item => {
      if (item.children && item.children.length > 0) {
        return (
          <TreeNode key={item.id || item._id} value={item.id || item._id} title={item.name}>
            {renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return <TreeNode key={item.id || item._id} value={item.id || item._id} title={item.name} />;
    });
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
        
        // 添加日志，查看从后端获取的模板数据
        console.log('从后端获取的模板数据:', template);
        
        // 确保关键属性正确初始化，添加日期字段的安全处理
        const safeTemplate = {
          ...template,
          tags: Array.isArray(template.tags) ? template.tags : [],
          dependencies: Array.isArray(template.dependencies) ? template.dependencies : [],
          accessGroups: Array.isArray(template.accessGroups) ? template.accessGroups : [],
          // 支持多种图片字段名
          coverImage: template.coverImage || template.thumbnail || '',
          // 处理category字段，确保能正确显示父类别
          category: template.category && template.category._id ? template.category._id : 
                    (typeof template.category === 'string' ? template.category : null),
          // 确保createdAt字段正确格式化，避免Invalid Date
          createdAt: template.createdAt ? new Date(template.createdAt).toISOString() : ''
        };
        setTemplateData(safeTemplate);
        
        // 处理表单值，确保所有字段正确映射
        const formValues = {
          ...safeTemplate,
          // 确保form中也包含author字段
          author: safeTemplate.author || getCurrentUser(),
          // 确保标签正确显示
          tags: safeTemplate.tags.join(', ')
        };
        form.setFieldsValue(formValues);
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
    // 检查是否有categories变化，如果有则同步更新category字段
    let updatedValues = { ...changedValues };
    if (changedValues.categories) {
      // 确保category字段是字符串格式的ObjectId
      if (typeof changedValues.categories === 'object') {
        // 如果是对象格式，尝试获取id属性
        updatedValues.category = changedValues.categories.id || changedValues.categories._id || String(changedValues.categories);
      } else if (Array.isArray(changedValues.categories) && changedValues.categories.length > 0) {
        // 如果是数组格式，取第一个元素并确保是字符串
        const firstCategory = changedValues.categories[0];
        updatedValues.category = typeof firstCategory === 'object' ? 
          (firstCategory.id || firstCategory._id || String(firstCategory)) : 
          String(firstCategory);
      } else {
        // 其他情况直接转为字符串
        updatedValues.category = String(changedValues.categories);
      }
    }
    
    // 确保在更新时保留author字段
    setTemplateData(prev => ({ 
      ...prev, 
      ...updatedValues,
      // 确保author字段始终存在
      author: prev.author || getCurrentUser()
    }));
    
    // 如果代码发生变化，重新解析参数
    if (changedValues.code) {
      parseParamsFromCode(changedValues.code);
    }
  };

  // 处理上传前的校验 - beforeUpload回调
  const beforeUpload = (file) => {
    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }
    // 检查文件大小
    const isLessThan2M = file.size / 1024 / 1024 < 2;
    if (!isLessThan2M) {
      message.error('图片必须小于2MB!');
      return Upload.LIST_IGNORE;
    }
    
    // 创建FileReader来读取文件内容，生成更稳定的Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      console.log('设置coverImage值:', dataUrl);
      // 同时更新状态和表单值，确保预览稳定显示
      setTemplateData(prev => ({ ...prev, coverImage: dataUrl }));
      form.setFieldValue('coverImage', dataUrl);
      
      // 强制更新表单验证状态
      form.validateFields(['coverImage']).catch(() => {
        // 忽略验证错误，我们只是想更新状态
        console.log('强制更新coverImage验证状态');
      });
    };
    reader.readAsDataURL(file);
    
    return false; // 阻止默认上传行为
  };
  
  // 自定义上传逻辑 - customRequest回调
  const customRequest = ({ onSuccess, file }) => {
    // 使用FileReader确保文件数据正确处理
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setTemplateData(prev => ({ ...prev, coverImage: dataUrl }));
      form.setFieldValue('coverImage', dataUrl);
      
      if (onSuccess) {
        onSuccess('ok');
      }
    };
    reader.readAsDataURL(file);
  };

  // 处理标签变化
  const handleTagsChange = (tags) => {
    console.log('更新标签为:', tags);
    setTemplateData(prev => ({ ...prev, tags }));
  };

  // 在模板详情加载时使用日期格式化
  const safeCreatedAt = templateData.createdAt ? new Date(templateData.createdAt).toLocaleString() : '';

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
      
      // 在验证前检查关键字段的值
      console.log('验证前的模板数据:', templateData);
      console.log('表单当前值:', form.getFieldsValue(['name', 'description', 'coverImage', 'detailedDescription', 'category','author']));
      
      // 增强表单验证错误处理
      const validateResult = await form.validateFields().catch(err => {
        console.error('表单验证失败:', err);
        
        // 检查是否有具体的错误字段
        if (err.errorFields && err.errorFields.length > 0) {
          const firstError = err.errorFields[0];
          const fieldName = firstError.name.join('.');
          const errorMsg = firstError.errors && firstError.errors[0] ? firstError.errors[0] : '该字段验证失败';
          
          // 映射字段名到中文显示名
          const fieldMap = {
            'name': '模板名称',
            'description': '模板描述',
            'category': '所属分类',
            'code': '模板代码',
            'author': '作者',
            'version': '版本号'
          };
          
          // 显示具体的错误信息
          const displayName = fieldMap[fieldName] || fieldName;
          message.error(`${displayName}：${errorMsg}`);
        } else {
          message.error('表单验证失败，请检查所有必填项');
        }
        throw err;
      });
      
      const values = { ...validateResult };
      
      console.log('准备保存的草稿数据:', values);
      // 包含coverImage字段，后端已经可以处理
      const draftData = {
        ...values,
        status: 'draft',
        author: values.author || getCurrentUser() // 添加author字段
      };
      
      console.log('提交给API的数据:', draftData);
      
      if (isEditMode) {
        try {
          await templateAPI.updateTemplate(templateId, draftData);
        } catch (error) {
          console.error('更新模板API调用失败:', error.response || error);
        }
      } else {
        try {
          await templateAPI.createTemplate(draftData);
        } catch (error) {
          console.error('创建模板API调用失败:', error.response || error);
        }
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
      
      // 在验证前检查关键字段的值
      console.log('验证前的模板数据:', templateData);
      console.log('表单当前值:', form.getFieldsValue(['name', 'description', 'coverImage', 'detailedDescription', 'category','author']));
      
      // 增强表单验证错误处理
      const validateResult = await form.validateFields().catch(err => {
        console.error('表单验证失败:', err);
        
        // 检查是否有具体的错误字段
        if (err.errorFields && err.errorFields.length > 0) {
          const firstError = err.errorFields[0];
          const fieldName = firstError.name.join('.');
          const errorMsg = firstError.errors && firstError.errors[0] ? firstError.errors[0] : '该字段验证失败';
          
          // 映射字段名到中文显示名
          const fieldMap = {
            'name': '模板名称',
            'description': '模板描述',
            'category': '所属分类',
            'code': '模板代码',
            'author': '作者',
            'version': '版本号'
          };
          
          // 显示具体的错误信息
          const displayName = fieldMap[fieldName] || fieldName;
          message.error(`${displayName}：${errorMsg}`);
        } else {
          message.error('表单验证失败，请检查所有必填项');
        }
        throw err;
      });
      
      const values = { ...validateResult };
      
      // 包含coverImage字段，后端已经可以处理
      // 关键点：确保category是字符串格式的ObjectId
      const reviewData = {
        ...values,
        // 确保category是字符串格式，适合MongoDB ObjectId
        category: typeof values.category === 'string' ? values.category : 
                  (typeof values.category === 'object' ? 
                    (values.category.id || values.category._id || String(values.category)) : 
                    String(values.category || '')),
        status: 'reviewing',
        author: values.author || getCurrentUser() // 添加author字段
      };
      
      console.log('提交给API的数据:', reviewData);
      
      if (isEditMode) {
        try {
          await templateAPI.updateTemplate(templateId, reviewData);
        } catch (error) {
          console.error('更新模板API调用失败:', error.response || error);
          // 如果第一次失败，尝试使用更简化的数据结构
          const simplifiedData = {
            name: reviewData.name,
            description: reviewData.description,
            coverImage: reviewData.coverImage, // 包含coverImage字段
            category: reviewData.category, // 包含category字段
            code: reviewData.code || '', // 包含code字段，这是必填项
            status: 'reviewing',
            author: reviewData.author || getCurrentUser() // 添加author字段
          };
          console.log('尝试使用简化数据再次提交:', simplifiedData);
          await templateAPI.updateTemplate(templateId, simplifiedData);
        }
      } else {
        try {
          await templateAPI.createTemplate(reviewData);
        } catch (error) {
          console.error('创建模板API调用失败:', error.response || error);
          // 为创建新模板也添加简化数据的回退逻辑
          const simplifiedData = {
            name: reviewData.name,
            description: reviewData.description,
            category: reviewData.category, // 包含category字段
            code: reviewData.code || '', // 包含code字段，这是必填项
            coverImage: reviewData.coverImage,
            status: 'reviewing',
            author: reviewData.author || getCurrentUser() // 添加author字段
          };
          console.log('尝试使用简化数据再次提交:', simplifiedData);
          await templateAPI.createTemplate(simplifiedData);
        }
      }
      
      message.success('模板已提交审核');
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
      
      // 在验证前检查关键字段的值
      console.log('验证前的模板数据:', templateData);
      console.log('表单当前值:', form.getFieldsValue(['name', 'description', 'coverImage', 'detailedDescription', 'category','author']));
      
      // 增强表单验证错误处理
      const validateResult = await form.validateFields().catch(err => {
        console.error('表单验证失败:', err);
        
        // 检查是否有具体的错误字段
        if (err.errorFields && err.errorFields.length > 0) {
          const firstError = err.errorFields[0];
          const fieldName = firstError.name.join('.');
          const errorMsg = firstError.errors && firstError.errors[0] ? firstError.errors[0] : '该字段验证失败';
          
          // 映射字段名到中文显示名
          const fieldMap = {
            'name': '模板名称',
            'description': '模板描述',
            'category': '所属分类',
            'code': '模板代码',
            'author': '作者',
            'version': '版本号'
          };
          
          // 显示具体的错误信息
          const displayName = fieldMap[fieldName] || fieldName;
          message.error(`${displayName}：${errorMsg}`);
        } else {
          message.error('表单验证失败，请检查所有必填项');
        }
        throw err;
      });
      
      const values = { ...validateResult };
      
      // 包含coverImage字段，后端已经可以处理
      // 关键点：确保category是字符串格式的ObjectId
      const publishData = {
        ...values,
        // 确保category是字符串格式，适合MongoDB ObjectId
        category: typeof values.category === 'string' ? values.category : 
                  (typeof values.category === 'object' ? 
                    (values.category.id || values.category._id || String(values.category)) : 
                    String(values.category || '')),
        status: 'published',
        author: values.author || getCurrentUser() // 添加author字段，使用用户ID
      };
      
      console.log('提交给API的数据:', publishData);
      
      if (isEditMode) {
        try {
          await templateAPI.updateTemplate(templateId, publishData);
        } catch (error) {
          console.error('更新模板API调用失败:', error.response || error);
          // 如果第一次失败，尝试使用更简化的数据结构
          const simplifiedData = {
            name: publishData.name,
            description: publishData.description,
            coverImage: publishData.coverImage, // 包含coverImage字段
            category: publishData.category, // 包含category字段
            code: publishData.code || '', // 包含code字段，这是必填项
            status: 'published',
            author: publishData.author || getCurrentUser() // 添加author字段
          };
          console.log('尝试使用简化数据再次提交:', simplifiedData);
          await templateAPI.updateTemplate(templateId, simplifiedData);
        }
      } else {
        try {
          await templateAPI.createTemplate(publishData);
        } catch (error) {
          console.error('创建模板API调用失败:', error.response || error);
          // 为创建新模板也添加简化数据的回退逻辑
          const simplifiedData = {
            name: publishData.name,
            description: publishData.description,
            category: publishData.category, // 包含category字段
            code: publishData.code || '', // 包含code字段，这是必填项
            coverImage: publishData.coverImage,
            status: 'published',
            author: publishData.author || getCurrentUser() // 添加author字段
          };
          console.log('尝试使用简化数据再次提交:', simplifiedData);
          await templateAPI.createTemplate(simplifiedData);
        }
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
                
                {/* 显示创建时间 */}
                {isEditMode && (
                  <Form.Item label="创建时间">
                    <div>{safeCreatedAt || '-'}</div>
                  </Form.Item>
                )}

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
                  customRequest={customRequest}
                  showUploadList={false}
                  beforeUpload={beforeUpload}
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
                name="category"
                label="所属分类"
                rules={[{ required: true, message: '请选择所属分类' }]}
              >
                <TreeSelect 
                  placeholder="请选择所属分类"
                  allowClear
                  treeDefaultExpandAll
                  notFoundContent={allCategories.length === 0 ? '暂无分类数据' : '无匹配分类'}
                  style={{ width: '100%' }}
                >
                  {renderTreeNodes(allCategories)}
                </TreeSelect>
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
                getValueFromEvent={(e) => {
                  // 从输入框中提取标签
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                  handleTagsChange(tags);
                  return tags.join(', ');
                }}
                getValueProps={(value) => ({
                  value: Array.isArray(value) ? value.join(', ') : value
                })}
              >
                <Input 
                  placeholder="输入标签后按回车确认"
                  onPressEnter={(e) => {
                    // 处理回车事件，添加标签
                    const currentValue = e.target.value;
                    const tags = currentValue.split(',').map(tag => tag.trim()).filter(tag => tag);
                    handleTagsChange(tags);
                    // 不重置输入框，让用户可以继续添加
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