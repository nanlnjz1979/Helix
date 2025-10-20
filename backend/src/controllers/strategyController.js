// 策略控制器
const Strategy = require('../models/Strategy');
const Template = require('../models/Template');
const Category = require('../models/Category');
// 新增: 引入Node核心模块用于编译过程的文件操作与子进程
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// 获取所有策略
exports.getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find({ user: req.user.id });
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个策略
exports.getStrategyById = async (req, res) => {
  try {
    const strategy = await Strategy.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新策略
exports.createStrategy = async (req, res) => {
  try {
    const { name, description, type, code, parameters, status } = req.body;
    
    const strategy = new Strategy({
      name,
      description,
      type,
      code,
      parameters,
      status,
      user: req.user.id
    });
    
    await strategy.save();
    
    res.status(201).json({
      message: '策略创建成功',
      strategy
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 从模板克隆策略
exports.cloneFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body || {};

    // 加载模板
    const template = await Template.findById(templateId).populate('category');
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    // 非管理员只能从已发布模板或自己的模板克隆
    if (req.user.role !== 'admin' && template.author.toString() !== req.user.id.toString() && template.status !== 'published') {
      return res.status(403).json({ message: '无权限从该模板克隆策略' });
    }

    // 生成默认名称（模板名 + 用户名 + 日期时间），若请求体提供name则使用之
    let finalName = null;
    try {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        finalName = name.trim();
      } else {
        const User = require('../models/User');
        const userDoc = await User.findById(req.user.id).select('username email');
        const username = userDoc?.username || userDoc?.email || '用户';
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        finalName = `${template.name}+${username}+${ts}`;
      }
    } catch (e) {
      // 回退到旧的命名方式
      finalName = `${template.name}（克隆策略）`;
    }

    // 创建策略
    const strategy = new Strategy({
      name: finalName,
      description: template.description || '由模板克隆生成的策略',
      type: template.category?.name,
      code: template.code,
      parameters: template.params || {},
      status: '未启用',
      user: req.user.id
    });

    await strategy.save();

    res.status(201).json({
      message: '策略已从模板克隆',
      strategy
    });
  } catch (error) {
    console.error('克隆策略失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新策略
exports.updateStrategy = async (req, res) => {
  try {
    const { name, description, type, code, parameters, status } = req.body;
    
    const strategy = await Strategy.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    strategy.name = name || strategy.name;
    strategy.description = description || strategy.description;
    strategy.type = type || strategy.type;
    strategy.code = code || strategy.code;
    strategy.parameters = parameters || strategy.parameters;
    strategy.status = status || strategy.status;
    strategy.updatedAt = Date.now();
    
    await strategy.save();
    
    res.json({
      message: '策略更新成功',
      strategy
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除策略
exports.deleteStrategy = async (req, res) => {
  try {
    const strategy = await Strategy.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!strategy) {
      return res.status(404).json({ message: '策略不存在' });
    }
    
    res.json({ message: '策略删除成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 代码编译（SSE流式输出）
exports.compileStrategySSE = async (req, res) => {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (obj) => {
    try {
      res.write(`data: ${JSON.stringify({ ts: Date.now(), ...obj })}\n\n`);
    } catch (e) {
      // 忽略写入错误
    }
  };

  const end = (final) => {
    try {
      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify(final)}\n\n`);
    } finally {
      res.end();
    }
  };

  // 解析Python命令
  const trySpawnPython = (args, onData) => new Promise((resolve) => {
    let tried = [];
    const attempt = (cmdIndex) => {
      const cmds = ['python', 'py'];
      if (cmdIndex >= cmds.length) {
        return resolve({ error: new Error('未找到Python执行器'), code: -1 });
      }
      const cmd = cmds[cmdIndex];
      tried.push(cmd);
      const p = spawn(cmd, args);
      p.stdout.on('data', (d) => onData && onData('stdout', d));
      p.stderr.on('data', (d) => onData && onData('stderr', d));
      p.on('error', (err) => {
        // 尝试下一个命令
        attempt(cmdIndex + 1);
      });
      p.on('close', (code) => resolve({ code, cmd }));
    };
    attempt(0);
  });

  try {
    const id = req.params.id;
    const strategy = await Strategy.findOne({ _id: id, user: req.user.id });
    if (!strategy) {
      send({ level: 'error', message: '策略不存在或无权限' });
      return end({ status: 'error', message: '策略不存在或无权限' });
    }

    const code = strategy.code || '';
    send({ level: 'info', message: '开始编译策略代码（Python）...' });

    // 基础检查
    if (!code || code.trim().length === 0) {
      send({ level: 'error', message: '代码为空，无法编译' });
      return end({ status: 'error', message: '代码为空' });
    }
    send({ level: 'info', message: `代码长度: ${code.length} 字符` });

    // 写入临时文件
    const tmpBase = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'helix-strategy-'));
    const pyFile = path.join(tmpBase, 'strategy.py');
    await fs.promises.writeFile(pyFile, code, { encoding: 'utf8' });
    send({ level: 'info', message: `已写入临时文件: ${pyFile}` });

    // 调用Python编译器: py_compile
    send({ level: 'info', message: '调用Python编译器: python -m py_compile strategy.py' });
    const compileResult = await trySpawnPython(['-m', 'py_compile', pyFile], (stream, data) => {
      const text = data.toString();
      if (text.trim().length > 0) {
        send({ level: stream === 'stderr' ? 'error' : 'info', message: text });
      }
    });

    if (compileResult.error) {
      send({ level: 'error', message: `无法启动Python编译器: ${compileResult.error.message}` });
      return end({ status: 'error', message: '未安装Python或不可用' });
    }

    if (compileResult.code !== 0) {
      send({ level: 'error', message: `编译失败，退出码: ${compileResult.code}` });
      // 查找错误日志已通过stderr输出发送
      try { await fs.promises.rm(tmpBase, { recursive: true, force: true }); } catch (_) {}
      return end({ status: 'error', message: 'Python编译失败' });
    }

    // 查找产物（__pycache__中的pyc）
    let artifact = { compiledAt: new Date().toISOString(), tempDir: tmpBase };
    const cacheDir = path.join(tmpBase, '__pycache__');
    try {
      const files = await fs.promises.readdir(cacheDir);
      const pyc = files.find(f => f.endsWith('.pyc'));
      if (pyc) {
        const compiledFile = path.join(cacheDir, pyc);
        const stat = await fs.promises.stat(compiledFile);
        artifact.compiledFile = compiledFile;
        artifact.size = stat.size;
        send({ level: 'success', message: `编译成功，生成: ${compiledFile} (${stat.size} 字节)` });
      } else {
        send({ level: 'warning', message: '未找到pyc产物（可能由环境或版本差异导致）' });
      }
    } catch (e) {
      send({ level: 'warning', message: `检查编译产物失败: ${e.message}` });
    }

    // 清理临时目录（如需保留供调试，可注释掉）
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
      send({ level: 'info', message: '已清理临时编译目录' });
      delete artifact.tempDir;
    } catch (e) {
      // 忽略清理失败
    }

    return end({ status: 'success', artifact });
  } catch (error) {
    console.error('编译过程异常:', error);
    send({ level: 'error', message: `编译异常: ${error.message}` });
    return end({ status: 'error', message: error.message });
  }
};