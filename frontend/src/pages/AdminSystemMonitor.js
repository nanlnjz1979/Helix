import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Statistic, Tag, Progress, Tabs } from 'antd';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

const { TabPane } = Tabs;

const fmtPct = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : 0);
const fmtMb = (v) => (typeof v === 'number' ? Math.round(v) : 0);
const fmtGb = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : 0);

const AdminSystemMonitor = () => {
  const [data, setData] = useState(null);
  const [netSeries, setNetSeries] = useState([]); // 记录最近网络入/出趋势
  const [loadSeries, setLoadSeries] = useState([]); // 记录最近loadavg趋势

  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        const res = await api.get('/monitor/summary');
        const d = res?.data?.data || null;
        if (!mounted) return;
        setData(d);
        // 收集网络趋势
        const now = new Date();
        const tick = {
          time: now.toLocaleTimeString(),
          in: d?.hardware?.network?.input_mb ?? null,
          out: d?.hardware?.network?.output_mb ?? null,
          load1: d?.hardware?.cpu?.loadavg?.one ?? null,
          load5: d?.hardware?.cpu?.loadavg?.five ?? null,
          load15: d?.hardware?.cpu?.loadavg?.fifteen ?? null
        };
        setNetSeries(prev => [...prev.slice(-29), tick]);
        setLoadSeries(prev => [...prev.slice(-29), tick]);
      } catch (err) {
        console.warn('monitor summary fetch error', err);
      }
    };
    fetchSummary();
    const timer = setInterval(fetchSummary, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const netChartOption = useMemo(() => {
    const times = netSeries.map(i => i.time);
    const inData = netSeries.map(i => i.in ?? 0);
    const outData = netSeries.map(i => i.out ?? 0);
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['入站(MB)', '出站(MB)'] },
      xAxis: { type: 'category', data: times },
      yAxis: { type: 'value', name: 'MB' },
      series: [
        { name: '入站(MB)', type: 'line', data: inData, smooth: true },
        { name: '出站(MB)', type: 'line', data: outData, smooth: true }
      ]
    };
  }, [netSeries]);

  const loadChartOption = useMemo(() => {
    const times = loadSeries.map(i => i.time);
    const l1 = loadSeries.map(i => i.load1 ?? 0);
    const l5 = loadSeries.map(i => i.load5 ?? 0);
    const l15 = loadSeries.map(i => i.load15 ?? 0);
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['1m', '5m', '15m'] },
      xAxis: { type: 'category', data: times },
      yAxis: { type: 'value', name: 'Load' },
      series: [
        { name: '1m', type: 'line', data: l1, smooth: true },
        { name: '5m', type: 'line', data: l5, smooth: true },
        { name: '15m', type: 'line', data: l15, smooth: true }
      ]
    };
  }, [loadSeries]);

  const cpuUsage = fmtPct(data?.hardware?.cpu?.usage_pct);
  const cores = data?.hardware?.cpu?.cores || 0;
  const memUsedPct = fmtPct(data?.hardware?.memory?.used_pct);

  return (
    <div>
      <Card title="系统监控" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="CPU使用率" value={cpuUsage} suffix="%" />
              <Progress percent={Math.min(100, cpuUsage)} status={cpuUsage > 85 ? 'exception' : cpuUsage > 70 ? 'active' : 'normal'} />
              <div style={{ marginTop: 8 }}>核心数：<Tag color="blue">{cores}</Tag></div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="内存使用率" value={memUsedPct} suffix="%" />
              <div style={{ marginTop: 8 }}>
                总内存：<Tag>{fmtMb(data?.hardware?.memory?.total_mb)} MB</Tag>
                已用：<Tag color="volcano">{fmtMb(data?.hardware?.memory?.used_mb)} MB</Tag>
                空闲：<Tag color="green">{fmtMb(data?.hardware?.memory?.free_mb)} MB</Tag>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="磁盘使用率" value={fmtPct(data?.hardware?.disk?.used_pct)} suffix="%" />
              <div style={{ marginTop: 8 }}>
                总：<Tag>{fmtGb(data?.hardware?.disk?.total_gb)} GB</Tag>
                已用：<Tag color="volcano">{fmtGb(data?.hardware?.disk?.used_gb)} GB</Tag>
                空闲：<Tag color="green">{fmtGb(data?.hardware?.disk?.free_gb)} GB</Tag>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="系统信息" value={data?.os?.platform || '-'} />
              <div style={{ marginTop: 8 }}>
                版本：<Tag>{data?.os?.release || '-'}</Tag>
                运行时间：<Tag color="blue">{Math.floor((data?.os?.uptime_sec || 0) / 3600)} 小时</Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="hardware">
        <TabPane tab="硬件资源" key="hardware">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="网络带宽趋势(最近150秒)">
                <ReactECharts option={netChartOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="负载平均值趋势(1/5/15分钟)">
                <ReactECharts option={loadChartOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="系统与服务" key="system">
          <Card>
            <Row gutter={16}>
              <Col span={8}><Statistic title="运行进程(占位)" value={data?.system?.process_count || '-'} /></Col>
              <Col span={8}><Statistic title="登录用户(占位)" value={data?.system?.users || '-'} /></Col>
              <Col span={8}><Statistic title="关键服务状态" value={(data?.services || []).map(s => s.status).join(', ') || '-'} /></Col>
            </Row>
          </Card>
        </TabPane>
        <TabPane tab="应用程序" key="app">
          <Card>
            <Row gutter={16}>
              <Col span={8}><Statistic title="进程PID" value={data?.application?.pid || '-'} /></Col>
              <Col span={8}><Statistic title="Node版本" value={data?.application?.node_version || '-'} /></Col>
              <Col span={8}><Statistic title="RSS内存(MB)" value={data ? fmtMb(data?.application?.memory_rss_mb) : '-'} /></Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}><Statistic title="HeapUsed(MB)" value={data ? fmtMb(data?.application?.memory_heap_used_mb) : '-'} /></Col>
              <Col span={8}><Statistic title="HeapTotal(MB)" value={data ? fmtMb(data?.application?.memory_heap_total_mb) : '-'} /></Col>
            </Row>
          </Card>
        </TabPane>
        <TabPane tab="数据库" key="db">
          <Card>
            <Statistic title="数据库状态" value={data?.database?.status || '-'} />
          </Card>
        </TabPane>
        <TabPane tab="可用性" key="ux">
          <Card>
            <Row gutter={16}>
              <Col span={8}><Statistic title="HTTP探测(ms)" value={data?.availability?.http_ping_ms ?? '-'} /></Col>
              <Col span={8}><Statistic title="24h在线率(%)" value={data?.availability?.online_ratio_24h_pct ?? '-'} /></Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminSystemMonitor;