import React, { useEffect, useState, useCallback } from 'react';
import { Card, List, Input, Spin, Button, message, Descriptions, Image, TreeSelect, Space } from 'antd';
import { CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import templateAPI from '../services/templateAPI';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import categoryAPI from '../services/categoryAPI';

const { Search } = Input;
const { TreeNode } = TreeSelect;

const StrategyClone = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [strategyTypes, setStrategyTypes] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [strategyName, setStrategyName] = useState('');

  const getCurrentUsername = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!raw) return '用户';
      const obj = JSON.parse(raw);
      return obj.username || obj.name || obj.email || '用户';
    } catch (e) {
      return '用户';
    }
  };

  const buildTreeNodes = useCallback((treeData) => {
    if (!treeData || !Array.isArray(treeData)) {
      return null;
    }
    return treeData.map(node => {
      const nodeId = node.id || node._id;
      if (node.children && node.children.length > 0) {
        return (
          <TreeNode key={nodeId} value={nodeId} title={node.name}>
            {buildTreeNodes(node.children)}
          </TreeNode>
        );
      }
      return <TreeNode key={nodeId} value={nodeId} title={node.name} />;
    });
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getCategoryTree();
      let categoriesData = null;
      if (response && response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.tree)) {
          categoriesData = response.tree;
        } else if (Array.isArray(response.categories)) {
          categoriesData = response.categories;
        }
      }
      setStrategyTypes(categoriesData || []);
    } catch (error) {
      console.error('获取策略类型失败:', error);
      message.error('获取策略类型失败：' + (error.response?.data?.message || error.message));
      setStrategyTypes([]);
    }
  }, []);

  const fetchTemplates = useCallback(async (keyword = searchKeyword) => {
    setLoading(true);
    try {
      const data = await templateAPI.getTemplates({
        pageSize: 50,
        keyword,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      const list = Array.isArray(data?.templates) ? data.templates : [];
      setTemplates(list);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      message.error('获取模板列表失败: ' + (error.message || '未知错误'));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchKeyword]);

  const fetchTemplateDetail = async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const detail = await templateAPI.getTemplateDetail(id);
      setSelectedTemplate(detail);
    } catch (error) {
      console.error('获取模板详情失败:', error);
      message.error('获取模板详情失败: ' + (error.response?.data?.message || error.message));
      setSelectedTemplate(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      const username = getCurrentUsername();
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setStrategyName(`${selectedTemplate.name}+${username}+${ts}`);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, [fetchCategories, fetchTemplates]);

  useEffect(() => {
    // 当分类或搜索关键词变化时刷新列表
    fetchTemplates();
  }, [fetchTemplates]);

  const onSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    fetchTemplateDetail(id);
  };

  const handleClone = async () => {
    if (!selectedTemplateId) {
      message.warning('请先选择一个模板进行预览');
      return;
    }
    try {
      const response = await api.post(`/strategies/clone-from-template/${selectedTemplateId}`, { name: strategyName });
      const created = response.data?.strategy;
      if (!created) {
        throw new Error('服务器未返回创建的策略');
      }
      message.success('策略克隆成功');
      navigate('/strategy');
    } catch (error) {
      console.error('克隆策略失败:', error);
      message.error('克隆策略失败: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/my-strategies')}>
          返回我的策略
        </Button>
        <h2 style={{ margin: 0, marginLeft: 8 }}>从模板克隆策略</h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="搜索模板名称/描述"
            allowClear
            enterButton
            onSearch={(value) => {
              setSearchKeyword(value);
              fetchTemplates(value);
            }}
          />
          <TreeSelect
            placeholder="选择分类"
            allowClear
            style={{ width: 220 }}
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value || 'all')}
            treeDefaultExpandAll
          >
            <TreeNode key="all" value="all" title="全部" />
            {strategyTypes && buildTreeNodes(strategyTypes)}
          </TreeSelect>
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card title="模板列表" style={{ flex: 1 }} bodyStyle={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={templates}
              locale={{ emptyText: '暂无模板' }}
              renderItem={(item) => (
                <List.Item
                  key={item._id}
                  style={{ cursor: 'pointer', paddingLeft: 16, paddingRight: 16 }}
                  onClick={() => onSelectTemplate(item._id)}
                >
                  <List.Item.Meta
                    avatar={item.thumbnail ? (
                      <Image src={item.thumbnail} width={48} height={48} style={{ objectFit: 'cover' }} preview={false} />
                    ) : null}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.name}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>{item.category?.name || '未分类'}</span>
                      </div>
                    }
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card title="模板预览" style={{ flex: 1 }}>
          {loadingDetail ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : selectedTemplate ? (
            <>
              {selectedTemplate.thumbnail && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Image src={selectedTemplate.thumbnail} width={240} height={135} style={{ objectFit: 'cover' }} preview={false} />
                </div>
              )}
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="名称">{selectedTemplate.name}</Descriptions.Item>
                <Descriptions.Item label="描述">{selectedTemplate.description}</Descriptions.Item>
                <Descriptions.Item label="分类">{selectedTemplate.category?.name || '未分类'}</Descriptions.Item>
                <Descriptions.Item label="版本">{selectedTemplate.version || '1.0.0'}</Descriptions.Item>
                <Descriptions.Item label="来源">{selectedTemplate.source || '-'}</Descriptions.Item>
                <Descriptions.Item label="作者">{selectedTemplate.author?.username || '-'}</Descriptions.Item>
                <Descriptions.Item label="风险等级">{selectedTemplate.riskLevel || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">{selectedTemplate.status || '-'}</Descriptions.Item>
                <Descriptions.Item label="克隆后策略名称">{strategyName || '-'}</Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 12 }}>
                <Input
                  placeholder="请输入克隆后策略名称"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                />
                <div style={{ color: '#999', marginTop: 4 }}>默认命名：模板名 + 用户名 + 日期时间</div>
              </div>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<CopyOutlined />} onClick={handleClone}>
                  克隆为策略
                </Button>
              </div>
            </>
          ) : (
            <div style={{ color: '#999' }}>请选择左侧列表中的模板，查看基本预览。</div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StrategyClone;