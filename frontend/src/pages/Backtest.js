import React, { useState } from 'react';
import { Card, Form, Select, DatePicker, InputNumber, Button, Tabs, Table, message } from 'antd';
import { PlayCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useSelector } from 'react-redux';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const Backtest = () => {
  const { strategies } = useSelector(state => state.strategy);
  const [form] = Form.useForm();
  const [backtestResult, setBacktestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // 模拟回测结果数据
  const mockBacktestResult = {
    profit: 12500,
    profitPercent: 12.5,
    maxDrawdown: 3.2,
    sharpeRatio: 2.4,
    winRate: 65,
    totalTrades: 42,
    startDate: '2023-01-01',
    endDate: '2023-06-01',
    initialCapital: 100000,
    finalCapital: 112500,
    equityCurve: [
      { date: '2023-01-01', value: 100000 },
      { date: '2023-01-15', value: 102500 },
      { date: '2023-02-01', value: 105000 },
      { date: '2023-02-15', value: 103000 },
      { date: '2023-03-01', value: 107000 },
      { date: '2023-03-15', value: 108500 },
      { date: '2023-04-01', value: 110000 },
      { date: '2023-04-15', value: 109500 },
      { date: '2023-05-01', value: 111000 },
      { date: '2023-05-15', value: 113000 },
      { date: '2023-06-01', value: 112500 }
    ],
    monthlyReturns: [
      { month: '2023-01', return: 2.5 },
      { month: '2023-02', return: 0.5 },
      { month: '2023-03', return: 3.3 },
      { month: '2023-04', return: 1.4 },
      { month: '2023-05', return: 2.3 }
    ],
    trades: [
      { key: '1', date: '2023-01-05', symbol: 'AAPL', type: '买入', price: 120.5, quantity: 10, amount: 1205, profit: 205 },
      { key: '2', date: '2023-01-20', symbol: 'AAPL', type: '卖出', price: 141.0, quantity: 10, amount: 1410, profit: 205 },
      { key: '3', date: '2023-02-01', symbol: 'MSFT', type: '买入', price: 220.8, quantity: 8, amount: 1766.4, profit: 153.6 },
      { key: '4', date: '2023-02-15', symbol: 'MSFT', type: '卖出', price: 240.0, quantity: 8, amount: 1920, profit: 153.6 },
      { key: '5', date: '2023-03-05', symbol: 'GOOGL', type: '买入', price: 85.2, quantity: 15, amount: 1278, profit: 120 },
      { key: '6', date: '2023-03-20', symbol: 'GOOGL', type: '卖出', price: 93.2, quantity: 15, amount: 1398, profit: 120 }
    ]
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '股票',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => (
        <span style={{ color: text === '买入' ? '#52c41a' : '#f5222d' }}>
          {text}
        </span>
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
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d' }}>
          {text >= 0 ? '+' : ''}{text}
        </span>
      ),
    },
  ];

  // 获取净值曲线图表配置
  const getEquityCurveOption = () => {
    if (!backtestResult) return {};

    return {
      title: {
        text: '净值曲线'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: backtestResult.equityCurve.map(item => item.date)
      },
      yAxis: {
        type: 'value',
        scale: true
      },
      series: [
        {
          data: backtestResult.equityCurve.map(item => item.value),
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };

  // 获取月度收益图表配置
  const getMonthlyReturnsOption = () => {
    if (!backtestResult) return {};

    return {
      title: {
        text: '月度收益'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: backtestResult.monthlyReturns.map(item => item.month)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          data: backtestResult.monthlyReturns.map(item => item.return),
          type: 'bar',
          itemStyle: {
            color: (params) => {
              return params.value >= 0 ? '#52c41a' : '#f5222d';
            }
          }
        }
      ]
    };
  };

  // 执行回测
  const handleRunBacktest = () => {
    form.validateFields().then(values => {
      setIsRunning(true);
      
      // 模拟回测过程
      setTimeout(() => {
        setBacktestResult(mockBacktestResult);
        setIsRunning(false);
        message.success('回测完成');
      }, 2000);
    });
  };

  return (
    <div>
      <h2>策略回测</h2>
      
      <Card title="回测设置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="选择策略"
            name="strategy"
            rules={[{ required: true, message: '请选择策略' }]}
          >
            <Select placeholder="请选择策略">
              {strategies.map(strategy => (
                <Option key={strategy.id} value={strategy.id}>{strategy.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            label="回测时间范围"
            name="dateRange"
            rules={[{ required: true, message: '请选择回测时间范围' }]}
          >
            <RangePicker />
          </Form.Item>
          
          <Form.Item
            label="初始资金"
            name="initialCapital"
            rules={[{ required: true, message: '请输入初始资金' }]}
          >
            <InputNumber min={1000} max={1000000} defaultValue={100000} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={handleRunBacktest}
              loading={isRunning}
            >
              开始回测
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      {backtestResult && (
        <Card title="回测结果" style={{ marginBottom: 16 }}>
          <Tabs defaultActiveKey="summary">
            <TabPane tab="回测摘要" key="summary">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>总收益</p>
                  <p style={{ fontSize: 24, color: '#3f8600', fontWeight: 'bold' }}>
                    ${backtestResult.profit} ({backtestResult.profitPercent}%)
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>最大回撤</p>
                  <p style={{ fontSize: 24, color: '#cf1322', fontWeight: 'bold' }}>
                    {backtestResult.maxDrawdown}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>夏普比率</p>
                  <p style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                    {backtestResult.sharpeRatio}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>胜率</p>
                  <p style={{ fontSize: 24, color: '#722ed1', fontWeight: 'bold' }}>
                    {backtestResult.winRate}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>总交易次数</p>
                  <p style={{ fontSize: 24, color: '#fa8c16', fontWeight: 'bold' }}>
                    {backtestResult.totalTrades}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#666' }}>最终资金</p>
                  <p style={{ fontSize: 24, color: '#3f8600', fontWeight: 'bold' }}>
                    ${backtestResult.finalCapital}
                  </p>
                </div>
              </div>
            </TabPane>
            
            <TabPane tab="图表分析" key="charts">
              <div style={{ marginBottom: 16 }}>
                <ReactECharts option={getEquityCurveOption()} style={{ height: 400 }} />
              </div>
              <div>
                <ReactECharts option={getMonthlyReturnsOption()} style={{ height: 300 }} />
              </div>
            </TabPane>
            
            <TabPane tab="交易记录" key="trades">
              <Table columns={columns} dataSource={backtestResult.trades} pagination={false} />
            </TabPane>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default Backtest;