import React, { useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Button, Table, Tag, message, Space, Statistic, Row, Col, Modal, Form, Select } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined, SafetyCertificateOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';

const { TabPane } = Tabs;

const AdminBackup = () => {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreForm] = Form.useForm();

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/backup/list');
      const list = resp.data?.data || [];
      setBackups(list);
      if (list.length > 0 && !selectedBackup) {
        setSelectedBackup(list[0]);
      }
    } catch (e) {
      message.error('获取备份列表失败');
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async () => {
    try {
      setLoading(true);
      const resp = await api.post('/admin/backup/run');
      const item = resp.data?.data;
      message.success('备份执行成功');
      await fetchBackups();
      setSelectedBackup({ id: item.id, dir: item.path, manifest: item.manifest, totalSize: Object.values(item.manifest.sizes || {}).reduce((a, b) => a + b, 0) });
    } catch (e) {
      message.error(e?.response?.data?.message || '备份执行失败');
    } finally {
      setLoading(false);
    }
  };

  const verifyBackup = async (record) => {
    try {
      setVerifyLoading(true);
      const resp = await api.post('/admin/backup/verify', { id: record.id });
      const result = resp.data?.data || {};
      const fail = Object.values(result).filter(r => !r.ok);
      if (fail.length === 0) {
        message.success('校验成功：所有文件一致');
      } else {
        message.warning(`校验完成：${fail.length} 个文件不一致`);
      }
    } catch (e) {
      message.error('校验失败');
    } finally {
      setVerifyLoading(false);
    }
  };

  const openRestore = (record) => {
    setSelectedBackup(record);
    restoreForm.resetFields();
    const models = record?.manifest?.models || [];
    restoreForm.setFieldsValue({ models, mode: 'replace' });
    setRestoreModalVisible(true);
  };

  const doRestore = async () => {
    try {
      const values = await restoreForm.validateFields();
      setRestoreLoading(true);
      await api.post('/admin/backup/restore', { id: selectedBackup.id, models: values.models, mode: values.mode });
      message.success('恢复执行成功');
      setRestoreModalVisible(false);
    } catch (e) {
      message.error(e?.response?.data?.message || '恢复执行失败');
    } finally {
      setRestoreLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const columns = [
    { title: '版本ID', dataIndex: 'id', key: 'id' },
    { title: '创建时间', key: 'createdAt', render: (_, r) => r.manifest?.createdAt ? new Date(r.manifest.createdAt).toLocaleString() : '-' },
    { title: '模型数', key: 'models', render: (_, r) => r.manifest?.models?.length || 0 },
    { title: '总大小', key: 'size', render: (_, r) => `${(r.totalSize / (1024*1024)).toFixed(2)} MB` },
    { title: '存储', key: 'storage', render: (_, r) => <Tag color="blue">本地</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => verifyBackup(record)} loading={verifyLoading}>校验</Button>
          <Button size="small" type="primary" icon={<CloudDownloadOutlined />} onClick={() => openRestore(record)}>恢复</Button>
        </Space>
      )
    }
  ];

  const totalBackups = backups.length;
  const totalSize = useMemo(() => backups.reduce((acc, r) => acc + (r.totalSize || 0), 0), [backups]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>数据备份与恢复</h2>
        <Space>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={runBackup} loading={loading}>运行全量备份</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchBackups} disabled={loading}>刷新</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="备份版本数" value={totalBackups} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="累计备份大小" value={(totalSize / (1024*1024)).toFixed(2)} suffix="MB" />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Space>
              <Tag color="green">全量备份</Tag>
              <Tag color="gold">差异备份（规划中）</Tag>
              <Tag color="blue">增量备份（规划中）</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs defaultActiveKey="overview">
          <TabPane tab="概览" key="overview">
            <Table columns={columns} dataSource={backups} rowKey="id" pagination={{ pageSize: 8 }} loading={loading} />
          </TabPane>
          <TabPane tab="备份任务" key="jobs">
            <p>备份频率与策略将在后续版本开放配置（RPO/RTO、生命周期管理、加密策略）。</p>
            <p>当前支持：一键全量备份、版本列表、哈希校验、选择模型恢复。</p>
          </TabPane>
          <TabPane tab="恢复管理" key="restore">
            <p>在概览列表中选择某个版本点击“恢复”以执行恢复操作。</p>
            <p>恢复流程：替换模式（默认）将清空对应集合后再导入备份数据。</p>
          </TabPane>
          <TabPane tab="存储与策略" key="storage">
            <p>存储介质规划：本地NAS（7天）、云端对象存储（≥7天历史与异地副本）。</p>
            <p>加密与合规：传输采用TLS，静态文件采用AES-256（后续可选启用KMS对接）。</p>
          </TabPane>
          <TabPane tab="告警与审计" key="alerts">
            <p>后续将提供备份失败、存储空间阈值、恢复测试指标的告警与审计界面。</p>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="恢复选项"
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        onOk={doRestore}
        confirmLoading={restoreLoading}
      >
        <Form form={restoreForm} layout="vertical">
          <Form.Item name="models" label="选择恢复的数据集合" rules={[{ required: true, message: '至少选择一个集合' }]}> 
            <Select mode="multiple" placeholder="请选择集合">
              {(selectedBackup?.manifest?.models || []).map(m => (
                <Select.Option value={m} key={m}>{m}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="mode" label="恢复模式">
            <Select>
              <Select.Option value="replace">替换（清空集合后导入）</Select.Option>
              <Select.Option value="append">追加（不清空集合）</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminBackup;