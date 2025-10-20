import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Card, message, TreeSelect } from 'antd';
import { CodeOutlined, SaveOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import categoryAPI from '../services/categoryAPI';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { TreeNode } = TreeSelect;

// 轻量代码编辑器占位（与创建页一致）
const MonacoEditor = ({ value, onChange }) => {
  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, minHeight: 400, backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: 12, fontSize: 14, backgroundColor: '#e6f7ff', borderBottom: '1px solid #d9d9d9' }}>
        <CodeOutlined /> 策略代码编辑器 (Monaco Editor)
      </div>
      <TextArea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ minHeight: 350, border: 0, resize: 'vertical' }}
        placeholder="在此输入策略代码..."
      />
    </div>
  );
};

const StrategyEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('basic');
  const [form] = Form.useForm();
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 现有策略
  const [existingStrategy, setExistingStrategy] = useState(null);

  // 类别树相关状态（与创建页一致）
  const [allCategories, setAllCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedRootType, setSelectedRootType] = useState('');

  // 加载类别树（用于策略类型树形显示）
  useEffect(() => {
    const loadTree = async () => {
      setLoadingCategories(true);
      try {
        const res = await categoryAPI.getCategoryTree();
        let categoriesData = [];
        if (res && Array.isArray(res)) categoriesData = res;
        else if (res && Array.isArray(res.data)) categoriesData = res.data;
        else if (res && Array.isArray(res.tree)) categoriesData = res.tree;
        else if (res && Array.isArray(res.categories)) categoriesData = res.categories;
        setAllCategories(categoriesData);
      } catch (e) {
        console.error('获取类别树失败:', e);
        message.error('获取策略类型（类别树）失败');
      } finally {
        setLoadingCategories(false);
      }
    };
    loadTree();
  }, []);

  // 加载现有策略数据
  useEffect(() => {
    const loadStrategy = async () => {
      try {
        const res = await api.get(`/strategies/${id}`);
        const s = res?.data;
        if (!s || !s._id) {
          throw new Error('未找到策略或无权限');
        }
        setExistingStrategy(s);
        // 预填表单
        form.setFieldsValue({
          name: s.name,
          description: s.description,
          categoryId: s.type || null, // 无直接类别关联，保持为空
        });
        setCode(s.code || '');
        setSelectedRootType(s.type || '');
      } catch (e) {
        console.error('加载策略失败:', e);
        const msg = e?.response?.data?.message || e?.message || '未知错误';
        message.error('加载策略失败：' + msg);
      } finally {
        setLoading(false);
      }
    };
    loadStrategy();
  }, [id]);

  const findNodeAndRoot = (nodes, targetId, rootName = null) => {
    for (const node of nodes) {
      const currentRoot = rootName || node.name;
      if ((node.id || node._id) === targetId) {
        return { node, rootName: rootName || node.name };
      }
      if (node.children && node.children.length > 0) {
        const result = findNodeAndRoot(node.children, targetId, currentRoot);
        if (result) return result;
      }
    }
    return null;
  };

  const renderTreeNodes = (data) => (
    data.map(item => (
      <TreeNode value={item._id || item.id} title={item.name} key={item._id || item.id}>
        {item.children && item.children.length > 0 ? renderTreeNodes(item.children) : null}
      </TreeNode>
    ))
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 在编辑模式下，类别选择可选；优先使用选择的类别映射类型，否则回退到现有策略类型
      let mappedType = existingStrategy?.type || '技术指标';
      if (selectedCategoryId) {
        const found = findNodeAndRoot(allCategories, selectedCategoryId, null);
        const rootTypeName = found?.rootName || selectedRootType;
        const allowedTypes = ['技术指标', '机器学习', '统计套利', '事件驱动'];
        mappedType = allowedTypes.includes(rootTypeName) ? rootTypeName : mappedType;
      }

      if (!code || code.trim() === '') {
        message.error('请在代码编辑页填写策略代码');
        setActiveTab('code');
        return;
      }

      setSaving(true);
      const payload = {
        name: values.name,
        description: values.description,
        type: mappedType,
        code,
        parameters: existingStrategy?.parameters || {},
        status: existingStrategy?.status || '未启用'
      };

      await api.put(`/strategies/${id}`, payload);
      message.success('策略更新成功');
      navigate('/strategy');
    } catch (error) {
      if (error && error.errorFields) {
        // 表单校验错误
        return;
      }
      const msg = error?.response?.data?.message || error?.message || '未知错误';
      message.error('策略更新失败：' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/strategy')}>返回策略列表</Button>
          <h2 style={{ margin: 0 }}>编辑策略</h2>
        </div>
        <div>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存修改
          </Button>
        </div>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="基本信息" key="basic">
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="策略名称" rules={[{ required: true, message: '请输入策略名称' }]}>
                <Input placeholder="请输入策略名称" />
              </Form.Item>
              <Form.Item name="description" label="策略描述" rules={[{ required: true, message: '请输入策略描述' }]}>
                <TextArea rows={4} placeholder="请输入策略描述" />
              </Form.Item>
              <Form.Item name="categoryId" label="策略类型（树形）">
                <TreeSelect
                  placeholder="请选择策略类型（可选）"
                  allowClear
                  treeDefaultExpandAll
                  style={{ width: '100%' }}
                  loading={loadingCategories}
                  value={selectedCategoryId}
                  onChange={(val) => {
                    setSelectedCategoryId(val);
                    const found = findNodeAndRoot(allCategories, val, null);
                    setSelectedRootType(found?.rootName || '');
                  }}
                >
                  {renderTreeNodes(allCategories)}
                </TreeSelect>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="代码编辑" key="code">
            <MonacoEditor value={code} onChange={setCode} />
          </TabPane>

          <TabPane tab="预览保存" key="preview">
            <div style={{ marginBottom: 16 }}>
              <EyeOutlined /> 预览
            </div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <p><strong>策略名称：</strong>{form.getFieldValue('name') || '-'}</p>
              <p><strong>策略描述：</strong>{form.getFieldValue('description') || '-'}</p>
              <p><strong>策略类型：</strong>{(['技术指标','机器学习','统计套利','事件驱动'].includes(selectedRootType) ? selectedRootType : (existingStrategy?.type || '技术指标')) || '-'}</p>
              <p><strong>状态：</strong>{existingStrategy?.status || '未启用'}</p>
            </Card>
            <Card title="代码预览">
               <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: '400px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
 {code || ''}
               </pre>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default StrategyEdit;