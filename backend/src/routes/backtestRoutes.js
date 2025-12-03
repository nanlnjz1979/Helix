const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Strategy = require('../models/Strategy');
// 增加全局超时常量，避免未定义错误
const MAX_RUNTIME_MS = parseInt(process.env.BACKTEST_MAX_MS || '600000', 10);

// 简易内存任务管理
const jobs = new Map(); // jobId -> { status: 'queued'|'running'|'done'|'error', progress: number, result: object, error: string, logs: string[] }

// 启动真实回测进程
async function startRealBacktest(jobId, strategyId, params) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.logs.push(`[${new Date().toLocaleTimeString()}] 初始化回测任务，加载策略代码...`);

  // 读取数据库中的策略代码
  let code = '';
  try {
    const strategy = await Strategy.findById(strategyId);
    if (!strategy || !strategy.code) {
      job.status = 'error';
      job.error = '未找到策略或策略代码为空';
      job.logs.push(`[${new Date().toLocaleTimeString()}] 错误：未找到策略或策略代码为空`);
      return;
    }
    code = strategy.code;
    job.logs.push(`[${new Date().toLocaleTimeString()}] 已获取策略代码（长度 ${code.length} 字符）`);
  } catch (e) {
    job.status = 'error';
    job.error = `读取策略失败：${e.message}`;
    job.logs.push(`[${new Date().toLocaleTimeString()}] 错误：读取策略失败 - ${e.message}`);
    return;
  }

  // 创建临时运行目录
  let tmpBase = null;
  try {
    tmpBase = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'helix-backtest-'));
    job.logs.push(`[${new Date().toLocaleTimeString()}] 已创建临时目录：${tmpBase}`);
  } catch (e) {
    job.status = 'error';
    job.error = `创建临时目录失败：${e.message}`;
    job.logs.push(`[${new Date().toLocaleTimeString()}] 错误：创建临时目录失败 - ${e.message}`);
    return;
  }

  const strategyPy = path.join(tmpBase, 'strategy.py');

  // 写入策略代码
  try {
    await fs.promises.writeFile(strategyPy, code, { encoding: 'utf8' });
    job.logs.push(`[${new Date().toLocaleTimeString()}] 已写入Python文件：strategy.py`);
  } catch (e) {
    job.status = 'error';
    job.error = `写入临时Python文件失败：${e.message}`;
    job.logs.push(`[${new Date().toLocaleTimeString()}] 错误：写入Python文件失败 - ${e.message}`);
    // 清理目录
    try { await fs.promises.rm(tmpBase, { recursive: true, force: true }); } catch (_) {}
    return;
  }

  const pyArgs = ['-u', strategyPy, JSON.stringify(params || {})];

  const trySpawn = (cmdIndex) => {
    const cmds = ['python', 'py'];
    if (cmdIndex >= cmds.length) {
      job.status = 'error';
      job.error = '未找到Python执行器';
      job.logs.push(`[${new Date().toLocaleTimeString()}] 错误：未找到Python执行器`);
      // 清理目录
      fs.promises.rm(tmpBase, { recursive: true, force: true }).catch(() => {});
      return;
    }
    const cmd = cmds[cmdIndex];
    const child = spawn(cmd, pyArgs, { cwd: tmpBase, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', (err) => {
      job.logs.push(`[${new Date().toLocaleTimeString()}] 子进程启动失败：`,err.message);
      console.error('子进程启动失败：', err.message);
      // 此时进程未成功启动
    });

    // 监听启动成功（进程已创建并开始运行）
    child.on('spawn', () => {
      job.logs.push(`[${new Date().toLocaleTimeString()}] 子进程已成功启动并开始运行`);
      console.log('子进程已成功启动并开始运行');
    });
    // 超时容错：最长运行时间
    const killTimer = setTimeout(() => {
      try { child.kill(); } catch (_) {}
      if (job.status === 'running') {
        job.status = 'error';
        job.error = '回测执行超时，已中止';
        job.logs.push(`[${new Date().toLocaleTimeString()}] 超时：达到${MAX_RUNTIME_MS}ms，终止进程`);
      }
    }, MAX_RUNTIME_MS);

    // 增强的stdout解析（容错）：支持多行JSON与残缺行
    let lineBuffer = '';
    let jsonBuffer = '';
    let jsonFound = false;

    child.stdout.on('data', (buf) => {
      try {
        const text = buf.toString();
        lineBuffer += text;
        // 逐行处理
        const parts = lineBuffer.split(/\r?\n/);
        // 保留最后一个可能不完整的片段
        lineBuffer = parts.pop();
        parts.forEach((line) => {
          const l = (line || '').trim();
          if (!l) return;
          // 解析进度行: PROGRESS <pct> <hint>
          const m = l.match(/^PROGRESS\s+(\d+)(?:\s+(.*))?$/i);
          if (m) {
            const pct = Math.max(0, Math.min(100, parseInt(m[1], 10) || 0));
            const hint = m[2] || '';
            job.progress = pct;
            job.logs.push(`[${new Date().toLocaleTimeString()}] 进度 ${pct}% ${hint}`);
            return;
          }
          // 累积JSON候选（容错，多行/分段）
          if (!jsonFound && l.includes('{')) {
            jsonBuffer += (jsonBuffer ? '\n' : '') + l;
            try {
              const candidate = jsonBuffer.trim();
              // 尝试解析
              const parsed = JSON.parse(candidate);
              job.result = parsed;
              job.status = 'done';
              job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成`);
              jsonFound = true;
              jsonBuffer = '';
              return;
            } catch (_) {
              // 未能解析，继续积累
            }
          } else if (!jsonFound && jsonBuffer) {
            jsonBuffer += '\n' + l;
            try {
              const candidate = jsonBuffer.trim();
              const parsed = JSON.parse(candidate);
              job.result = parsed;
              job.status = 'done';
              job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成`);
              jsonFound = true;
              jsonBuffer = '';
              return;
            } catch (_) {
              // 继续积累
            }
          }
          // 普通日志
          job.logs.push(l);
        });
      } catch (e) {
        job.logs.push(`[解析stdout错误] ${e.message}`);
      }
    });

    child.stderr.on('data', (buf) => {
      try {
        const text = buf.toString();
        text.split(/\r?\n/).forEach((line) => {
          const l = line.trim();
          if (!l) return;
          job.logs.push(`[ERR] ${l}`);
        });
      } catch (e) {
        job.logs.push(`[解析stderr错误] ${e.message}`);
      }
    });

    child.on('error', (err) => {
      job.logs.push(`[${new Date().toLocaleTimeString()}] 进程错误：${err.message}，尝试其他Python命令...`);
      // 尝试下一个命令
      clearTimeout(killTimer);
      trySpawn(cmdIndex + 1);
    });

    child.on('close', (code) => {
      clearTimeout(killTimer);
      // 处理残留行缓冲
      try {
        const leftover = (lineBuffer || '').trim();
        if (!jsonFound && leftover) {
          // 最后一行也可能是JSON
          try {
            const parsed = JSON.parse(leftover);
            job.result = parsed;
            job.status = 'done';
            job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成（尾部JSON）`);
          } catch (_) {}
        }
      } catch (_) {}

      if (job.status !== 'done') {
        if (code === 0 && job.result) {
          job.status = 'done';
        } else if (code === 0 && !job.result) {
          // 容错：进程成功退出但未输出JSON，返回空结构
          job.status = 'done';
          job.result = { time_returns: [], transactions: [], stockdata: [], message: '策略未输出结果，返回默认空结构' };
          job.logs.push(`[${new Date().toLocaleTimeString()}] 注意：未检测到JSON输出，已返回默认空结果`);
        } else {
          job.status = 'error';
          job.error = `回测进程退出代码: ${code}`;
        }
      }
      // 清理临时目录
      fs.promises.rm(tmpBase, { recursive: true, force: true })
        .then(() => {
          job.logs.push(`[${new Date().toLocaleTimeString()}] 已清理临时目录`);
        })
        .catch(() => {});
    });
  };

  trySpawn(0);
}

// 创建并启动回测任务（真实执行）
router.post('/run', async (req, res) => {
  try {
    const { strategyId, params } = req.body || {};
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, { status: 'running', progress: 0, result: null, error: null, logs: [], strategyId, params });

    // 异步启动真实回测
    startRealBacktest(jobId, strategyId, params);

    res.status(202).json({ jobId });
  } catch (err) {
    console.error('回测运行创建失败:', err);
    res.status(500).json({ message: '回测运行创建失败', error: err.message });
  }
});

// 查询任务状态
router.get('/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: '任务不存在' });
  res.json({ jobId: req.params.jobId, status: job.status, progress: job.progress });
});

// 获取任务结果
router.get('/results/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: '任务不存在' });
  if (job.status !== 'done') return res.status(202).json({ message: '任务未完成' });
  res.json(job.result);
});

// 保存回测结果到策略
router.post('/save-results/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { results } = req.body;
    
    if (!results) {
      return res.status(400).json({ message: '回测结果不能为空' });
    }
    
    // 更新策略表，保存回测结果
    const Strategy = require('../models/Strategy');
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      strategyId,
      {
        backtestResults: results,
        backtestStatus: 'completed',
        lastBacktestAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedStrategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json({ message: '回测结果保存成功', strategy: updatedStrategy });
  } catch (err) {
    console.error('保存回测结果失败:', err);
    res.status(500).json({ message: '保存回测结果失败', error: err.message });
  }
});

// SSE 进度与日志流
router.get('/stream/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`SSE 请求 ${jobId}：任务不存在`);
    res.status(404).end('Job Not Found');
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 追踪日志位置，避免重复推送
  let lastLogIndex = 0;

  // 首次推送当前状态与已有日志
  send('progress', { progress: job.progress, status: job.status });
  if (Array.isArray(job.logs) && job.logs.length > 0) {
    const initial = job.logs.slice(lastLogIndex);
    lastLogIndex = job.logs.length;
    if (initial.length > 0) send('logs', { lines: initial });
  }

  const interval = setInterval(() => {
    const j = jobs.get(jobId);
    if (!j) {
      clearInterval(interval);
      send('error', { message: '任务不存在' });
      res.end();
      return;
    }

    // 推送新增日志
    if (Array.isArray(j.logs) && j.logs.length > lastLogIndex) {
      const newLines = j.logs.slice(lastLogIndex);
      lastLogIndex = j.logs.length;
      if (newLines.length > 0) send('logs', { lines: newLines });
    }

    if (j.status === 'running') {
      // 发送进度和最近hint（从日志中提取）
      let hint = '';
      for (let i = j.logs.length - 1; i >= 0; i--) {
        const line = j.logs[i];
        const m = line.match(/进度\s+\d+%\s+(.*)$/);
        if (m) { hint = m[1] || ''; break; }
      }
      send('progress', { progress: j.progress, status: j.status, hint });
    } else if (j.status === 'done') {
      send('result', j.result);
      // 结束前再推送一次尾部日志（若有新增）
      if (Array.isArray(j.logs) && j.logs.length > lastLogIndex) {
        const tail = j.logs.slice(lastLogIndex);
        lastLogIndex = j.logs.length;
        if (tail.length > 0) send('logs', { lines: tail });
      }
      clearInterval(interval);
      res.end();
    } else if (j.status === 'error') {
      send('error', { message: j.error || '运行错误' });
      // 结束前再推送一次尾部日志（若有新增）
      if (Array.isArray(j.logs) && j.logs.length > lastLogIndex) {
        const tail = j.logs.slice(lastLogIndex);
        lastLogIndex = j.logs.length;
        if (tail.length > 0) send('logs', { lines: tail });
      }
      clearInterval(interval);
      res.end();
    }
  }, 800);

  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;