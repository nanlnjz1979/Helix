import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Select, DatePicker, Statistic } from 'antd';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState([null, null]);
  const [chartType, setChartType] = useState('user');
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [strategyActivityData, setStrategyActivityData] = useState([]);
  const [userSegmentData, setUserSegmentData] = useState([]);
  const [keyMetrics, setKeyMetrics] = useState({
    totalRevenue: 0,
    avgUserValue: 0,
    conversionRate: 0,
    retentionRate: 0
  });

  // 加载数据
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const response = await api.get('/admin/analytics', {
          params: {
            startDate: timeRange[0] ? timeRange[0].format('YYYY-MM-DD') : undefined,
            endDate: timeRange[1] ? timeRange[1].format('YYYY-MM-DD') : undefined
          }
        });

        // 由于可能没有实际API，使用模拟数据
        if (!response.data || Object.keys(response.data).length === 0) {
          setMockData();
        } else {
          setUserGrowthData(response.data.userGrowth || []);
          setStrategyActivityData(response.data.strategyActivity || []);
          setUserSegmentData(response.data.userSegment || []);
          setKeyMetrics(response.data.keyMetrics || {});
        }
      } catch (error) {
        console.error('获取分析数据失败:', error);
        // 在错误情况下也使用模拟数据
        setMockData();
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  // 设置模拟数据
  const setMockData = () => {
    // 用户增长数据
    const usersData = [
      { month: '1月', users: 10 },
      { month: '2月', users: 15 },
      { month: '3月', users: 25 },
      { month: '4月', users: 40 },
      { month: '5月', users: 60 },
      { month: '6月', users: 75 }
    ];
    setUserGrowthData(usersData);

    // 策略活动数据
    const strategyData = [
      { month: '1月', created: 5, backtested: 3, deployed: 2 },
      { month: '2月', created: 8, backtested: 5, deployed: 3 },
      { month: '3月', created: 12, backtested: 8, deployed: 5 },
      { month: '4月', created: 15, backtested: 10, deployed: 7 },
      { month: '5月', created: 20, backtested: 14, deployed: 10 },
      { month: '6月', created: 25, backtested: 18, deployed: 12 }
    ];
    setStrategyActivityData(strategyData);

    // 用户分段数据
    const segmentData = [
      { name: '高频交易者', value: 30 },
      { name: '长期投资者', value: 45 },
      { name: '策略开发者', value: 15 },
      { name: '初学者', value: 10 }
    ];
    setUserSegmentData(segmentData);

    // 关键指标
    const metrics = {
      totalRevenue: 150000,
      avgUserValue: 3000,
      conversionRate: 15,
      retentionRate: 78
    };
    setKeyMetrics(metrics);
  };

  // 用户增长图表配置
  const getUserGrowthOption = () => {
    return {
      title: {
        text: '用户增长趋势',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: userGrowthData.map(item => item.month)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: userGrowthData.map(item => item.users),
          type: 'line',
          smooth: true,
          lineStyle: {
            color: '#1890ff'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(24, 144, 255, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(24, 144, 255, 0.05)'
              }]
            }
          }
        }
      ]
    };
  };

  // 策略活动图表配置
  const getStrategyActivityOption = () => {
    return {
      title: {
        text: '策略活动分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['创建策略', '回测策略', '部署策略'],
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: strategyActivityData.map(item => item.month)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '创建策略',
          data: strategyActivityData.map(item => item.created),
          type: 'bar',
          color: '#1890ff'
        },
        {
          name: '回测策略',
          data: strategyActivityData.map(item => item.backtested),
          type: 'bar',
          color: '#52c41a'
        },
        {
          name: '部署策略',
          data: strategyActivityData.map(item => item.deployed),
          type: 'bar',
          color: '#faad14'
        }
      ]
    };
  };

  // 用户分段图表配置
  const getUserSegmentOption = () => {
    return {
      title: {
        text: '用户类型分布',
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
          name: '用户类型',
          type: 'pie',
          radius: '60%',
          data: userSegmentData,
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
      <Title level={4}>数据分析中心</Title>
      
      {/* 控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>图表类型：</span>
            <Select value={chartType} onChange={setChartType} style={{ width: 150 }}>
              <Option value="user">用户增长</Option>
              <Option value="strategy">策略活动</Option>
              <Option value="segment">用户分布</Option>
            </Select>
          </Col>
          <Col>
            <span style={{ marginRight: 8 }}>时间范围：</span>
            <RangePicker onChange={(dates) => setTimeRange(dates)} />
          </Col>
        </Row>
      </Card>

      {/* 关键指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
              value={keyMetrics.totalRevenue}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均用户价值"
              value={keyMetrics.avgUserValue}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="转化率"
              value={keyMetrics.conversionRate}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="留存率"
              value={keyMetrics.retentionRate}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要图表区域 */}
      <Card>
        <Row gutter={16}>
          <Col span={24}>
            {chartType === 'user' && (
              <ReactECharts option={getUserGrowthOption()} style={{ height: 400 }} />
            )}
            {chartType === 'strategy' && (
              <ReactECharts option={getStrategyActivityOption()} style={{ height: 400 }} />
            )}
            {chartType === 'segment' && (
              <ReactECharts option={getUserSegmentOption()} style={{ height: 400 }} />
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AdminAnalytics;