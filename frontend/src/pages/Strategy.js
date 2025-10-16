import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tabs, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CodeOutlined } from '@ant-design/icons';
import { categoryAPI } from '../services/categoryAPI';

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

  // 获取策略分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await categoryAPI.getAllCategories();
        // 确保返回的是数组
        const categoriesList = Array.isArray(data.categories) ? data.categories : [];
        setCategories(categoriesList);
      } catch (error) {
        console.error('获取策略分类失败:', error);
        message.error('获取策略分类失败');
        // 不使用默认分类作为后备，保持categories为空数组
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
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <span style={{ color: text === '已启用' ? '#52c41a' : '#faad14' }}>
          {text}
        </span>
      ),
    },
    {      title: '创建时间',      dataIndex: 'createdAt',      key: 'createdAt',      render: date => {        if (!date) return '-';        const dateObj = new Date(date);        return isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleString();      }    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button 
            type="text" 
            icon={<CodeOutlined />} 
            onClick={() => showCodeModal(record)}
            style={{ marginRight: 8 }}
          >
            查看代码
          </Button>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
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

  const showModal = () => {
    setCurrentStrategy(null);
    form.resetFields();
    setIsModalVisible(true);
  };

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
        // 编辑现有策略
        const updatedStrategies = strategies.map(strategy => 
          strategy.id === currentStrategy.id ? { ...strategy, ...values } : strategy
        );
        setStrategies(updatedStrategies);
        message.success('策略更新成功');
      } else {
        // 创建新策略
        const newStrategy = {
          id: Date.now().toString(),
          ...values,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setStrategies([...strategies, newStrategy]);
        message.success('策略创建成功');
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
      onOk() {
        const updatedStrategies = strategies.filter(strategy => strategy.id !== id);
        setStrategies(updatedStrategies);
        message.success('策略已删除');
      }
    });
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
        <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
          创建新策略
        </Button>
      </div>
      
      <Card>
        <Table columns={columns} dataSource={strategies} rowKey="id" />
      </Card>
      
      {/* 创建/编辑策略模态框 */}
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
                overflow: 'auto'
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