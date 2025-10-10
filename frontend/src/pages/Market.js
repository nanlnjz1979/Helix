import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Row, Col, Statistic, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;

const Market = () => {
  const [marketData, setMarketData] = useState([]);
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1d');
  
  // 模拟市场数据
  useEffect(() => {
    const mockData = [
      { key: '1', symbol: 'AAPL', name: '苹果', price: 182.63, change: 1.25, changePercent: 0.69 },
      { key: '2', symbol: 'MSFT', name: '微软', price: 332.42, change: -0.58, changePercent: -0.17 },
      { key: '3', symbol: 'GOOGL', name: '谷歌', price: 126.63, change: 2.15, changePercent: 1.73 },
      { key: '4', symbol: 'AMZN', name: '亚马逊', price: 131.85, change: 0.95, changePercent: 0.73 },
      { key: '5', symbol: 'TSLA', name: '特斯拉', price: 193.17, change: -2.83, changePercent: -1.44 },
      { key: '6', symbol: 'META', name: 'Meta', price: 326.49, change: 3.51, changePercent: 1.09 },
      { key: '7', symbol: 'NFLX', name: '奈飞', price: 617.52, change: 5.23, changePercent: 0.85 },
      { key: '8', symbol: 'NVDA', name: '英伟达', price: 924.79, change: 15.68, changePercent: 1.72 }
    ];
    
    setMarketData(mockData);
  }, []);
  
  const columns = [
    {
      title: '代码',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: '涨跌',
      dataIndex: 'change',
      key: 'change',
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d' }}>
          {text >= 0 ? '+' : ''}{text}
        </span>
      ),
    },
    {
      title: '涨跌幅',
      dataIndex: 'changePercent',
      key: 'changePercent',
      render: (text) => (
        <span style={{ color: text >= 0 ? '#52c41a' : '#f5222d' }}>
          {text >= 0 ? '+' : ''}{text}%
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => setSelectedStock(record.symbol)}>
          查看
        </Button>
      ),
    },
  ];
  
  // 生成K线图数据
  const getKLineOption = () => {
    // 模拟K线数据
    const dates = [];
    const data = [];
    
    const basePrice = selectedStock === 'AAPL' ? 180 : 
                      selectedStock === 'MSFT' ? 330 : 
                      selectedStock === 'GOOGL' ? 125 : 
                      selectedStock === 'AMZN' ? 130 : 
                      selectedStock === 'TSLA' ? 190 : 
                      selectedStock === 'META' ? 325 : 
                      selectedStock === 'NFLX' ? 615 : 920;
    
    const days = timeframe === '1d' ? 1 : 
                 timeframe === '1w' ? 7 : 
                 timeframe === '1m' ? 30 : 90;
    
    const dataPoints = timeframe === '1d' ? 24 : 
                       timeframe === '1w' ? 7 : 
                       timeframe === '1m' ? 30 : 90;
    
    const now = new Date();
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date();
      date.setDate(now.getDate() - (days - i * (days / dataPoints)));
      
      const dateStr = timeframe === '1d' ? 
                      `${date.getHours()}:00` : 
                      `${date.getMonth() + 1}/${date.getDate()}`;
      
      dates.push(dateStr);
      
      const open = basePrice * (1 + (Math.random() * 0.06 - 0.03));
      const close = open * (1 + (Math.random() * 0.04 - 0.02));
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      
      data.push([open, close, low, high]);
    }
    
    return {
      title: {
        text: `${selectedStock} K线图`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        scale: true
      },
      series: [
        {
          type: 'candlestick',
          data: data.map(item => [item[0], item[3], item[1], item[2]]),
          itemStyle: {
            color: '#ec0000',
            color0: '#00da3c',
            borderColor: '#8A0000',
            borderColor0: '#008F28'
          }
        }
      ]
    };
  };
  
  // 生成成交量图表
  const getVolumeOption = () => {
    const dates = [];
    const volumes = [];
    
    const baseVolume = selectedStock === 'AAPL' ? 5000000 : 
                       selectedStock === 'MSFT' ? 4000000 : 
                       selectedStock === 'GOOGL' ? 3000000 : 
                       selectedStock === 'AMZN' ? 3500000 : 
                       selectedStock === 'TSLA' ? 6000000 : 
                       selectedStock === 'META' ? 4500000 : 
                       selectedStock === 'NFLX' ? 2500000 : 7000000;
    
    const days = timeframe === '1d' ? 1 : 
                 timeframe === '1w' ? 7 : 
                 timeframe === '1m' ? 30 : 90;
    
    const dataPoints = timeframe === '1d' ? 24 : 
                       timeframe === '1w' ? 7 : 
                       timeframe === '1m' ? 30 : 90;
    
    const now = new Date();
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date();
      date.setDate(now.getDate() - (days - i * (days / dataPoints)));
      
      const dateStr = timeframe === '1d' ? 
                      `${date.getHours()}:00` : 
                      `${date.getMonth() + 1}/${date.getDate()}`;
      
      dates.push(dateStr);
      volumes.push(Math.floor(baseVolume * (0.7 + Math.random() * 0.6)));
    }
    
    return {
      title: {
        text: '成交量',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: volumes,
          type: 'bar'
        }
      ]
    };
  };
  
  // 确保selectedStockData始终是一个对象，即使在marketData加载完成前
  const selectedStockData = (marketData && marketData.find(item => item.symbol === selectedStock)) || {};
  
  return (
    <div>
      <h2>市场行情</h2>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title={`${selectedStockData.symbol || ''} - ${selectedStockData.name || ''}`}
              value={selectedStockData.price || 0}
              precision={2}
              valueStyle={{ color: (selectedStockData.change || 0) >= 0 ? '#3f8600' : '#cf1322' }}
              prefix="$"
              suffix={
                <span>
                  {(selectedStockData.change || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {(selectedStockData.changePercent || 0).toFixed(2)}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <span style={{ marginRight: 8 }}>选择股票:</span>
              <Select value={selectedStock} onChange={setSelectedStock} style={{ width: 120 }}>
                {marketData.map(stock => (
                  <Option key={stock.symbol} value={stock.symbol}>{stock.symbol}</Option>
                ))}
              </Select>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <span style={{ marginRight: 8 }}>时间周期:</span>
              <Select value={timeframe} onChange={setTimeframe} style={{ width: 120 }}>
                <Option value="1d">日内</Option>
                <Option value="1w">周线</Option>
                <Option value="1m">月线</Option>
                <Option value="3m">季线</Option>
              </Select>
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ReactECharts option={getKLineOption()} style={{ height: 400 }} />
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ReactECharts option={getVolumeOption()} style={{ height: 200 }} />
        </Col>
      </Row>
      
      <Card title="市场概览" style={{ marginTop: 16 }}>
        <Table columns={columns} dataSource={marketData} pagination={false} />
      </Card>
    </div>
  );
};

export default Market;