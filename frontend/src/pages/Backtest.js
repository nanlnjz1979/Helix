import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Form, Select, InputNumber, Button, Tabs, Table, message, Input, Progress } from 'antd';
import { PlayCircleOutlined, CodeOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useSelector } from 'react-redux';
import api from '../services/api';

const { Option } = Select;
const { TabPane } = Tabs;
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
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [strategiesData, setStrategiesData] = useState([]);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [runLogs, setRunLogs] = useState([]);
  const [tradePageSize, setTradePageSize] = useState(24);
  const [tradeScrollY, setTradeScrollY] = useState(600);
  const returnsChartRef = useRef(null);
  const klineCardRef = useRef(null);
  const tradeTableContainerRef = useRef(null);

  // 根据右侧容器可用高度，动态计算每页可显示的交易记录条数
  useEffect(() => {
    const compute = () => {
      try {
        const el = tradeTableContainerRef.current;
        if (!el) return;
        const total = el.clientHeight || 0;
        if (!total) return;
        const thead = el.querySelector('.ant-table-thead');
        const pagination = el.querySelector('.ant-pagination') || el.querySelector('.ant-table-pagination');
        const row = el.querySelector('.ant-table-row');
        const headerH = (thead && thead.clientHeight) ? thead.clientHeight : 0;
        const paginationH = (pagination && pagination.clientHeight) ? pagination.clientHeight : 0;
        const rowH = (row && row.clientHeight) ? row.clientHeight : 40; // 小号表格约40px
        const available = total - headerH - paginationH;
        const ps = Math.max(1, Math.floor(available / rowH));
        if (Number.isFinite(ps) && ps > 0 && ps !== tradePageSize) {
          setTradePageSize(ps);
        }
      } catch {}
    };
    const t = setTimeout(compute, 200);
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [jsonResult, tradePageSize]);
  // 根据右侧容器可用高度，计算 Table 内部滚动区域高度，使滚轮滚动记录
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
      } catch {};
    };
    const t = setTimeout(computeScrollY, 200);
    const onResize = () => computeScrollY();
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [jsonResult, tradeScrollY]);

  // Log backtest data to console when it's updated
  useEffect(() => {
    if (jsonResult) {
      console.log('Backtest Data:', jsonResult);
      // Also log trade counts for verification
      if (jsonResult?.data?.return_analyzer?.trades) {
        const trades = jsonResult.data.return_analyzer.trades;
        console.log('Trade Counts:');
        console.log('Total:', trades.length);
        console.log('Buy:', trades.filter(t => (t.type || '').toLowerCase() === 'buy').length);
        console.log('Sell:', trades.filter(t => (t.type || '').toLowerCase() === 'sell').length);
        console.log('Other:', trades.filter(t => (t.type || '').toLowerCase() !== 'buy' && (t.type || '').toLowerCase() !== 'sell').length);
      }
    }
  }, [jsonResult]);

  // 重复声明移除：使用顶部定义的 tradePageSize

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
          <TabPane tab="回测结果" key="result">
            {jsonResult ? (
              <div>
                <Card title={`策略类型：${jsonResult?.strategy_type || '未知'}`} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#666' }}>回测完成时间：{new Date().toLocaleString()}</div>
                    <Button type="primary" 
                      onClick={async () => {
                        try {
                          const values = await form.validateFields();
                          const strategyId = values.strategy;
                          if (!strategyId) {
                            message.error('请先选择策略');
                            return;
                          }
                          await api.post(`/backtest/save-results/${strategyId}`, { results: jsonResult });
                          message.success('回测结果保存成功');
                        } catch (err) {
                          console.error('保存回测结果失败:', err);
                          message.error(`保存失败: ${err?.response?.data?.message || err.message}`);
                        }
                      }}
                    >
                      保存回测结果
                    </Button>
                  </div>
                </Card>
                
                {/* 指标汇总卡片 */}
                <Card title="回测指标汇总" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>总收益</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, color: '#52c41a', margin: 0 }}>
                          {(jsonResult?.data?.returns_analyzer?.rtot * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>夏普比率</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, margin: 0 }}>
                          {(jsonResult?.data?.return_analyzer?.sharpe_ratio || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>交易次数</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, margin: 0 }}>
                          {jsonResult?.data?.trade_analyzer?.total?.total || 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>盈利交易</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, color: '#52c41a', margin: 0 }}>
                          {jsonResult?.data?.trade_analyzer?.won?.total || 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>亏损交易</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, color: '#f5222d', margin: 0 }}>
                          {jsonResult?.data?.trade_analyzer?.lost?.total || 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>最大回撤</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, margin: 0 }}>
                          {(jsonResult?.data?.drawdown_analyzer?.max?.drawdown * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>SQN</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, margin: 0 }}>
                          {(jsonResult?.data?.sqn_analyzer?.sqn || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>平均收益</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, color: '#52c41a', margin: 0 }}>
                          {(jsonResult?.data?.trade_analyzer?.pnl?.gross?.average || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#666', fontSize: 14 }}>总盈利</span>
                        <p style={{ fontWeight: 'bold', fontSize: 18, color: '#52c41a', margin: 0 }}>
                          {(jsonResult?.data?.trade_analyzer?.pnl?.gross?.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
                {/* 图表区域 */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 16 }}>
                  <div style={{ flex: 4, minWidth: 0 }}>
                    {/* K线图 */}
                    <Card title="K线图" style={{ marginBottom: 16 }} ref={klineCardRef}>
                      <ReactECharts option={(function(){
                        // 使用总收益数据绘制K线图，保留两位小数
                        const totalReturns = jsonResult?.data?.return_analyzer?.total_returns || [];
                        const dates = totalReturns.map(item => item.date);
                        const klineData = totalReturns.map(item => [
                          parseFloat(item.open.toFixed(2)),
                          parseFloat(item.close.toFixed(2)),
                          parseFloat(item.low.toFixed(2)),
                          parseFloat(item.high.toFixed(2))
                        ]);
                        
                        return {
                          tooltip: {
                            trigger: 'axis',
                            axisPointer: {
                              type: 'cross'
                            }
                          },
                          xAxis: {
                            type: 'category',
                            data: dates,
                            boundaryGap: true
                          },
                          yAxis: {
                            type: 'value',
                            scale: true
                          },
                          grid: {
                            left: '6%',
                            right: '6%',
                            top: '10%',
                            bottom: '15%',
                            containLabel: true
                          },
                          dataZoom: [
                            { type: 'slider', realtime: true, start: 0, end: 100, bottom: 8, height: 24 },
                            { type: 'inside', realtime: true }
                          ],
                          series: [
                            {
                              name: 'K线',
                              type: 'candlestick',
                              data: klineData,
                              itemStyle: {
                                color: '#52c41a',
                                color0: '#f5222d',
                                borderColor: '#52c41a',
                                borderColor0: '#f5222d'
                              }
                            }
                          ]
                        };
                      })()} style={{ height: 400 }} ref={returnsChartRef} />
                    </Card>
                    
                    {/* 持仓收益曲线 */}
                    <Card title="持仓收益曲线" style={{ marginBottom: 16 }}>
                      <ReactECharts option={(function(){
                        // 使用持仓收益数据绘制曲线，保留两位小数
                        const positionReturns = jsonResult?.data?.return_analyzer?.position_returns || [];
                        const dates = positionReturns.map(item => item.date);
                        const openValues = positionReturns.map(item => parseFloat(item.open.toFixed(2)));
                        const closeValues = positionReturns.map(item => parseFloat(item.close.toFixed(2)));
                        
                        return {
                          tooltip: {
                            trigger: 'axis'
                          },
                          xAxis: {
                            type: 'category',
                            data: dates,
                            boundaryGap: false
                          },
                          yAxis: {
                            type: 'value'
                          },
                          grid: {
                            left: '6%',
                            right: '6%',
                            top: '10%',
                            bottom: '15%',
                            containLabel: true
                          },
                          dataZoom: [
                            { type: 'slider', realtime: true, start: 0, end: 100, bottom: 8, height: 24 },
                            { type: 'inside', realtime: true }
                          ],
                          series: [
                            {
                              name: '持仓收益(开盘)',
                              type: 'line',
                              data: openValues,
                              smooth: true,
                              itemStyle: {
                                color: '#52c41a'
                              }
                            },
                            {
                              name: '持仓收益(收盘)',
                              type: 'line',
                              data: closeValues,
                              smooth: true,
                              itemStyle: {
                                color: '#1890ff'
                              }
                            }
                          ]
                        };
                      })()} style={{ height: 400 }} />
                    </Card>
                  </div>
                  
                  {/* 右侧交易记录和矩形树图 */}
                  <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 交易记录 */}
                    <Card title={
                      <span>
                        交易记录
                        <span style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
                          总: {Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades.length : 0}
                          <span style={{ marginLeft: 8 }}>
                            <ArrowUpOutlined style={{ color: '#52c41a', marginRight: 2 }} />{Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades.filter(t => (t.type || '').toLowerCase() === 'buy').length : 0}/
                            <ArrowDownOutlined style={{ color: '#f5222d', marginRight: 2, marginLeft: 4 }} />{Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades.filter(t => (t.type || '').toLowerCase() === 'sell').length : 0}
                          </span>
                        </span>
                      </span>
                    } style={{ marginBottom: 0 }}>
                      <div ref={tradeTableContainerRef} className="trade-scroll-container" style={{ height: 400, overflowY: 'auto' }}>
                        <Table size="small" className="trade-table"
                          columns={[
                            {
                              title: '类型',
                              dataIndex: 'type',
                              key: 'type',
                              width: 50,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              ),
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
                              width: 100,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              ),
                              render: (text) => {
                                // 只显示日期部分，不显示时间部分
                                return text.split(' ')[0];
                              }
                            },
                            {
                              title: '标的',
                              dataIndex: 'symbol',
                              key: 'symbol',
                              width: 90,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              )
                            },
                            {
                              title: '价格',
                              dataIndex: 'price',
                              key: 'price',
                              width: 80,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              ),
                              render: (text) => parseFloat(text).toFixed(2)
                            },
                            {
                              title: '数量',
                              dataIndex: 'size',
                              key: 'size',
                              width: 90,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              ),
                              render: (text) => parseFloat(Math.abs(Number(text))).toFixed(2)
                            },
                            {
                              title: '金额',
                              dataIndex: 'value',
                              key: 'value',
                              width: 100,
                              headerCell: (props) => (
                                <th {...props} style={{ textAlign: 'center' }}>{props.children}</th>
                              ),
                              render: (text) => parseFloat(text).toFixed(2)
                            }
                          ]}
                          dataSource={Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades : []}
                          pagination={false}
                          scroll={{ y: 360, x: 'max-content' }}
                          rowKey={(record, index) => index}
                        />
                      </div>
                    </Card>
                    
                    {/* 矩形树图 - 股票盈亏分布 */}
                    <Card title="股票盈亏分布">
                      <ReactECharts option={(function(){
                        // 计算每个股票的盈亏
                        const trades = Array.isArray(jsonResult?.data?.return_analyzer?.trades) ? jsonResult.data.return_analyzer.trades : [];
                        const stockProfitMap = new Map();
                        
                        // 按股票分组，计算盈亏
                        trades.forEach(trade => {
                          const symbol = trade.symbol;
                          const type = (trade.type || '').toLowerCase();
                          const value = parseFloat(trade.value);
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
                       
                        // 转换为矩形树图数据格式
                        const treeData = {
                          name: '',
                          children: Array.from(stockProfitMap.values()).map(stock => ({
                            name: stock.symbol,
                            value: Math.abs(stock.profit),
                            profit: stock.profit
                          }))
                        };
                        
                        // 计算最大绝对值，用于颜色映射
                        const maxAbsProfit = Math.max(...Array.from(stockProfitMap.values()).map(stock => Math.abs(stock.profit)), 1);
                        
                        return {
                          tooltip: {
                            formatter: function(params) {
                              const data = params.data;
                              if (data.profit !== undefined) {
                                return `${data.name}<br/>盈亏: ${data.profit.toFixed(2)}`;
                              } else {
                                return `${data.name}`;
                              }
                            }
                          },
                          series: [{
                            type: 'treemap',
                            data: [treeData],
                            roam: false,
                            nodeClick: false,
                            
                            
                            label: {
                              show: true,
                              formatter: '{b}'
                            },
                            upperLabel: {
                              show: false
                            },
                            breadcrumb: {
                              show: false           // 关闭面包屑
                            },
                            itemStyle: {
                              borderColor: '#fff',
                              borderWidth: 1,
                              color: function(params) {
                                const profit = params.data.profit;
                                const ratio = Math.abs(profit) / maxAbsProfit;
                                if (profit > 0) {
                                  // 盈利：绿色系，深度随盈利增加而加深
                                  return `rgba(82, 196, 26, ${0.5 + ratio * 0.5})`;
                                } else {
                                  // 亏损：红色系，深度随亏损增加而加深
                                  return `rgba(245, 34, 45, ${0.5 + ratio * 0.5})`;
                                }
                              }
                            },
                            levels: [{
                              upperLabel: {
                                show: false  // 在 levels 中再次关闭
                              },
                              itemStyle: {
                                borderWidth: 0,
                                gapWidth: 1
                              }
                            }]
                          }]
                        };
                      })()} style={{ height: 400 }} />
                    </Card>
                  </div>
                </div>
                {/* 详细交易分析 */}
                <Card title="交易分析" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    <div>
                      <h4 style={{ marginBottom: 12, color: '#333' }}>交易概览</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>总交易数</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16 }}>{jsonResult?.data?.trade_analyzer?.total?.total || 0}</p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>已平仓</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16 }}>{jsonResult?.data?.trade_analyzer?.total?.closed || 0}</p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>未平仓</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16 }}>{jsonResult?.data?.trade_analyzer?.total?.open || 0}</p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>胜率</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16, color: '#52c41a' }}>
                            {jsonResult?.data?.trade_analyzer?.won?.total > 0 ? 
                              ((jsonResult.data.trade_analyzer.won.total / jsonResult.data.trade_analyzer.total.total) * 100).toFixed(2) : 
                              '0.00'}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{ marginBottom: 12, color: '#333' }}>盈亏分析</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>总盈利</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16, color: '#52c41a' }}>
                            {(jsonResult?.data?.trade_analyzer?.pnl?.gross?.total || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>平均盈利</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16, color: '#52c41a' }}>
                            {(jsonResult?.data?.trade_analyzer?.pnl?.gross?.average || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>最大盈利</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16, color: '#52c41a' }}>
                            {(jsonResult?.data?.trade_analyzer?.won?.pnl?.max || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#666', marginBottom: 4 }}>最大亏损</p>
                          <p style={{ fontWeight: 'bold', fontSize: 16, color: '#f5222d' }}>
                            {(jsonResult?.data?.trade_analyzer?.lost?.pnl?.max || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* 回撤分析 */}
                <Card title="回撤分析" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div>
                      <p style={{ color: '#666', marginBottom: 4 }}>最大回撤</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18, color: '#f5222d' }}>
                        {(jsonResult?.data?.drawdown_analyzer?.max?.drawdown * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#666', marginBottom: 4 }}>最大回撤金额</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18, color: '#f5222d' }}>
                        {(jsonResult?.data?.drawdown_analyzer?.max?.moneydown || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#666', marginBottom: 4 }}>回撤时长</p>
                      <p style={{ fontWeight: 'bold', fontSize: 18 }}>
                        {jsonResult?.data?.drawdown_analyzer?.max?.len || 0} 天
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                暂无回测结果。请在“回测运行与结果”页签点击“开始回测”后查看。
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Backtest;

// 重复声明移除：使用顶部定义的 tradePageSize