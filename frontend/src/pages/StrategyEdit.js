import React, { useState, useEffect, useRef } from 'react';
import { Tabs, Form, Input, Button, Card, message, TreeSelect, InputNumber, Switch } from 'antd';
import { CodeOutlined, SaveOutlined, EyeOutlined, ArrowLeftOutlined, PlayCircleOutlined, StopOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
  const [parsedParams, setParsedParams] = useState([]);

  // 现有策略
  const [existingStrategy, setExistingStrategy] = useState(null);

  // 类别树相关状态（与创建页一致）
  const [allCategories, setAllCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedRootType, setSelectedRootType] = useState('');

  // 编译相关状态
  const [compiling, setCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState('idle'); // idle | running | success | error
  const [compileLogs, setCompileLogs] = useState([]);
  const [compileArtifact, setCompileArtifact] = useState(null);
  const compileSourceRef = useRef(null);

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

  // 从代码中解析参数（简化解析器，与模板页一致模式）
  const parseParamsFromCode = (codeStr) => {
    const params = [];
    const paramClassRegex = /class\s+StrategyParams[\s\S]*?def\s+__init__\(self\):([\s\S]*?)class|$/;
    const match = (codeStr || '').match(paramClassRegex);
    if (match && match[1]) {
      const lines = match[1].split('\n');
      lines.forEach(line => {
        const paramRegex = /self\.(\w+)\s*=\s*([^#]+)\s*#\s*(.+)/;
        const m = line.match(paramRegex);
        if (m) {
          const [, name, valueRaw, description] = m;
          let parsedValue;
          const v = (valueRaw || '').trim();
          if (v === 'true') parsedValue = true;
          else if (v === 'false') parsedValue = false;
          else if (!isNaN(v)) parsedValue = Number(v);
          else parsedValue = v.replace(/'/g, '');
          params.push({
            name,
            value: parsedValue,
            description,
            type: typeof parsedValue
          });
        }
      });
    }
    setParsedParams(params);
  };

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
        const initCode = s.code || '';
        setCode(initCode);
        parseParamsFromCode(initCode);
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

  const updateParamValue = (index, newValue) => {
    setParsedParams(prev => {
      const next = [...prev];
      next[index] = { ...next[index], value: newValue };
      return next;
    });
  };

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

      // 将解析到的参数组装为对象 {name: value}
      const parametersObj = parsedParams && parsedParams.length > 0
        ? parsedParams.reduce((acc, p) => { acc[p.name] = p.value; return acc; }, {})
        : (existingStrategy?.parameters || {});

      setSaving(true);
      const payload = {
        name: values.name,
        description: values.description,
        type: mappedType,
        code,
        parameters: parametersObj,
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

  // 编译：启动与停止
  const startCompile = () => {
    if (!id) return;
    // 重置状态
    setCompileLogs([]);
    setCompileArtifact(null);
    setCompileStatus('running');
    setCompiling(true);

    try {
      const token = localStorage.getItem('token');
      const compileUrl = `http://localhost:5000/api/strategies/${id}/compile${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const es = new EventSource(compileUrl);
      compileSourceRef.current = es;

      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          const ts = new Date(payload.ts || Date.now()).toLocaleTimeString();
          setCompileLogs(prev => [...prev, `[${ts}] ${payload.level?.toUpperCase() || 'INFO'}: ${payload.message}`]);
        } catch (e) {
          setCompileLogs(prev => [...prev, `日志解析失败: ${ev.data}`]);
        }
      };

      es.addEventListener('done', (ev) => {
        setCompiling(false);
        try {
          const final = JSON.parse(ev.data);
          if (final.status === 'success') {
            setCompileStatus('success');
            setCompileArtifact(final.artifact || null);
            message.success('编译成功');
          } else {
            setCompileStatus('error');
            message.error(final.message || '编译失败');
          }
        } catch (e) {
          setCompileStatus('error');
          message.error('编译结束数据解析失败');
        }
        es.close();
        compileSourceRef.current = null;
      });

      es.onerror = () => {
        setCompiling(false);
        setCompileStatus('error');
        setCompileLogs(prev => [...prev, '编译连接或服务错误']);
        es.close();
        compileSourceRef.current = null;
      };
    } catch (e) {
      setCompiling(false);
      setCompileStatus('error');
      setCompileLogs(prev => [...prev, `无法启动编译: ${e.message}`]);
    }
  };

  const stopCompile = () => {
    const es = compileSourceRef.current;
    if (es) {
      es.close();
      compileSourceRef.current = null;
      setCompiling(false);
      setCompileStatus('idle');
      setCompileLogs(prev => [...prev, '已停止编译']);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/my-strategies')}>返回我的策略</Button>
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
            <MonacoEditor value={code} onChange={(val) => { setCode(val); parseParamsFromCode(val); }} />
          </TabPane>

          <TabPane tab="参数配置" key="params">
            {parsedParams && parsedParams.length > 0 ? (
              <Form layout="vertical">
                {parsedParams.map((p, idx) => (
                  <Form.Item key={p.name} label={`${p.name}${p.description ? ` - ${p.description}` : ''}`}>
                    {p.type === 'number' ? (
                      <InputNumber style={{ width: '100%' }} value={p.value} onChange={(val) => updateParamValue(idx, val)} />
                    ) : p.type === 'boolean' ? (
                      <Switch checked={!!p.value} onChange={(checked) => updateParamValue(idx, checked)} />
                    ) : (
                      <Input value={String(p.value)} onChange={(e) => updateParamValue(idx, e.target.value)} />
                    )}
                  </Form.Item>
                ))}
              </Form>
            ) : (
              <p style={{ color: '#888', textAlign: 'center' }}>未解析到参数，请在代码中定义 StrategyParams 类，并在构造函数中以“self.name = value # 描述”的形式声明参数。</p>
            )}
          </TabPane>

          <TabPane tab="代码编译" key="compile">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={startCompile} disabled={compiling}>开始编译</Button>
                <Button danger icon={<StopOutlined />} onClick={stopCompile} disabled={!compiling}>停止</Button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {compileStatus === 'running' && <span style={{ color: '#1890ff' }}><PlayCircleOutlined /> 编译中</span>}
                {compileStatus === 'success' && <span style={{ color: '#52c41a' }}><CheckCircleOutlined /> 编译成功</span>}
                {compileStatus === 'error' && <span style={{ color: '#ff4d4f' }}><CloseCircleOutlined /> 编译失败</span>}
                {compileStatus === 'idle' && <span style={{ color: '#888' }}>未开始</span>}
              </div>
            </div>
            <Card title="编译日志" style={{ marginBottom: 16 }}>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                {compileLogs.length > 0 ? compileLogs.join('\n') : '暂无日志'}
              </pre>
            </Card>
            <Card title="编译产物">
              {compileArtifact ? (
                <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                  {JSON.stringify(compileArtifact, null, 2)}
                </pre>
              ) : (
                <div style={{ color: '#888' }}>暂无产物（编译成功后显示）</div>
              )}
            </Card>
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