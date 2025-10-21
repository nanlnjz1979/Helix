import React, { useState, useMemo, useEffect } from 'react';
import { Card, Form, Select, DatePicker, InputNumber, Button, Tabs, Table, message, Input, Progress } from 'antd';
import { PlayCircleOutlined, CodeOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useSelector } from 'react-redux';
import api from '../services/api';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 代码查看器（仿代码编辑器样式，只读）
const CodeViewer = ({ value }) => (
  <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, minHeight: 300, backgroundColor: '#f0f2f5' }}>
    <div style={{ padding: 12, fontSize: 14, backgroundColor: '#e6f7ff', borderBottom: '1px solid #d9d9d9' }}>
      <CodeOutlined /> 策略代码查看器
    </div>
    <TextArea
      value={value || ''}
      readOnly
      style={{ minHeight: 260, border: 0, resize: 'none', fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, monospace' }}
      placeholder="# 该策略暂未提供代码"
    />
  </div>
);

const Backtest = () => {
  const { strategies: strategiesFromStore = [] } = useSelector(state => state.strategy);
  const [form] = Form.useForm();

  const [isRunning, setIsRunning] = useState(false);
  const [jsonResult, setJsonResult] = useState(null);
  const [runProgress, setRunProgress] = useState(0);
  const [topActiveTab, setTopActiveTab] = useState('config');
  const [activeRunTab, setActiveRunTab] = useState('summary');
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [strategiesData, setStrategiesData] = useState([]);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [runLogs, setRunLogs] = useState([]);

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoadingStrategies(true);
      try {
        const res = await api.get('/strategies');
        const list = Array.isArray(res.data) ? res.data : (res.data?.strategies || []);
        setStrategiesData(list);
      } catch (err) {
        console.error('加载策略列表失败:', err);
        message.error(`加载策略失败: ${err?.response?.data?.message || err.message}`);
        // 回退到store的策略（如果存在）
        setStrategiesData(strategiesFromStore || []);
      } finally {
        setLoadingStrategies(false);
      }
    };
    fetchStrategies();
  }, [strategiesFromStore]);

  const strategyMapById = useMemo(() => {
    const map = new Map();
    (strategiesData || []).forEach(s => map.set(s.id || s._id, s));
    return map;
  }, [strategiesData]);
  


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



  const handleStrategyChange = (val) => {
    const s = strategyMapById.get(val);
    setSelectedStrategy(s || null);
    // 设置参数默认值
    if (s && Array.isArray(s.parameters)) {
      const defaultParams = {};
      s.parameters.forEach(p => {
        defaultParams[p.name] = p.default;
      });
      form.setFieldsValue({ params: defaultParams });
    }
  };

  // 执行回测
  const handleRunBacktest = async () => {
    try {
      const values = await form.validateFields();
      setIsRunning(true);
      setRunProgress(0);
      // 保留历史日志，不清空；记录一次启动日志
      const startTs = new Date().toLocaleTimeString();
      setRunLogs(prev => [...prev, `[${startTs}] 开始回测，策略: ${values.strategy}`]);
      const payload = {
        strategyId: values.strategy,
        params: values.params || {}
      };
      const res = await api.post('/backtest/run', payload);
      const data = res?.data || null;
      if (data && data.jobId) {
        const jobId = data.jobId;
        const es = new EventSource(`http://localhost:5000/api/backtest/stream/${jobId}`);
        es.addEventListener('progress', (e) => {
          try {
            const payload = JSON.parse(e.data);
            const pct = Number(payload?.progress || 0);
            setRunProgress(pct);
            const ts = new Date().toLocaleTimeString();
            const hint = payload?.hint || payload?.message || '';
            setRunLogs(prev => [...prev, `[${ts}] 进度 ${pct}% ${hint}`]);
          } catch {
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] 进度事件解析失败`]);
          }
        });
        // 新增：实时接收后端增量日志
        es.addEventListener('logs', (e) => {
          try {
            const payload = JSON.parse(e.data);
            const lines = Array.isArray(payload?.lines) ? payload.lines : [];
            if (lines.length > 0) {
              setRunLogs(prev => [...prev, ...lines]);
            }
          } catch {
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] 日志事件解析失败`]);
          }
        });
        es.addEventListener('result', (e) => {
          try {
            const payload = JSON.parse(e.data);
            setJsonResult(payload);
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] 回测完成，结果已就绪`]);
            message.success('回测完成');
          } catch {
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] 回测结果解析失败`]);
          }
          setIsRunning(false);
          es.close();
        });
        // 改造：解析后端发送的错误信息并展示
        es.addEventListener('error', (e) => {
          try {
            const payload = e?.data ? JSON.parse(e.data) : null;
            const msg = payload?.message || '回测进度连接断开';
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] ${msg}`]);
            if (payload?.message) {
              message.error(msg);
            } else {
              message.warning(msg);
            }
          } catch {
            const ts = new Date().toLocaleTimeString();
            setRunLogs(prev => [...prev, `[${ts}] 回测进度连接断开`]);
            message.warning('回测进度连接断开');
          }
          setIsRunning(false);
          es.close();
        });
      } else if (data) {
        setJsonResult(data);
        const ts = new Date().toLocaleTimeString();
        setRunLogs(prev => [...prev, `[${ts}] 回测完成（非SSE返回），结果已就绪`]);
        message.success('回测完成');
      } else {
        throw new Error('服务端未返回数据');
      }
    } catch (err) {
      console.error('回测运行失败:', err);
      const ts = new Date().toLocaleTimeString();
      setRunLogs(prev => [...prev, `[${ts}] 回测失败: ${err?.response?.data?.message || err.message}`]);
      message.error(`回测失败: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <Card title="策略回测">
        <Tabs activeKey={topActiveTab} onChange={setTopActiveTab}>
          <TabPane tab="选择策略与参数" key="config">
            <Form form={form} layout="vertical">
              <Form.Item
                label="选择策略"
                name="strategy"
                rules={[{ required: true, message: '请选择策略' }]}
              >
                <Select 
                  placeholder="请选择策略" 
                  onChange={handleStrategyChange}
                  loading={loadingStrategies}
                  allowClear
                >
                  {(strategiesData || []).map(strategy => (
                    <Option key={strategy.id || strategy._id} value={strategy.id || strategy._id}>{strategy.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 代码输入的参数 */}
              {selectedStrategy && Array.isArray(selectedStrategy.parameters) && selectedStrategy.parameters.length > 0 && (
                <Card size="small" title="代码输入的参数" style={{ marginBottom: 16 }}>
                  {selectedStrategy.parameters.map(param => (
                    <Form.Item
                      key={param.name}
                      label={param.name}
                      name={['params', param.name]}
                      rules={[{ required: true, message: `请输入参数 ${param.name}` }]}
                    >
                      <InputNumber min={param.min} max={param.max} defaultValue={param.default} style={{ width: '100%' }} />
                    </Form.Item>
                  ))}
                </Card>
              )}
            </Form>
          </TabPane>

          <TabPane tab="显示代码" key="code">
            {selectedStrategy ? (
              <CodeViewer value={selectedStrategy.code} />
            ) : (
              <div style={{ color: '#999' }}>请先在“选择策略与参数”页签中选择策略</div>
            )}
          </TabPane>

          <TabPane tab="回测运行与结果" key="run">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleRunBacktest}
                loading={isRunning}
              >
                开始回测
              </Button>
              {isRunning && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#666', marginBottom: 6 }}>服务器正在运行回测…</div>
                  <Progress percent={runProgress} status="active" />
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#666', marginBottom: 6 }}>过程日志（保留）</div>
              <div style={{ background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, maxHeight: 240, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
                {runLogs.length === 0 ? (
                  <div style={{ color: '#999' }}>暂无日志</div>
                ) : (
                  runLogs.map((line, idx) => (<div key={idx}>{line}</div>))
                )}
              </div>
              {!isRunning && jsonResult && (
                <Button type="primary" style={{ marginTop: 12 }} onClick={() => setTopActiveTab('result')}>
                  查看结果
                </Button>
              )}
            </div>
          </TabPane>
          <TabPane tab="回测结果(JSON)" key="result">
            {jsonResult ? (
              <div>
                <Card title={`标的信息：${jsonResult?.stock?.stock_name || ''} (${jsonResult?.stock?.stock_num || ''})`} style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666' }}>交易条数：{jsonResult.transaction_count}</div>
                </Card>
                <Card title="K线与成交量" style={{ marginBottom: 16 }}>
                  <ReactECharts option={(function(){
                    const sd = Array.isArray(jsonResult.stockdata) ? jsonResult.stockdata : [];
                    const categories = sd.map(i => i.trade_date);
                    const kline = sd.map(i => [i.open, i.close, i.low, i.high]);
                    const volume = sd.map(i => i.vol || 0);
                    return {
                      tooltip: { trigger: 'axis' },
                      xAxis: [{ type: 'category', data: categories, boundaryGap: true }, { type: 'category', gridIndex: 1, data: categories, boundaryGap: true }],
                      yAxis: [{ scale: true }, { gridIndex: 1 }],
                      grid: [{ left: '10%', right: '10%', height: '55%' }, { left: '10%', right: '10%', top: '70%', height: '20%' }],
                      series: [
                        { name: 'K线', type: 'candlestick', data: kline },
                        { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volume }
                      ]
                    };
                  })()} style={{ height: 420 }} />
                </Card>
                <Card title="时间序列收益" style={{ marginBottom: 16 }}>
                  <ReactECharts option={(function(){
                    const tr = jsonResult.time_returns || {};
                  const dates = Object.keys(tr);
                  const values = dates.map(d => tr[d]);
                    return {
                      tooltip: { trigger: 'axis' },
                      xAxis: { type: 'category', data: dates },
                      yAxis: { type: 'value' },
                      series: [{ name: '收益', type: 'line', data: values, smooth: true }]
                    };
                  })()} style={{ height: 300 }} />
                </Card>
                <Card title="指标汇总" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div>
                      <p style={{ color: '#666' }}>累计收益</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.returns?.cumulative_return ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>年化收益%</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.returns?.annualized_return_pct ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>日均收益</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.returns?.avg_daily_return ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>最大回撤%</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.drawdown?.max_drawdown_pct ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>最大回撤天数</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.drawdown?.max_drawdown_days ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>当前回撤%</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.drawdown?.current_drawdown_pct ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>夏普比率</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.risk_metrics?.sharpe_ratio ?? 0)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>交易统计</p>
                      <p style={{ fontWeight: 'bold' }}>{`总:${jsonResult.trade_statistics?.total_trades ?? 0} 胜:${jsonResult.trade_statistics?.winning_trades ?? 0} 负:${jsonResult.trade_statistics?.losing_trades ?? 0} 胜率:${jsonResult.trade_statistics?.win_rate_pct ?? 0}%`}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666' }}>系统质量(SQN)</p>
                      <p style={{ fontWeight: 'bold' }}>{(jsonResult.system_quality?.sqn ?? 0)}</p>
                    </div>
                  </div>
                </Card>
                <Card title="交易记录" style={{ marginBottom: 16 }}>
                  <Table
                    columns={[
                      { title: '时间', dataIndex: 'datetime' },
                      { title: '数量', dataIndex: 'amount' },
                      { title: '价格', dataIndex: 'price' },
                      { title: '标的', dataIndex: 'symbol' },
                      { title: '值', dataIndex: 'value' },
                      { title: 'SID', dataIndex: 'sid' }
                    ]}
                    dataSource={Array.isArray(jsonResult.transactions) ? jsonResult.transactions : []}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </div>
            ) : (
              <div style={{ color: '#999' }}>暂无回测结果。请在“回测运行与结果”页签点击“开始回测”后查看。</div>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Backtest;