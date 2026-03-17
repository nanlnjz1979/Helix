import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Typography, message, Modal, Form, Select } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 获取配置列表
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/configs');
        setConfigs(response.data.configs || []);
      } catch (error) {
        console.error('获取配置列表失败:', error);
        message.error('获取配置列表失败');
        // 使用默认配置作为备选
        setConfigs([
          {
            key: 'virtual_live',
            value: { url: 'redis://127.0.0.1:6379/0' },
            description: '虚拟实盘Redis配置',
            type: 'redis',
            _id: '1'
          },
          {
            key: 'backtest',
            value: { url: 'redis://127.0.0.1:6379/0' },
            description: '回测Redis配置',
            type: 'redis',
            _id: '2'
          },
          {
            key: 'virtual_live_start_time',
            value: { time: '09:10:00' },
            description: '虚拟实盘启动时间',
            type: 'time',
            _id: '3'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  // 打开编辑模态框
  const handleEdit = (config) => {
    setEditingConfig(config);
    form.setFieldsValue({
      key: config.key,
      value: JSON.stringify(config.value, null, 2),
      description: config.description,
      type: config.type
    });
    setIsModalVisible(true);
  };

  // 关闭编辑模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 解析value为JSON对象
      let parsedValue;
      try {
        parsedValue = JSON.parse(values.value);
      } catch (e) {
        message.error('配置值必须是有效的JSON格式');
        return;
      }

      // 发送保存请求
      const response = await api.post('/admin/configs', {
        key: values.key,
        value: parsedValue,
        description: values.description,
        type: values.type
      });

      // 更新本地配置列表
      setConfigs(prevConfigs => {
        const index = prevConfigs.findIndex(config => config.key === values.key);
        if (index > -1) {
          const updatedConfigs = [...prevConfigs];
          updatedConfigs[index] = response.data.config;
          return updatedConfigs;
        } else {
          return [...prevConfigs, response.data.config];
        }
      });

      message.success('配置保存成功');
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '配置键',
      dataIndex: 'key',
      key: 'key',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '配置值',
      dataIndex: 'value',
      key: 'value',
      render: (value) => (
        <pre style={{ maxHeight: 100, overflow: 'auto', margin: 0, fontSize: '12px' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: type === 'redis' ? '#e6f7ff' : 
                          type === 'time' ? '#f6ffed' : 
                          type === 'string' ? '#fff7e6' : 
                          type === 'number' ? '#f0f5ff' : 
                          type === 'boolean' ? '#fff1f0' : '#fafafa',
          color: type === 'redis' ? '#1890ff' : 
                 type === 'time' ? '#52c41a' : 
                 type === 'string' ? '#faad14' : 
                 type === 'number' ? '#722ed1' : 
                 type === 'boolean' ? '#f5222d' : '#8c8c8c',
          fontSize: '12px'
        }}>
          {type}
        </span>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => date ? new Date(date).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={4}>参数配置</Title>
      
      <Card>
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="key"
          loading={loading}
          pagination={false}
          bordered
          style={{ marginBottom: 20 }}
        />
        
        <Text type="secondary" style={{ fontSize: '12px' }}>
          注：配置值必须是有效的JSON格式。例如：{`{"url":"redis://127.0.0.1:6379/0"}`} 或 {`{"time":"09:10:00"}`}
        </Text>
      </Card>

      {/* 编辑配置模态框 */}
      <Modal
        title={editingConfig ? '编辑配置' : '添加配置'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            <CloseOutlined /> 取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            <SaveOutlined /> 保存
          </Button>
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'object'
          }}
        >
          <Form.Item
            name="key"
            label="配置键"
            rules={[
              { required: true, message: '请输入配置键' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '配置键只能包含字母、数字、下划线和连字符' }
            ]}
          >
            <Input placeholder="例如：virtual_live" disabled={!!editingConfig} />
          </Form.Item>

          <Form.Item
            name="value"
            label="配置值（JSON格式）"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <TextArea
              rows={8}
              placeholder='例如：{"url":"redis://127.0.0.1:6379/0"}'
              style={{ fontFamily: 'Consolas, Menlo, Monaco, monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="配置的描述信息" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择配置类型' }]}
          >
            <Select placeholder="选择配置类型">
              <Option value="redis">Redis</Option>
              <Option value="time">时间</Option>
              <Option value="string">字符串</Option>
              <Option value="number">数字</Option>
              <Option value="boolean">布尔值</Option>
              <Option value="object">对象</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminConfig;