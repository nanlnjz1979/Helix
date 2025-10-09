import React from 'react';
import { Row, Col, Card, Statistic, Table } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useSelector } from 'react-redux';

const Dashboard = () => {
  const { 
    accountBalance, 
    profit, 
    profitPercent, 
    positions, 
    tradingHistory 
  } = useSelector(state => state.trading);
  const { strategies } = useSelector(state => state.strategy);

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
  ];

  const getOption = () => {
    return {
      title: {
        text: '账户资产走势'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['5/26', '5/27', '5/28', '5/29', '5/30', '5/31', '6/1', '6/2']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: [95000, 96200, 97500, 98100, 99300, 101200, 102500, 105600],
          type: 'line',
          smooth: true
        }
      ]
    };
  };

  const getPieOption = () => {
    return {
      title: {
        text: '资产配置',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '资产配置',
          type: 'pie',
          radius: '50%',
          data: [
            { value: 60000, name: '现金' },
            { value: 18000, name: 'AAPL' },
            { value: 16500, name: 'MSFT' },
            { value: 11100, name: 'GOOGL' }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  };

  return (
    <div>
      <h2>交易仪表盘</h2>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="账户余额"
              value={accountBalance}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总收益"
              value={profit}
              precision={2}
              valueStyle={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}
              prefix="$"
              suffix={
                <span>
                  {profitPercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {profitPercent}%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="持仓数量"
              value={positions}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="策略数量"
              value={strategies.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <ReactECharts option={getOption()} style={{ height: 400 }} />
        </Col>
        <Col span={8}>
          <ReactECharts option={getPieOption()} style={{ height: 400 }} />
        </Col>
      </Row>
      
      <Card title="最近交易" style={{ marginTop: 16 }}>
        <Table columns={columns} dataSource={tradingHistory.slice(0, 10)} pagination={false} />
      </Card>
    </div>
  );
};

export default Dashboard;