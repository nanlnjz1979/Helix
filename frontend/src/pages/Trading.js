import React, { useState } from 'react';
import { Card, Table, Button, Tag, Tabs, Form, Select, InputNumber, Switch, message, Popconfirm } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';

const { Option } = Select;
const { TabPane } = Tabs;

const Trading = () => {
  const { isTrading, activeStrategies, tradingHistory } = useSelector(state => state.trading);
  const { strategies } = useSelector(state => state.strategy);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  // 活跃策略表格列定义
  const activeStrategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => (
        <Tag color={text === '趋势跟踪' ? 'blue' : text === '均值回归' ? 'green' : 'purple'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <Tag color={text === '运行中' ? 'green' : 'red'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '初始资金',
      dataIndex: 'initialCapital',
      key: 'initialCapital',
      render: (text) => `$${text}`,
    },
    {
      title: '当前资金',
      dataIndex: 'currentCapital',
      key: 'currentCapital',
      render: (text) => `$${text}`,
    },
    {
      title: '收益',
      dataIndex: 'profit',
      key: 'profit',
      render: (text) => {
        // 确保text有值，如果没有则默认为0
        const profitValue = text !== undefined ? text : 0;
        const isPositive = profitValue >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#f5222d' }}>
            ${profitValue} ({isPositive ? '+' : ''}{(profitValue / 1000).toFixed(2)}%)
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          {record.status === '运行中' ? (
            <Button 
              danger 
              icon={<PauseCircleOutlined />} 
              onClick={() => handleStopStrategy(record.id)}
            >
              停止
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={() => handleStartStrategy(record.id)}
            >
              启动
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个策略吗？"
            onConfirm={() => handleDeleteStrategy(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} style={{ marginLeft: 8 }}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // 交易历史表格列定义
  const tradingHistoryColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
    },
    {
      title: '股票',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (text) => (
        <Tag color={text === '买入' ? 'green' : 'red'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (text) => `$${text}`,
    },
  ];

  // 启动/停止自动交易
  const handleToggleAutoTrading = (checked) => {
    if (checked) {
      dispatch({ type: 'START_TRADING' });
      message.success('自动交易已启动');
    } else {
      dispatch({ type: 'STOP_TRADING' });
      message.info('自动交易已停止');
    }
  };

  // 添加交易策略
  const handleAddStrategy = () => {
    form.validateFields().then(values => {
      const strategyToAdd = strategies.find(s => s.id === values.strategyId);
      if (strategyToAdd) {
        const newActiveStrategy = {
          id: `active_${Date.now()}`,
          name: strategyToAdd.name,
          type: strategyToAdd.type,
          status: '运行中',
          initialCapital: values.initialCapital,
          currentCapital: values.initialCapital,
          profit: 0,
          strategyId: values.strategyId
        };
        dispatch({ type: 'ADD_ACTIVE_STRATEGY', payload: newActiveStrategy });
        form.resetFields();
        message.success('策略已添加到自动交易');
      }
    });
  };

  // 启动策略
  const handleStartStrategy = (id) => {
    dispatch({ type: 'START_STRATEGY', payload: id });
    message.success('策略已启动');
  };

  // 停止策略
  const handleStopStrategy = (id) => {
    dispatch({ type: 'STOP_STRATEGY', payload: id });
    message.info('策略已停止');
  };

  // 删除策略
  const handleDeleteStrategy = (id) => {
    dispatch({ type: 'REMOVE_ACTIVE_STRATEGY', payload: id });
    message.success('策略已删除');
  };

  return (
    <div>
      <h2>自动交易</h2>
      
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>自动交易状态</h3>
          <Switch 
            checked={isTrading} 
            onChange={handleToggleAutoTrading} 
            checkedChildren="已启动" 
            unCheckedChildren="已停止"
          />
        </div>
        
        {isTrading && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#52c41a', fontSize: 16 }}>自动交易系统正在运行中...</p>
            <p>当前活跃策略: {activeStrategies.length}个</p>
          </div>
        )}
      </Card>

      <Tabs defaultActiveKey="active" style={{ marginBottom: 16 }}>
        <TabPane tab="活跃策略" key="active">
          <Card title="活跃策略列表">
            <Table 
              columns={activeStrategyColumns} 
              dataSource={activeStrategies} 
              pagination={false}
              style={{ marginBottom: 16 }}
            />
            
            <Card title="添加交易策略">
              <Form form={form} layout="horizontal">
                <Form.Item
                  label="选择策略"
                  name="strategyId"
                  rules={[{ required: true, message: '请选择策略' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Select placeholder="请选择策略">
                    {strategies.map(strategy => (
                      <Option key={strategy.id} value={strategy.id}>{strategy.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label="初始资金"
                  name="initialCapital"
                  rules={[{ required: true, message: '请输入初始资金' }]}
                  style={{ marginBottom: 16 }}
                >
                  <InputNumber min={1000} max={1000000} defaultValue={10000} style={{ width: 200 }} />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddStrategy}
                  >
                    添加策略
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Card>
        </TabPane>
        
        <TabPane tab="交易历史" key="history">
          <Card title="交易历史记录">
            <Table 
              columns={tradingHistoryColumns} 
              dataSource={tradingHistory} 
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Trading;