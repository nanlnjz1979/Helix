import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Tag, Tooltip, Radio, Tabs, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CodeOutlined, CopyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../services/api';
import { categoryAPI } from '../services/categoryAPI';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const Strategy = () => {
  const [strategies, setStrategies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const navigate = useNavigate();


  // 初次加载：获取当前用户的策略列表
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await api.get('/strategies');
        const list = Array.isArray(response?.data) ? response.data : [];
        const mapped = list.map(s => ({
          id: s._id || s.id,
          name: s.name,
          description: s.description,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt
        }));
        setStrategies(mapped);
      } catch (error) {
        console.error('获取策略列表失败:', error);
        const msg = error?.response?.data?.message || error?.message || '未知错误';
        message.error('获取策略列表失败: ' + msg);
        setStrategies([]);
      }
    };
    fetchStrategies();
  }, []);

  // 获取策略分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        if (!categoryAPI || typeof categoryAPI.getAllCategories !== 'function') {
          console.error('categoryAPI未正确导入或getAllCategories方法不存在');
          setCategories([]);
          return;
        }
        const data = await categoryAPI.getAllCategories();
        const categoriesList = Array.isArray(data?.categories) ? data.categories : [];
        setCategories(categoriesList);
      } catch (error) {
        console.error('获取策略分类失败:', error);
        message.error('获取策略分类失败: ' + (error.message || '未知错误'));
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const columns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      align: 'center',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      align: 'center',
    },
    {
      title: '虚拟实盘',
      dataIndex: 'status',
      key: 'status',
      render: (text, record) => (
        <Switch
          checked={text === '已启用'}
          onChange={(checked) => {
            if (checked) {
              handleEnable(record.id);
            } else {
              handleDisable(record.id);
            }
          }}
          checkedChildren="实盘"
          unCheckedChildren="禁用"
        />
      ),
      align: 'center',
    },
    {
      title: '运行状态',
      key: 'runningStatus',
      render: (_, record) => (
        <span style={{
          margin: 0, 
          fontWeight: '500', 
          fontSize: 14, 
          color: (record.runningStatus === 'running' ? '#52c41a' : 
                 record.runningStatus === 'paused' ? '#1890ff' : 
                 record.runningStatus === 'error' ? '#f5222d' : '#faad14'),
          backgroundColor: (record.runningStatus === 'running' ? '#f6ffed' : 
                         record.runningStatus === 'paused' ? '#e6f7ff' : 
                         record.runningStatus === 'error' ? '#fff2f0' : '#fffbe6'),
          border: `1px solid ${(record.runningStatus === 'running' ? '#b7eb8f' : 
                              record.runningStatus === 'paused' ? '#91d5ff' : 
                              record.runningStatus === 'error' ? '#ffccc7' : '#ffe58f')}`,
          padding: '2px 12px',
          borderRadius: 12,
          display: 'inline-block'
        }}>
          {record.runningStatus === 'running' && '运行中'}
          {record.runningStatus === 'paused' && '已暂停'}
          {record.runningStatus === 'error' && '错误'}
          {record.runningStatus === 'stopped' && '已停止'}
          {!record.runningStatus && '已停止'}
        </span>
      ),
      align: 'center',
    },
    {
      title: '启动方式',
      key: 'startMode',
      render: (_, record) => (
        <span style={{
          margin: 0, 
          fontWeight: '500', 
          fontSize: 14, 
          color: '#666',
          backgroundColor: '#f0f0f0',
          border: '1px solid #d9d9d9',
          padding: '2px 12px',
          borderRadius: 12,
          display: 'inline-block'
        }}>
          {record.startMode === 'auto' && '自动'}
          {record.startMode === 'scheduled' && '定时'}
          {record.startMode === 'manual' && '手动'}
          {!record.startMode && '手动'}
        </span>
      ),
      align: 'center',
    },
    {      title: '创建时间',      dataIndex: 'createdAt',      key: 'createdAt',      render: date => {        if (!date) return '-';        const dateObj = new Date(date);        return isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleString();      }, align: 'center'    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/strategy/edit/${record.id}`)}
            style={{ marginRight: 8 }}
          >
            编辑
          </Button>
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const showEditModal = (strategy) => {
    setCurrentStrategy(strategy);
    form.setFieldsValue(strategy);
    setIsModalVisible(true);
  };

  const showCodeModal = (strategy) => {
    setCurrentStrategy(strategy);
    setIsCodeModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      if (currentStrategy) {
        const updatedStrategies = strategies.map(strategy => 
          strategy.id === currentStrategy.id ? { ...strategy, ...values } : strategy
        );
        setStrategies(updatedStrategies);
        message.success('策略更新成功');
      }
      setIsModalVisible(false);
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleCodeCancel = () => {
    setIsCodeModalVisible(false);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个策略吗？此操作不可逆。',
      onOk: async () => {
        try {
          await api.delete(`/strategies/${id}`);
          setStrategies(prev => prev.filter(strategy => strategy.id !== id));
          message.success('策略已删除');
        } catch (error) {
          console.error('删除策略失败:', error);
          message.error('删除失败：' + (error.response?.data?.message || error.message));
          throw error; // 返回拒绝的Promise以保持弹窗状态
        }
      }
    });
  };

  // 获取当前用户ID
  const getCurrentUserId = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj.id || obj._id;
    } catch (e) {
      return null;
    }
  };

  const handleEnable = async (id) => {
    try {
      // 1. 启用策略
      await api.put(`/strategies/${id}`, { status: '已启用' });
      
      // 2. 获取当前用户ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('无法获取当前用户ID');
      }
      
      // 3. 为策略创建默认账户
      await api.post('/simulator/account', {
        strategiesId: id,
        userId: userId,
        gatewayName: 'CUSTOM',
        balance: 100000.0,
        available: 100000.0,
        frozen: 0.0,
        status: 'ACTIVE',
        totalPnl: 0.0,
        realizedPnl: 0.0,
        unrealizedPnl: 0.0,
        changeTime: new Date().toISOString(),
        changeType: 'INITIAL'
      });
      
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: '已启用' } : s));
      message.success('策略已启用，已创建默认账户');
    } catch (error) {
      console.error('启用策略失败:', error);
      message.error('启用失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleDisable = async (id) => {
    try {
      // 1. 禁用策略
      await api.put(`/strategies/${id}`, { status: '未启用' });
      
      // 2. 删除策略相关的订单
      await api.delete(`/orders/strategy/${id}`);
      
      // 3. 删除策略相关的持仓
      await api.delete(`/simulator/positions/by-strategy/${id}`);
      
      // 4. 删除策略相关的账户
      await api.delete(`/simulator/account/by-strategy/${id}`);
      
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: '未启用' } : s));
      message.success('策略已禁用，已删除相关账户、持仓和订单');
    } catch (error) {
      console.error('禁用策略失败:', error);
      message.error('禁用失败：' + (error.response?.data?.message || error.message));
    }
  };





  // 模拟策略代码
  const getStrategyCode = (strategy) => {
    if (strategy.name === '均线交叉策略') {
      return `
# 均线交叉策略
import pandas as pd
import numpy as np

def initialize(context):
    # 设置参数
    context.short_window = 5
    context.long_window = 20
    context.stocks = ['AAPL', 'MSFT', 'GOOGL']

def handle_data(context, data):
    for stock in context.stocks:
        # 获取历史数据
        prices = data.history(stock, 'close', context.long_window + 1, '1d')
        
        # 计算短期和长期均线
        short_ma = prices.rolling(window=context.short_window).mean()
        long_ma = prices.rolling(window=context.long_window).mean()
        
        # 生成交易信号
        if short_ma[-1] > long_ma[-1] and short_ma[-2] <= long_ma[-2]:
            # 短期均线上穿长期均线，买入信号
            order_target_percent(stock, 0.3)
        elif short_ma[-1] < long_ma[-1] and short_ma[-2] >= long_ma[-2]:
            # 短期均线下穿长期均线，卖出信号
            order_target_percent(stock, 0)
      `;
    } else if (strategy.name === 'RSI超买超卖策略') {
      return `
# RSI超买超卖策略
import pandas as pd
import numpy as np
import talib

def initialize(context):
    # 设置参数
    context.rsi_period = 14
    context.oversold_threshold = 30
    context.overbought_threshold = 70
    context.stocks = ['AAPL', 'MSFT', 'GOOGL']

def handle_data(context, data):
    for stock in context.stocks:
        # 获取历史数据
        prices = data.history(stock, 'close', context.rsi_period + 10, '1d')
        
        # 计算RSI指标
        rsi = talib.RSI(prices.values, timeperiod=context.rsi_period)
        
        current_position = context.portfolio.positions[stock].amount
        
        # 生成交易信号
        if rsi[-1] < context.oversold_threshold:
            # RSI低于30，超卖信号，买入
            if current_position == 0:
                order_target_percent(stock, 0.3)
        elif rsi[-1] > context.overbought_threshold:
            # RSI高于70，超买信号，卖出
            if current_position > 0:
                order_target_percent(stock, 0)
      `;
    } else {
      return `
# 布林带突破策略
import pandas as pd
import numpy as np
import talib

def initialize(context):
    # 设置参数
    context.bollinger_period = 20
    context.bollinger_std = 2
    context.stocks = ['AAPL', 'MSFT', 'GOOGL']

def handle_data(context, data):
    for stock in context.stocks:
        # 获取历史数据
        prices = data.history(stock, 'close', context.bollinger_period + 10, '1d')
        
        # 计算布林带
        upper, middle, lower = talib.BBANDS(
            prices.values, 
            timeperiod=context.bollinger_period,
            nbdevup=context.bollinger_std,
            nbdevdn=context.bollinger_std
        )
        
        current_price = prices[-1]
        current_position = context.portfolio.positions[stock].amount
        
        # 生成交易信号
        if current_price > upper[-1]:
            # 价格突破上轨，买入信号
            if current_position == 0:
                order_target_percent(stock, 0.3)
        elif current_price < lower[-1]:
            # 价格突破下轨，卖出信号
            if current_position > 0:
                order_target_percent(stock, 0)
      `;
    }
  };

  return (
    <div>
      <h2>交易策略</h2>
      
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/strategy/create')} style={{ marginRight: 8 }}>
          创建新策略
        </Button>
          <Button icon={<CopyOutlined />} onClick={() => navigate('/strategy/clone')}>
          从模板克隆策略
        </Button>
      </div>
      
      <Card>
        <Table columns={columns} dataSource={strategies} rowKey="id" />
      </Card>
      
      {/* 编辑策略模态框（创建策略已迁移至全屏页面） */}
      <Modal
        title={currentStrategy ? '编辑策略' : '创建新策略'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="请输入策略名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="策略描述"
            rules={[{ required: true, message: '请输入策略描述' }]}
          >
            <TextArea rows={4} placeholder="请输入策略描述" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="策略类型"
            rules={[{ required: true, message: '请选择策略类型' }]}
          >
            <Select placeholder="请选择策略类型" loading={loadingCategories}>
              {categories.map(category => (
                <Option key={category._id} value={category.name}>{category.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="策略状态"
            rules={[{ required: true, message: '请选择策略状态' }]}
          >
            <Select placeholder="请选择策略状态">
              <Option value="已启用">已启用</Option>
              <Option value="未启用">未启用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 查看策略代码模态框 */}
      <Modal
        title={currentStrategy ? `${currentStrategy.name} - 策略代码` : '策略代码'}
        visible={isCodeModalVisible}
        onCancel={handleCodeCancel}
        footer={[
          <Button key="back" onClick={handleCodeCancel}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {currentStrategy && (
          <Tabs defaultActiveKey="code">
            <TabPane tab="Python代码" key="code">
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: 16, 
                            borderRadius: 4,
                            maxHeight: '500px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace'
                          }}>
                 {getStrategyCode(currentStrategy)}
               </pre>
            </TabPane>
            <TabPane tab="参数设置" key="params">
              <Form layout="vertical">
                {currentStrategy.name === '均线交叉策略' && (
                  <>
                    <Form.Item label="短期均线周期">
                      <Input defaultValue="5" />
                    </Form.Item>
                    <Form.Item label="长期均线周期">
                      <Input defaultValue="20" />
                    </Form.Item>
                  </>
                )}
                
                {currentStrategy.name === 'RSI超买超卖策略' && (
                  <>
                    <Form.Item label="RSI周期">
                      <Input defaultValue="14" />
                    </Form.Item>
                    <Form.Item label="超卖阈值">
                      <Input defaultValue="30" />
                    </Form.Item>
                    <Form.Item label="超买阈值">
                      <Input defaultValue="70" />
                    </Form.Item>
                  </>
                )}
                
                {currentStrategy.name === '布林带突破策略' && (
                  <>
                    <Form.Item label="布林带周期">
                      <Input defaultValue="20" />
                    </Form.Item>
                    <Form.Item label="标准差倍数">
                      <Input defaultValue="2" />
                    </Form.Item>
                  </>
                )}
              </Form>
            </TabPane>
          </Tabs>
        )}
      </Modal>

    </div>
  );
};

export default Strategy;