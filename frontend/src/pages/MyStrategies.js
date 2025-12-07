import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, message } from 'antd';
import { LineChartOutlined, BarChartOutlined, TrophyOutlined, ArrowUpOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const MyStrategies = () => {
  const [strategies, setStrategies] = useState([]);
  const navigate = useNavigate();

  // 获取用户的策略列表
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await api.get('/strategies');
        const list = Array.isArray(response?.data) ? response.data : [];
        setStrategies(list);
      } catch (error) {
        console.error('获取策略列表失败:', error);
        message.error(`获取策略列表失败: ${error?.response?.data?.message || error.message}`);
        setStrategies([]);
      }
    };
    fetchStrategies();
  }, []);

  // 运行回测
  const handleRunBacktest = (strategyId) => {
    navigate(`/strategy/backtest/${strategyId}`, { state: { fromRunBacktest: true } });
  };

  // 获取策略图标
  const getStrategyIcon = (strategyType) => {
    const iconMap = {
      'movingAverage': <LineChartOutlined />,
      'multiFactor': <BarChartOutlined />,
      'meanReversion': <ArrowUpOutlined />,
      'eventDriven': <TrophyOutlined />
    };
    return iconMap[strategyType] || <LineChartOutlined />;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>我的策略</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/strategy/create')}>
          新建策略
        </Button>
      </div>
      
      <Row gutter={[24, 24]} align="stretch">
        {strategies.slice(0, 9).map(strategy => {
          // 从回测结果中提取关键指标
          const backtestResults = strategy.backtestResults || {};
          const returnsAnalyzer = backtestResults?.data?.returns_analyzer || backtestResults?.data?.return_analyzer || {};
          const drawdownAnalyzer = backtestResults?.data?.drawdown_analyzer || {};
          
          // 计算各项指标
          const backtestReturn = returnsAnalyzer?.rtot ? (returnsAnalyzer.rtot * 100).toFixed(1) : '0.0';
          const maxDrawdown = drawdownAnalyzer?.max ? (drawdownAnalyzer.max.drawdown * 100).toFixed(1) : '0.0';
          const annualized = returnsAnalyzer?.annualized || '0.0';
          
          // 格式化日期
          const formatDate = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN');
          };
          
          return (
            <Col xs={24} sm={12} lg={8} key={strategy._id || strategy.id}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  {/* 卡片名称行，带浅蓝色背景 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#e6f7ff',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 12
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      fontSize: 16,
                      color: '#1890ff',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {getStrategyIcon(strategy.type)}
                    </div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 16, 
                      lineHeight: 1.5, 
                      fontWeight: 600,
                      flex: 1
                    }}>{strategy.name}</h3>
                  </div>
                  
                  {/* 策略描述 */}
                  <p style={{ 
                    margin: 0, 
                    color: '#666', 
                    fontSize: 14, 
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '6em' // 四行高度，包含行间距
                  }}>{strategy.description}</p>
                </div>
                
                <div style={{ margin: '16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>回测收益</span>
                      <p style={{ margin: 0, color: backtestReturn >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold', fontSize: 18 }}>
                        {backtestReturn >= 0 ? '+' : ''}{backtestReturn}%
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>最大回撤</span>
                      <p style={{ margin: 0, color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>
                        {maxDrawdown}%
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>年化收益</span>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: 18 }}>
                        {annualized}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>上次回测</span>
                      <p style={{ margin: 0, fontWeight: '500', fontSize: 14 }}>
                        {formatDate(strategy.lastBacktestAt)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>创建时间</span>
                      <p style={{ margin: 0, fontWeight: '500', fontSize: 14 }}>
                        {formatDate(strategy.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ color: '#666', fontSize: 12 }}>状态</span>
                      <p style={{ margin: 0, fontWeight: '500', fontSize: 14, color: strategy.status === '已启用' ? '#52c41a' : '#faad14' }}>
                        {strategy.status}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
                  <Button 
                    type="primary" 
                    onClick={() => handleRunBacktest(strategy._id || strategy.id)}
                    style={{
                      borderRadius: 20,
                      padding: '8px 24px',
                      fontSize: 14,
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                      transition: 'all 0.3s ease',
                      border: 'none',
                      background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.3)';
                    }}
                  >
                    运行回测
                  </Button>
                  <Button 
                    type="default" 
                    onClick={() => navigate(`/strategy/backtest/${strategy._id || strategy.id}`)}
                    style={{
                      borderRadius: 20,
                      padding: '8px 24px',
                      fontSize: 14,
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      border: '1px solid #d9d9d9',
                      background: '#fff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    查看策略
                  </Button>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default MyStrategies;