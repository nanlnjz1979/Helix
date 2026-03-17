import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Table, message, Button, Row, Col, Switch, Tag, Radio } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, PlayCircleOutlined, StopOutlined, SaveOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import Editor from '@monaco-editor/react';

const { TabPane } = Tabs;

const BacktestResult = () => {
  const { strategyId } = useParams();
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tradeTableContainerRef = useRef(null);
  const [tradeScrollY, setTradeScrollY] = useState(0);
  
  // 编译相关状态
  const [compiling, setCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState('idle'); // idle | running | success | error
  const [compileLogs, setCompileLogs] = useState([]);
  const [compileArtifact, setCompileArtifact] = useState(null);
  const compileSourceRef = useRef(null);
  
  // 回测相关状态
  const [backtesting, setBacktesting] = useState(false);
  const [backtestStatus, setBacktestStatus] = useState('idle'); // idle | running | success | error
  const [backtestLogs, setBacktestLogs] = useState([]);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [savingResult, setSavingResult] = useState(false); // 保存结果的状态
  const [activeTabKey, setActiveTabKey] = useState(null); // 控制当前激活的选项卡
  const backtestSourceRef = useRef(null);
  
  // 虚拟实盘相关状态
  const [simulatorRunning, setSimulatorRunning] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState('idle'); // idle | running | success | error
  const [simulatorLogs, setSimulatorLogs] = useState([]);
  const [autoOrder, setAutoOrder] = useState(false);
  const [realTimeMonitor, setRealTimeMonitor] = useState(true);
  const [riskControl, setRiskControl] = useState(true);
  const [maxDrawdown, setMaxDrawdown] = useState(10);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const simulatorSourceRef = useRef(null);
  
  // 账户信息状态
  const [accounts, setAccounts] = useState([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  
  // 保存策略代码
  const saveStrategyCode = async () => {
    try {
      setSavingResult(true);
      await api.put(`/strategies/${strategyId}`, {
        code: strategy.code
      });
      message.success('策略代码保存成功');
    } catch (error) {
      message.error('策略代码保存失败: ' + (error.response?.data?.message || error.message));
      console.error('保存策略代码失败:', error);
    } finally {
      setSavingResult(false);
    }
  };
  
  // 虚拟实盘切换处理函数
  const handleSimulatorToggle = async (start) => {
    try {
      // 1. 先更新本地状态，提高用户体验
      setSimulatorRunning(start);
      
      if (start) {
        // 启动虚拟实盘
        setSimulatorStatus('success');
        setSimulatorLogs(['虚拟实盘已启用']);
      } else {
        // 停止虚拟实盘
        setSimulatorStatus('idle');
        setSimulatorLogs(['虚拟实盘已禁用']);
      }
      
      // 2. 再更新策略的status字段
      await api.put(`/strategies/${strategyId}`, {
        status: start ? '已启用' : '未启用'
      });
      
      // 3. 只在必要时更新账户信息，避免完整页面刷新
      if (start) {
        fetchAccounts();
      } else {
        setAccounts([]);
      }
      
      // 4. 更新策略的状态字段，避免调用完整的fetchStrategy
      setStrategy(prevStrategy => ({
        ...prevStrategy,
        status: start ? '已启用' : '未启用'
      }));
      
    } catch (error) {
      // 恢复之前的状态
      setSimulatorRunning(!start);
      setSimulatorStatus('error');
      setSimulatorLogs(prev => [`虚拟实盘操作失败: ${error.response?.data?.message || error.message}`, ...prev]);
      message.error(`虚拟实盘操作失败: ${error.response?.data?.message || error.message}`);
      // 失败时重新获取最新数据
      fetchStrategy();
    }
  };

  // 启动编译
  const startCompile = () => {
    try {
      setCompiling(true);
      setCompileStatus('running');
      setCompileLogs(['开始编译...']);
      
      // 构建SSE连接URL
      const compileUrl = `http://localhost:5000/api/strategies/${strategyId}/compile`;
      const token = localStorage.getItem('token');
      const fullUrl = `${compileUrl}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      
      // 创建EventSource连接
      const es = new EventSource(fullUrl);
      compileSourceRef.current = es;
      
      // 监听编译日志
      es.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.message) {
            setCompileLogs(prev => [data.message, ...prev]);
          }
        } catch (parseError) {
          // 直接作为字符串处理
          setCompileLogs(prev => [e.data, ...prev]);
        }
      });
      
      // 监听编译结果
      es.addEventListener('done', (e) => {
        try {
          const final = JSON.parse(e.data);
          setCompiling(false);
          
          if (final.status === 'success') {
            setCompileStatus('success');
            setCompileLogs(prev => ['编译成功', ...prev]);
            if (final.artifact) {
              setCompileArtifact(final.artifact);
            }
          } else {
            setCompileStatus('error');
            setCompileLogs(prev => [`编译失败: ${final.message || '未知错误'}`, ...prev]);
          }
        } catch (parseError) {
          setCompiling(false);
          setCompileStatus('error');
          setCompileLogs(prev => ['编译结果解析失败', ...prev]);
        }
        
        es.close();
        compileSourceRef.current = null;
      });
      
      // 监听错误
      es.onerror = () => {
        setCompiling(false);
        setCompileStatus('error');
        setCompileLogs(prev => ['编译连接或服务错误', ...prev]);
        es.close();
        compileSourceRef.current = null;
      };
    } catch (error) {
      setCompiling(false);
      setCompileStatus('error');
      setCompileLogs(prev => [`无法启动编译: ${error.message}`, ...prev]);
    }
  };
  
  // 停止编译
  const stopCompile = () => {
    const es = compileSourceRef.current;
    if (es) {
      es.close();
      compileSourceRef.current = null;
      setCompiling(false);
      setCompileStatus('idle');
      setCompileLogs(prev => ['已停止编译', ...prev]);
    }
  };
  
  // 启动回测
  const startBacktest = async () => {
    try {
      setBacktesting(true);
      setBacktestStatus('running');
      setBacktestLogs(['开始回测...']);
      setBacktestProgress(0);
      
      // 1. 先发送POST请求启动回测，获取jobId
      setBacktestLogs(prev => ['正在启动回测任务...', ...prev]);
      const runResponse = await api.post('/backtest/run', { 
        strategyId: strategyId,
        // 这里可以添加回测参数，如果需要的话
        parameters: strategy.parameters || {} 
      });
      
      const jobId = runResponse.data.jobId;
      if (!jobId) {
        throw new Error('未获取到回测任务ID');
      }
      
      setBacktestLogs(prev => [`回测任务已启动，任务ID: ${jobId}`, ...prev]);
      
      // 2. 构建SSE连接URL
      const streamUrl = `http://localhost:5000/api/backtest/stream/${jobId}`;
      const token = localStorage.getItem('token');
      const fullUrl = `${streamUrl}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      
      // 3. 创建EventSource连接
      const es = new EventSource(fullUrl);
      backtestSourceRef.current = es;
      
      // 4. 监听SSE事件
      es.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.message) {
            // 处理普通消息
            setBacktestLogs(prev => [data.message, ...prev]);
          }
        } catch (parseError) {
          // 直接作为字符串处理
          setBacktestLogs(prev => [e.data, ...prev]);
        }
      });
      
      es.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data);
          setBacktestProgress(Math.min(100, Math.max(0, data.progress || 0)));
          // 显示进度更新
          setBacktestLogs(prev => [`进度更新: ${data.progress || 0}%${data.hint ? ` - ${data.hint}` : ''}`, ...prev]);
          // 显示进度事件中的任何其他输出
          if (data.output) {
            setBacktestLogs(prev => [data.output, ...prev]);
          }
        } catch (parseError) {
          // 直接作为字符串处理
          setBacktestLogs(prev => [`进度事件: ${e.data}`, ...prev]);
        }
      });
      
      es.addEventListener('logs', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.logs && Array.isArray(data.logs)) {
            // 处理多条日志 - 注意：多条日志要倒序添加，确保最新的在最前面
            const reversedLogs = [...data.logs].reverse();
            setBacktestLogs(prev => [...reversedLogs, ...prev]);
          } else if (data.log) {
            // 处理单条日志
            setBacktestLogs(prev => [data.log, ...prev]);
          } else if (data.output) {
            // 处理程序输出
            setBacktestLogs(prev => [data.output, ...prev]);
          } else if (typeof data === 'string') {
            // 直接作为字符串处理
            setBacktestLogs(prev => [data, ...prev]);
          } else {
            // 处理其他类型的日志数据
            setBacktestLogs(prev => [JSON.stringify(data), ...prev]);
          }
        } catch (parseError) {
          // 直接作为字符串处理，兼容不同编码
          setBacktestLogs(prev => [e.data, ...prev]);
        }
      });
      
      // 监听程序输出事件
      es.addEventListener('output', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.output) {
            // 处理程序输出
            setBacktestLogs(prev => [data.output, ...prev]);
          } else if (data) {
            // 处理其他类型的输出数据
            setBacktestLogs(prev => [typeof data === 'string' ? data : JSON.stringify(data), ...prev]);
          }
        } catch (parseError) {
          // 直接作为字符串处理
          setBacktestLogs(prev => [e.data, ...prev]);
        }
      });
      
      es.addEventListener('result', (e) => {
        try {
          const data = JSON.parse(e.data);
          setBacktesting(false);
          setBacktestStatus('success');
          setBacktestProgress(100);
          setBacktestLogs(prev => ['回测成功，正在处理结果...', ...prev]);
          // 显示回测结果中的任何输出
          if (data.output) {
            setBacktestLogs(prev => [data.output, ...prev]);
          }
          // 直接更新策略的回测结果，避免重新获取整个策略数据导致界面刷新
          setStrategy(prevStrategy => ({
            ...prevStrategy,
            backtestResults: data.result || data, // 根据实际回测结果数据结构调整
            lastBacktestAt: new Date().toISOString()
          }));
        } catch (parseError) {
          setBacktesting(false);
          setBacktestStatus('error');
          setBacktestLogs(prev => [`回测结果解析失败: ${e.data}`, ...prev]);
        }
        
        es.close();
        backtestSourceRef.current = null;
      });
      
      es.addEventListener('error', (e) => {
        try {
          const data = JSON.parse(e.data);
          setBacktesting(false);
          setBacktestStatus('error');
          // 显示错误信息
          setBacktestLogs(prev => [`回测失败: ${data.error || '未知错误'}`, ...prev]);
          // 显示错误输出
          if (data.output) {
            setBacktestLogs(prev => [data.output, ...prev]);
          }
        } catch (parseError) {
          setBacktesting(false);
          setBacktestStatus('error');
          setBacktestLogs(prev => [`回测错误: ${e.data || '未知错误'}`, ...prev]);
        }
        
        es.close();
        backtestSourceRef.current = null;
      });
      
      // 监听连接错误
      es.onerror = () => {
        setBacktesting(false);
        setBacktestStatus('error');
        setBacktestLogs(prev => ['回测连接或服务错误', ...prev]);
        es.close();
        backtestSourceRef.current = null;
      };
    } catch (error) {
      setBacktesting(false);
      setBacktestStatus('error');
      setBacktestLogs(prev => [`无法启动回测: ${error.message}`, ...prev]);
    }
  };
  
  // Fetch strategy data with backtest results
  const fetchStrategy = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/strategies/${strategyId}`);
      if (response?.data) {
        setStrategy(response.data);
      } else {
        throw new Error('策略数据不存在');
      }
    } catch (err) {
      console.error('获取策略数据失败:', err);
      setError(err?.response?.data?.message || err.message || '获取策略数据失败');
      message.error(err?.response?.data?.message || err.message || '获取策略数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始化activeTabKey - 只在首次加载时设置，避免回测完成后自动切换
    if (location.state?.fromRunBacktest) {
      setActiveTabKey('code');
    } else if (strategy?.backtestResults && !activeTabKey) {
      // 只有在首次加载且有回测结果时，默认显示回测结果
      setActiveTabKey('result');
    } else if (!activeTabKey) {
      setActiveTabKey('code');
    }
  }, [location.state, strategy, activeTabKey]);
  
  useEffect(() => {
    if (strategyId) {
      fetchStrategy();
    }
  }, [strategyId]);

  // 获取策略的账户信息
  const fetchAccounts = async () => {
    try {
      setFetchingAccounts(true);
      const response = await api.get(`/simulator/account`, {
        params: {
          strategyId: strategyId
        }
      });
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('获取账户信息失败:', error);
      setAccounts([]);
    } finally {
      setFetchingAccounts(false);
    }
  };

  // 当策略数据更新时，同步虚拟实盘状态并获取账户信息
  useEffect(() => {
    if (strategy) {
      // 根据策略的status字段更新simulatorRunning状态
      setSimulatorRunning(strategy.status === '已启用');
      
      // 如果策略已启用，获取账户信息
      if (strategy.status === '已启用') {
        fetchAccounts();
      } else {
        // 否则清空账户信息
        setAccounts([]);
      }
    }
  }, [strategy]);

  // 当开关状态变化时，重新获取账户信息
  useEffect(() => {
    if (simulatorRunning) {
      fetchAccounts();
    }
  }, [simulatorRunning]);
  
  // 处理选项卡切换事件
  const handleTabChange = (key) => {
    setActiveTabKey(key);
  };

  // 停止回测
  const stopBacktest = () => {
    const es = backtestSourceRef.current;
    if (es) {
      es.close();
      backtestSourceRef.current = null;
      setBacktesting(false);
      setBacktestStatus('idle');
      setBacktestLogs(prev => ['已停止回测', ...prev]);
    }
  };
  
  // 启动虚拟实盘
  const handleStartSimulator = async () => {
    try {
      setSimulatorStatus('running');
      setSimulatorLogs(prev => ['正在启动虚拟实盘...', ...prev]);
      
      // 模拟启动成功，直接更新本地状态
      // 后端缺少对应的API端点，暂时注释掉
      // await api.post('/simulator/start', {
      //   strategyId: strategyId,
      //   autoOrder: autoOrder,
      //   realTimeMonitor: realTimeMonitor,
      //   riskControl: riskControl,
      //   maxDrawdown: maxDrawdown,
      //   maxDailyLoss: maxDailyLoss
      // });
      
      // 更新策略的运行状态
      setStrategy(prevStrategy => ({
        ...prevStrategy,
        runningStatus: 'running'
      }));
      
      setSimulatorStatus('success');
      setSimulatorLogs(prev => ['虚拟实盘启动成功', ...prev]);
    } catch (error) {
      console.error('启动虚拟实盘失败:', error);
      setSimulatorStatus('error');
      setSimulatorLogs(prev => [`虚拟实盘启动失败: ${error.response?.data?.message || error.message}`, ...prev]);
      message.error(`虚拟实盘启动失败: ${error.response?.data?.message || error.message}`);
      // 保持虚拟实盘启用状态，但运行状态设为错误
      setStrategy(prevStrategy => ({
        ...prevStrategy,
        runningStatus: 'error'
      }));
    }
  };
  
  // 强制停止虚拟实盘
  const handleForceStopSimulator = async () => {
    try {
      setSimulatorStatus('running');
      setSimulatorLogs(prev => ['正在强制停止虚拟实盘...', ...prev]);
      
      // 模拟停止成功，直接更新本地状态
      // 后端缺少对应的API端点，暂时注释掉
      // await api.post('/simulator/stop', {
      //   strategyId: strategyId
      // });
      
      // 更新策略的运行状态
      setStrategy(prevStrategy => ({
        ...prevStrategy,
        runningStatus: 'stopped'
      }));
      
      setSimulatorStatus('idle');
      setSimulatorLogs(prev => ['虚拟实盘已强制停止', ...prev]);
      message.success('虚拟实盘已强制停止');
    } catch (error) {
      console.error('强制停止虚拟实盘失败:', error);
      setSimulatorStatus('error');
      setSimulatorLogs(prev => [`虚拟实盘停止失败: ${error.response?.data?.message || error.message}`, ...prev]);
      message.error(`虚拟实盘停止失败: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // 保存回测结果
  const saveBacktestResult = async () => {
    try {
      setSavingResult(true);
      setBacktestLogs(prev => ['正在保存回测结果...', ...prev]);
      
      // 调用保存回测结果的API
      const response = await api.post(`/backtest/save-results/${strategyId}`, {
        results: strategy.backtestResults
      });
      
      if (response.status === 200) {
        setBacktestLogs(prev => ['回测结果保存成功', ...prev]);
        message.success('回测结果保存成功');
        // 重新获取策略数据，更新保存状态
        fetchStrategy();
      } else {
        throw new Error('保存回测结果失败');
      }
    } catch (error) {
      setBacktestLogs(prev => [`保存回测结果失败: ${error.message}`, ...prev]);
      message.error(`保存回测结果失败: ${error.message}`);
    } finally {
      setSavingResult(false);
    }
  };

  // Calculate trade table scroll height
  useEffect(() => {
    const computeScrollY = () => {
      try {
        const el = tradeTableContainerRef.current;
        if (!el) return;
        const total = el.clientHeight || 0;
        if (!total) return;
        const thead = el.querySelector('.ant-table-thead');
        const headerH = (thead && thead.clientHeight) ? thead.clientHeight : 0;
        const available = Math.max(0, total - headerH);
        if (available && available !== tradeScrollY) {
          setTradeScrollY(available);
        }
      } catch {}
    };
    const t = setTimeout(computeScrollY, 200);
    const onResize = () => computeScrollY();
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [tradeScrollY]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px 0' }}>加载中...</div>;
  }

  if (error || !strategy) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: '#f5222d', marginBottom: 20 }}>{error || '策略不存在'}</p>
        <Button type="primary" onClick={() => navigate('/my-strategies')}>
          返回我的策略
        </Button>
      </div>
    );
  }

  // 提取回测结果数据 - 移到useEffect之前
  const jsonResult = strategy.backtestResults;

  // 计算每个股票的盈亏
  const trades = Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades : [];
  const stockProfitMap = new Map();
  
  trades.forEach(trade => {
    const symbol = trade.symbol;
    const type = (trade.type || '').toLowerCase();
    const value = parseFloat(trade.value) || 0;
    const commission = parseFloat(trade.commission || 0);
    
    if (!stockProfitMap.has(symbol)) {
      stockProfitMap.set(symbol, { symbol, profit: 0, buyValue: 0, sellValue: 0, buyCommissions: 0, sellCommissions: 0 });
    }
    
    const stockData = stockProfitMap.get(symbol);
    if (type === 'buy') {
      stockData.buyValue += value;
      stockData.buyCommissions += commission;
    } else if (type === 'sell') {
      stockData.sellValue += value;
      stockData.sellCommissions += commission;
    }
    // 计算盈亏：(卖出总额 - 卖出佣金) - (买入总额 + 买入佣金)
    stockData.profit = (stockData.sellValue - stockData.sellCommissions) - (stockData.buyValue + stockData.buyCommissions);
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button type="primary" onClick={() => navigate('/my-strategies')} style={{ marginRight: 12 }}>
          返回我的策略
        </Button>
        <Button type="primary" onClick={() => navigate('/backtest', { state: { strategyId } })}>
          重新运行回测
        </Button>
      </div>

      <Tabs activeKey={activeTabKey} onChange={handleTabChange}>
        <TabPane tab="策略代码" key="code">
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <Card 
                title="策略代码" 
                style={{ marginBottom: 16 }}
                extra={
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    onClick={() => saveStrategyCode()}
                  >
                    保存代码
                  </Button>
                }
              >
                <Editor
                  height="calc(100vh - 240px)"
                  defaultLanguage="python"
                  value={strategy.code || '// 策略代码为空'}
                  onChange={(value) => setStrategy(prev => ({ ...prev, code: value }))}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                    autoIndent: 'full',
                    tabSize: 4,
                    autoClosingBrackets: 'always',
                    formatOnType: true,
                    formatOnPaste: true,
                    quickSuggestions: {
                      other: true,
                      comments: true,
                      strings: true
                    },
                    suggestOnTriggerCharacters: true,
                    semanticHighlighting: true,
                    syntaxHighlighting: true,
                    theme: 'vs-dark'
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="策略基本信息" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col xs={24}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                      <p style={{ color: '#666', marginRight: 8 }}>策略名称：</p>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>{strategy.name || '未命名'}</p>
                    </div>
                  </Col>
                  <Col xs={24}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                      <p style={{ color: '#666', marginRight: 8 }}>策略类型：</p>
                      <p style={{ margin: 0 }}>{strategy.type || '未知'}</p>
                    </div>
                  </Col>
                  <Col xs={24}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                      <p style={{ color: '#666', marginRight: 8 }}>策略ID：</p>
                      <p style={{ margin: 0 }}>{strategy._id || strategy.id || '未知'}</p>
                    </div>
                  </Col>
                </Row>
              </Card>
              <Card title="操作" style={{ marginBottom: 16 }}>
                <Tabs defaultActiveKey="compile">
                  <TabPane tab="编译策略" key="compile">
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button type="primary" shape="circle" size="large" icon={<PlayCircleOutlined />} onClick={startCompile} disabled={compiling}>
                          </Button>
                          <Button danger shape="circle" size="large" icon={<StopOutlined />} onClick={stopCompile} disabled={!compiling}>
                          </Button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {compileStatus === 'running' && <span style={{ color: '#1890ff' }}>编译中</span>}
                          {compileStatus === 'success' && <span style={{ color: '#52c41a' }}>编译成功</span>}
                          {compileStatus === 'error' && <span style={{ color: '#ff4d4f' }}>编译失败</span>}
                          {compileStatus === 'idle' && <span style={{ color: '#888' }}>未开始</span>}
                        </div>
                      </div>
                      
                      <Card title="编译日志" style={{ marginBottom: 16 }}>
                        <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                          {compileLogs.length > 0 ? compileLogs.join('\n') : '暂无日志'}
                        </pre>
                      </Card>
                      
                      <Card title="编译产物">
                        {compileArtifact ? (
                          <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                            {JSON.stringify(compileArtifact, null, 2)}
                          </pre>
                        ) : (
                          <div style={{ color: '#888' }}>暂无产物（编译成功后显示）</div>
                        )}
                      </Card>
                    </div>
                  </TabPane>
                  <TabPane tab="运行回测" key="run">
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button type="primary" danger shape="circle" size="large" icon={<PlayCircleOutlined />} onClick={startBacktest} disabled={backtesting}>
                          </Button>
                          <Button danger shape="circle" size="large" icon={<StopOutlined />} onClick={stopBacktest} disabled={!backtesting}>
                          </Button>
                          {/* 保存回测结果按钮 - 圆形样式 */}
                          {backtestStatus === 'success' && strategy.backtestResults && (
                            <Button 
                              type="primary" 
                              shape="circle" 
                              size="large" 
                              icon={<SaveOutlined />} 
                              onClick={saveBacktestResult} 
                              disabled={savingResult}
                              loading={savingResult}
                              title="保存回测结果"
                            >
                            </Button>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {backtestStatus === 'running' && <span style={{ color: '#1890ff' }}>回测中</span>}
                          {backtestStatus === 'success' && <span style={{ color: '#52c41a' }}>回测成功</span>}
                          {backtestStatus === 'error' && <span style={{ color: '#ff4d4f' }}>回测失败</span>}
                          {backtestStatus === 'idle' && <span style={{ color: '#888' }}>未开始</span>}
                        </div>
                      </div>
                      
                      {/* 回测进度条 */}
                      {backtestStatus === 'running' && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#666' }}>回测进度</span>
                            <span style={{ color: '#1890ff' }}>{backtestProgress}%</span>
                          </div>
                          <div style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                backgroundColor: '#1890ff', 
                                width: `${backtestProgress}%`,
                                transition: 'width 0.3s ease'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* 回测日志 */}
                      <Card title="回测日志" style={{ marginBottom: 16 }}>
                        <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}>
                          {backtestLogs.length > 0 ? backtestLogs.join('\n') : '暂无日志'}
                        </pre>
                      </Card>
                      
                      
                    </div>
                  </TabPane>
                  <TabPane tab="虚拟实盘" key="simulator">
                    <div style={{ marginBottom: 16 }}>
                      {/* 虚拟实盘状态卡片 */}
                      <div style={{ 
                        marginBottom: 20, 
                        padding: 16, 
                        backgroundColor: '#ffffff', 
                        borderRadius: 8, 
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        gap: 16
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 14, 
                            fontWeight: 500, 
                            color: '#333333',
                            minWidth: 100
                          }}>虚拟实盘状态:</span>
                          <Switch
                              checked={simulatorRunning}
                              onChange={(checked) => handleSimulatorToggle(checked)}
                              checkedChildren="实盘"
                              unCheckedChildren="禁用"
                            />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 14, 
                            fontWeight: 500, 
                            color: '#333333',
                            minWidth: 100
                          }}>启动方式:</span>
                          <Switch
                            checked={strategy?.startMode === 'auto' || false}
                            onChange={async (checked) => {
                              try {
                                const newMode = checked ? 'auto' : 'manual';
                                await api.put(`/strategies/${strategyId}`, { startMode: newMode });
                                // 立即更新本地状态，提高用户体验
                                setStrategy(prev => ({ ...prev, startMode: newMode }));
                                message.success(`启动方式已设置为${newMode === 'auto' ? '自动' : '手动'}`);
                              } catch (error) {
                                console.error('设置启动方式失败:', error);
                                message.error('设置启动方式失败');
                                // 失败时重新获取最新数据
                                fetchStrategy();
                              }
                            }}
                            checkedChildren={<span>自动</span>}
                            unCheckedChildren={<span>手动</span>}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 14, 
                            fontWeight: 500, 
                            color: '#333333',
                            minWidth: 100
                          }}>运行状态:</span>
                          {/* 运行状态开关 - 与启动方式保持一致的Switch样式 */}
                          {simulatorRunning && (
                            <Switch
                              checked={strategy?.runningStatus === 'running'}
                              onChange={async (checked) => {
                                if (checked) {
                                  try {
                                    await handleStartSimulator();
                                    // 发送策略到实盘
                                    await api.post(`/strategies/${strategyId}/send-to-live`);
                                    message.success('策略代码已成功发送到实盘Redis地址');
                                  } catch (error) {
                                    message.error('发送策略代码到实盘Redis地址失败: ' + (error.response?.data?.message || error.message));
                                  }
                                } else {
                                  await handleForceStopSimulator();
                                }
                              }}
                              checkedChildren="运行中"
                              unCheckedChildren="已停止"
                            />
                          )}
                          {/* 错误状态提示 */}
                          {simulatorRunning && strategy?.runningStatus === 'error' && (
                            <span style={{
                              marginLeft: 8,
                              color: '#ff4d4f',
                              fontSize: 12
                            }}>
                              运行错误
                            </span>
                          )}
                        </div>
                      </div>
                       
                      {/* 账户信息卡片 - 仅在策略启用时显示 */}
                      {simulatorRunning && (
                        <Card 
                          title="账户信息" 
                          style={{ 
                            marginBottom: 20, 
                            borderRadius: 8, 
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)' 
                          }}
                          headStyle={{ 
                            backgroundColor: '#ffffff', 
                            fontSize: 14,
                            fontWeight: 500,
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          {fetchingAccounts ? (
                            <div style={{ textAlign: 'center', padding: 24 }}>
                              <span>加载账户信息中...</span>
                            </div>
                          ) : accounts.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                                  <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#333' }}>网关名称</th>
                                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#333' }}>总资产</th>
                                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#333' }}>可用资金</th>
                                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#333' }}>冻结资金</th>
                                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#333' }}>状态</th>
                                </tr>
                              </thead>
                              <tbody>
                                {accounts.map((account, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{account.gatewayName}</td>
                                    <td style={{ padding: 12, textAlign: 'right', fontSize: 13, color: '#333' }}>{account.balance?.toFixed(2) || '0.00'}</td>
                                    <td style={{ padding: 12, textAlign: 'right', fontSize: 13, color: '#333' }}>{account.available?.toFixed(2) || '0.00'}</td>
                                    <td style={{ padding: 12, textAlign: 'right', fontSize: 13, color: '#333' }}>{account.frozen?.toFixed(2) || '0.00'}</td>
                                    <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>
                                      <Tag 
                                        color={account.status === 'ACTIVE' ? 'green' : 
                                               account.status === 'FROZEN' ? 'yellow' : 
                                               account.status === 'CLOSED' ? 'red' : 'gray'}
                                      >
                                        {account.status === 'ACTIVE' && '活跃'}
                                        {account.status === 'FROZEN' && '冻结'}
                                        {account.status === 'CLOSED' && '关闭'}
                                        {account.status === 'KILLPOS' && '强平'}
                                        {!account.status && '未知'}
                                      </Tag>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ 
                              textAlign: 'center', 
                              color: '#8c8c8c', 
                              padding: 24 
                            }}>
                              <p style={{ margin: 0, fontSize: 14 }}>暂无账户信息</p>
                            </div>
                          )}
                        </Card>
                      )}
                       

                      

                    </div>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="回测结果" key="result">
          {jsonResult ? (
            <>
              <Card title={`策略类型：${jsonResult?.strategy_type || '未知'}`} style={{ marginBottom: 16 }}>
                <div style={{ color: '#666' }}>回测完成时间：{strategy.lastBacktestAt ? new Date(strategy.lastBacktestAt).toLocaleString() : '未知'}</div>
              </Card>
              
              {/* 指标汇总卡片 */}
              <Card title="回测指标汇总" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col xs={24} sm={12} lg={8}>
                    <div>
                      <p style={{ color: '#666' }}>总收益</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18, color: '#52c41a' }}>
                        {(jsonResult?.data?.returns_analyzer?.rtot * 100 || jsonResult?.data?.return_analyzer?.rtot * 100 || 0).toFixed(2)}%
                      </p>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <div>
                      <p style={{ color: '#666' }}>夏普比率</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18 }}>
                        {(jsonResult?.data?.return_analyzer?.sharpe_ratio || 0).toFixed(2)}
                      </p>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <div>
                      <p style={{ color: '#666' }}>交易次数</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18 }}>
                        {jsonResult?.data?.trade_analyzer?.total?.total || 0}
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card>
              
              {/* 收益曲线与市值曲线 */}
              <Card title="投资收益" style={{ marginBottom: 16 }}>
                <Tabs defaultActiveKey="position" tabBarStyle={{
                  backgroundColor: 'transparent',
                  borderBottom: '1px solid #e8e8e8',
                  padding: 0
                }}>
                  <TabPane tab="持仓收益" key="position">
                    {(() => {
                      // 提取持仓收益数据并确保日期与数据匹配
                      const positionReturns = Array.isArray(jsonResult?.data?.return_analyzer?.position_returns) ? jsonResult.data.return_analyzer.position_returns : [];
                      // 从持仓收益数据中提取日期和K线数据
                      const dates = positionReturns.map(item => item.date || '');
                      // ECharts candlestick requires [open, close, low, high] order
                      const klineData = positionReturns.map(item => {
                        // 只保留正数，并四舍五入进位
                        const open = Math.max(0, Math.round(parseFloat(item.open || 0)));
                        const close = Math.max(0, Math.round(parseFloat(item.close || 0)));
                        const low = Math.max(0, Math.round(parseFloat(item.low || 0)));
                        const high = Math.max(0, Math.round(parseFloat(item.high || 0)));
                        return [open, close, low, high];
                      });
                      
                      return (
                        <ReactECharts
                          option={{
                            title: {
                              text: '持仓收益',
                              left: 'center'
                            },
                            tooltip: {
                              trigger: 'axis',
                              axisPointer: {
                                type: 'cross'
                              },
                              formatter: function(params) {
                                let result = params[0].name + '<br/>';
                                result += `开: ${params[0].data[0]}<br/>`;
                                result += `收: ${params[0].data[1]}<br/>`;
                                result += `低: ${params[0].data[2]}<br/>`;
                                result += `高: ${params[0].data[3]}<br/>`;
                                return result;
                              }
                            },
                            grid: {
                              left: '3%',
                              right: '4%',
                              bottom: '15%',
                              containLabel: true
                            },
                            dataZoom: [{
                              type: 'inside',
                              start: 0,
                              end: 100,
                              zoomOnMouseWheel: true,
                              moveOnMouseMove: true
                            }, {
                              start: 0,
                              end: 100,
                              bottom: '3%'
                            }],
                            xAxis: [{
                              type: 'category',
                              data: dates,
                              axisLabel: {
                                rotate: 45
                              }
                            }],
                            yAxis: [{
                              type: 'value',
                              scale: true,
                              splitArea: {
                                show: true
                              },
                              // 移除百分比格式化，使用原始数值显示
                              axisLabel: {
                                formatter: '{value}'
                              }
                            }],
                            series: [{
                              name: '持仓收益',
                              type: 'candlestick',
                              data: klineData,
                              emphasis: {
                                focus: 'series'
                              }
                            }]
                          }}
                          style={{ height: 400 }}
                        />
                      );
                    })()}
                  </TabPane>
                  <TabPane tab="投资收益" key="returns">
                    {(() => {
                      // 提取投资收益数据并确保日期与数据匹配
                      const totalReturns = Array.isArray(jsonResult?.data?.return_analyzer?.total_returns) ? jsonResult.data.return_analyzer.total_returns : [];
                      // 从投资收益数据中提取日期和K线数据
                      const dates = totalReturns.map(item => item.date || '');
                      // ECharts candlestick requires [open, close, low, high] order
                      const klineData = totalReturns.map(item => {
                        // 只保留正数，并四舍五入进位
                        const open = Math.max(0, Math.round(parseFloat(item.open || 0)));
                        const close = Math.max(0, Math.round(parseFloat(item.close || 0)));
                        const low = Math.max(0, Math.round(parseFloat(item.low || 0)));
                        const high = Math.max(0, Math.round(parseFloat(item.high || 0)));
                        return [open, close, low, high];
                      });
                      
                      return (
                        <ReactECharts
                          option={{
                            title: {
                              text: '投资收益',
                              left: 'center'
                            },
                            tooltip: {
                              trigger: 'axis',
                              axisPointer: {
                                type: 'cross'
                              },
                              formatter: function(params) {
                                let result = params[0].name + '<br/>';
                                result += `开: ${params[0].data[0]}<br/>`;
                                result += `收: ${params[0].data[1]}<br/>`;
                                result += `低: ${params[0].data[2]}<br/>`;
                                result += `高: ${params[0].data[3]}<br/>`;
                                return result;
                              }
                            },
                            grid: {
                              left: '3%',
                              right: '4%',
                              bottom: '15%',
                              containLabel: true
                            },
                            dataZoom: [{
                              type: 'inside',
                              start: 0,
                              end: 100,
                              zoomOnMouseWheel: true,
                              moveOnMouseMove: true
                            }, {
                              start: 0,
                              end: 100,
                              bottom: '3%'
                            }],
                            xAxis: [{
                              type: 'category',
                              data: dates,
                              axisLabel: {
                                rotate: 45
                              }
                            }],
                            yAxis: [{
                              type: 'value',
                              scale: true,
                              splitArea: {
                                show: true
                              },
                              axisLabel: {
                                formatter: '{value}'
                              }
                            }],
                            series: [{
                              name: '投资收益',
                              type: 'candlestick',
                              data: klineData,
                              emphasis: {
                                focus: 'series'
                              }
                            }]
                          }}
                          style={{ height: 400 }}
                        />
                      );
                    })()}
                  </TabPane>
                </Tabs>
              </Card>
              
              <Row gutter={16}>
                {/* 交易记录 */}
                <Col xs={24} lg={12}>
                  <Card title={`交易记录 ${Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades.length : 0}`}>
                    <div ref={tradeTableContainerRef} className="trade-scroll-container" style={{ height: 400, overflowY: 'auto' }}>
                      <Table
                        size="small"
                        columns={[
                          {
                            title: '类型',
                            dataIndex: 'type',
                            key: 'type',
                            width: 50,
                            render: (text) => {
                              const type = (text || '').toLowerCase();
                              return (
                                <span style={{ color: type === 'buy' ? '#52c41a' : '#f5222d', fontSize: '16px' }}>
                                  {type === 'buy' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                </span>
                              );
                            }
                          },
                          {
                            title: '时间',
                            dataIndex: 'time',
                            key: 'time',
                            width: 150
                          },
                          {
                            title: '股票代码',
                            dataIndex: 'symbol',
                            key: 'symbol',
                            width: 100
                          },
                          {
                            title: '价格',
                            dataIndex: 'price',
                            key: 'price',
                            width: 80,
                            render: (text) => parseFloat(text || 0).toFixed(2)
                          },
                          {
                            title: '数量',
                            dataIndex: 'size',
                            key: 'size',
                            width: 80,
                            render: (text) => parseInt(text || 0)
                          },
                          {
                            title: '金额',
                            dataIndex: 'value',
                            key: 'value',
                            width: 100,
                            render: (text) => parseFloat(text || 0).toFixed(2)
                          },
                          {
                            title: '手续费',
                            dataIndex: 'commission',
                            key: 'commission',
                            width: 80,
                            render: (text) => parseFloat(text || 0).toFixed(2)
                          }
                        ]}
                        dataSource={trades.map((trade, index) => ({
                          ...trade,
                          key: index
                        }))}
                        pagination={false}
                      />
                    </div>
                  </Card>
                </Col>
                
                {/* 股票盈亏分布 */}
                <Col xs={24} lg={12}>
                  <Card title="股票盈亏分布">
                    <div style={{ height: 400, overflowY: 'auto' }}>
                      <Table
                        size="small"
                        columns={[
                          {
                            title: '股票代码',
                            dataIndex: 'symbol',
                            key: 'symbol',
                            width: 100
                          },
                          {
                            title: '买入金额',
                            dataIndex: 'buyValue',
                            key: 'buyValue',
                            render: (text) => parseFloat(text || 0).toFixed(2)
                          },
                          {
                            title: '卖出金额',
                            dataIndex: 'sellValue',
                            key: 'sellValue',
                            render: (text) => parseFloat(text || 0).toFixed(2)
                          },
                          {
                            title: '盈亏',
                            dataIndex: 'profit',
                            key: 'profit',
                            render: (text) => {
                              const profit = parseFloat(text || 0);
                              return (
                                <span style={{ color: profit > 0 ? '#52c41a' : profit < 0 ? '#f5222d' : '#666' }}>
                                  {profit > 0 ? '+' : ''}{profit.toFixed(2)}
                                </span>
                              );
                            }
                          }
                        ]}
                        dataSource={Array.from(stockProfitMap.values())
                          .filter(item => Math.abs(parseFloat(item.profit || 0)) > 0)
                          .map((item, index) => ({
                            ...item,
                            key: index
                          }))}
                        pagination={false}
                      />
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#666', marginBottom: 20 }}>该策略暂无回测结果</p>
              <Button type="primary" onClick={() => navigate('/backtest', { state: { strategyId } })}>
                运行回测
              </Button>
            </div>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default BacktestResult;