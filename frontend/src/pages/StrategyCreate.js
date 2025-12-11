import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Select, Button, Card, message, TreeSelect } from 'antd';
import { CodeOutlined, SaveOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import categoryAPI from '../services/categoryAPI';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { TreeNode } = TreeSelect;

// 轻量代码编辑器占位（可替换为Monaco Editor）
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

const StrategyCreate = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [form] = Form.useForm();
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  // 类别树相关状态
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

  const getCurrentUserId = () => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      return user && (user._id || user.id);
    } catch (e) {
      return undefined;
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedCategoryId) {
        message.error('请选择策略类型（类别树）');
        return;
      }
      // 根据选中类别推断顶层类型名称（用于后端枚举）
      const found = findNodeAndRoot(allCategories, selectedCategoryId, null);
      const rootTypeName = found?.name || selectedRootType;
      if (!rootTypeName) {
        message.error('无法解析顶层策略类型，请重新选择');
        return;
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
        type: found?.node.name, // 确保落入后端枚举：技术指标/机器学习/统计套利/事件驱动
        code,
        parameters: {},
        status: '未启用',
        user: getCurrentUserId(),
      };

      // 提交到后端策略创建接口
      await api.post('/strategies', payload);
      message.success('策略创建成功');
      navigate('/strategy');
    } catch (error) {
      if (error && error.errorFields) {
        // 表单校验错误
        return;
      }
      const msg = error?.response?.data?.message || error?.message || '未知错误';
      message.error('策略创建失败：' + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/my-strategies')}>返回我的策略</Button>
          <h2 style={{ margin: 0 }}>创建新策略</h2>
        </div>
        <div>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存策略
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
              <Form.Item name="categoryId" label="策略类型（树形）" rules={[{ required: true, message: '请选择策略类型' }]}>
                <TreeSelect
                  placeholder="请选择策略类型"
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
              <p><strong>策略类型：</strong>{(() => { const found = findNodeAndRoot(allCategories, selectedCategoryId, null); return found?.node?.name || '-'; })()}</p>
              <p><strong>状态：</strong>未启用</p>
            </Card>
            <Card title="代码预览">
              <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 500, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                {code || '# 在此输入策略代码以预览'}
              </pre>
            </Card>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                保存策略
              </Button>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default StrategyCreate;