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

    // 编码检测函数
    function detectEncoding(buffer) {
      // 检查是否为UTF-8 BOM
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf8';
      }
      
      // 检查是否为UTF-16 LE BOM
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf16le';
      }
      
      // 检查是否为UTF-16 BE BOM
      if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf16be';
      }
      
      // 尝试检测GBK编码
      // GBK编码的特点：没有0x00字节（除了字符串结束符），且包含中文特有的编码范围
      let hasGbkChars = false;
      for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        // GBK的第一个字节范围：0x81-0xFE
        if (byte >= 0x81 && byte <= 0xFE) {
          // GBK的第二个字节范围：0x40-0x7E, 0x80-0xFE
          if (i + 1 < buffer.length) {
            const nextByte = buffer[i + 1];
            if ((nextByte >= 0x40 && nextByte <= 0x7E) || (nextByte >= 0x80 && nextByte <= 0xFE)) {
              hasGbkChars = true;
              break;
            }
          }
        }
      }
      
      if (hasGbkChars) {
        return 'gbk';
      }
      
      // 默认使用UTF-8
      return 'utf8';
    }

    child.stdout.on('data', (buf) => {
      try {
        // 检测编码并转换
        const encoding = detectEncoding(buf);
        let text;
        
        if (encoding === 'utf8') {
          text = buf.toString('utf8');
        } else {
          const iconv = require('iconv-lite');
          text = iconv.decode(buf, encoding);
        }
        
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
            job.logs.push(`[${new Date().toLocaleTimeString()}] 检测到可能的JSON开始：${l.substring(0, 100)}${l.length > 100 ? '...' : ''}`);
            jsonBuffer += (jsonBuffer ? '\n' : '') + l;
            try {
              const candidate = jsonBuffer.trim();
              job.logs.push(`[${new Date().toLocaleTimeString()}] 尝试解析JSON：${candidate.substring(0, 200)}${candidate.length > 200 ? '...' : ''}`);
              // 尝试解析
              const parsed = JSON.parse(candidate);
              job.logs.push(`[${new Date().toLocaleTimeString()}] JSON解析成功，结果类型：${typeof parsed}`);
              if (typeof parsed === 'object') {
                job.logs.push(`[${new Date().toLocaleTimeString()}] JSON对象包含的键：${Object.keys(parsed).join(', ')}`);
              }
              job.result = parsed;
              job.status = 'done';
              job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成`);
              jsonFound = true;
              jsonBuffer = '';
              return;
            } catch (parseError) {
              job.logs.push(`[${new Date().toLocaleTimeString()}] JSON解析失败，错误：${parseError.message}`);
              job.logs.push(`[${new Date().toLocaleTimeString()}] 继续积累JSON数据...`);
              // 未能解析，继续积累
            }
          } else if (!jsonFound && jsonBuffer) {
            job.logs.push(`[${new Date().toLocaleTimeString()}] 继续积累JSON数据：${l.substring(0, 100)}${l.length > 100 ? '...' : ''}`);
            jsonBuffer += '\n' + l;
            try {
              const candidate = jsonBuffer.trim();
              job.logs.push(`[${new Date().toLocaleTimeString()}] 尝试解析累积的JSON：${candidate.substring(0, 200)}${candidate.length > 200 ? '...' : ''}`);
              const parsed = JSON.parse(candidate);
              job.logs.push(`[${new Date().toLocaleTimeString()}] JSON解析成功，结果类型：${typeof parsed}`);
              if (typeof parsed === 'object') {
                job.logs.push(`[${new Date().toLocaleTimeString()}] JSON对象包含的键：${Object.keys(parsed).join(', ')}`);
              }
              job.result = parsed;
              job.status = 'done';
              job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成`);
              jsonFound = true;
              jsonBuffer = '';
              return;
            } catch (parseError) {
              job.logs.push(`[${new Date().toLocaleTimeString()}] JSON解析失败，错误：${parseError.message}`);
              job.logs.push(`[${new Date().toLocaleTimeString()}] 继续积累JSON数据...`);
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
        // 检测编码并转换
        const encoding = detectEncoding(buf);
        let text;
        
        if (encoding === 'utf8') {
          text = buf.toString('utf8');
        } else {
          const iconv = require('iconv-lite');
          text = iconv.decode(buf, encoding);
        }
        
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
        job.logs.push(`[${new Date().toLocaleTimeString()}] 处理残留行缓冲，长度：${leftover.length}`);
        if (!jsonFound && leftover) {
          job.logs.push(`[${new Date().toLocaleTimeString()}] 尝试解析尾部JSON：${leftover.substring(0, 200)}${leftover.length > 200 ? '...' : ''}`);
          // 最后一行也可能是JSON
          try {
            const parsed = JSON.parse(leftover);
            job.logs.push(`[${new Date().toLocaleTimeString()}] 尾部JSON解析成功，结果类型：${typeof parsed}`);
            if (typeof parsed === 'object') {
              job.logs.push(`[${new Date().toLocaleTimeString()}] 尾部JSON对象包含的键：${Object.keys(parsed).join(', ')}`);
            }
            job.result = parsed;
            job.status = 'done';
            job.logs.push(`[${new Date().toLocaleTimeString()}] 回测完成，结果已生成（尾部JSON）`);
          } catch (parseError) {
            job.logs.push(`[${new Date().toLocaleTimeString()}] 尾部JSON解析失败，错误：${parseError.message}`);
          }
        }
      } catch (e) {
        job.logs.push(`[${new Date().toLocaleTimeString()}] 处理残留行缓冲时发生错误：${e.message}`);
      }

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