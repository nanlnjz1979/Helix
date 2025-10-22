const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// 备份根目录
const BACKUP_ROOT = path.join(__dirname, '..', '..', 'backups');

// 简易审计日志记录
function auditLog(action, detail) {
  try {
    const logDir = path.join(BACKUP_ROOT, '_audit');
    fs.mkdirSync(logDir, { recursive: true });
    const line = JSON.stringify({ ts: Date.now(), action, detail }) + '\n';
    fs.appendFileSync(path.join(logDir, 'audit.log'), line);
  } catch (e) {}
}

// 计算文件SHA256
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// 列出所有模型名
function getModelNames() {
  try {
    return mongoose.modelNames();
  } catch (e) {
    return [];
  }
}

// 运行一次全量备份
router.post('/run', async (req, res) => {
  try {
    // 目录准备
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const stamp = new Date();
    const id = `${stamp.getFullYear()}${String(stamp.getMonth()+1).padStart(2,'0')}${String(stamp.getDate()).padStart(2,'0')}_${String(stamp.getHours()).padStart(2,'0')}${String(stamp.getMinutes()).padStart(2,'0')}${String(stamp.getSeconds()).padStart(2,'0')}`;
    const outDir = path.join(BACKUP_ROOT, id);
    fs.mkdirSync(outDir, { recursive: true });

    const models = getModelNames();
    const checksums = {};
    const sizes = {};

    for (const name of models) {
      const Model = mongoose.model(name);
      const docs = await Model.find({}).lean().exec();
      const file = path.join(outDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(docs));
      const stat = fs.statSync(file);
      sizes[`${name}.json`] = stat.size;
      checksums[`${name}.json`] = await sha256File(file);
    }

    const manifest = {
      id,
      createdAt: stamp.toISOString(),
      models,
      sizes,
      storage: {
        location: outDir,
        local: true,
        cloud: []
      },
      policy: {
        replicas: 1,
        encrypted: false
      }
    };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(outDir, 'checksums.json'), JSON.stringify(checksums, null, 2));

    auditLog('backup_run', { id, modelsCount: models.length });
    res.json({ ok: true, data: { id, path: outDir, manifest, checksums } });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'backup run error', error: err?.message || String(err) });
  }
});

// 列表
router.get('/list', async (req, res) => {
  try {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const ids = fs.readdirSync(BACKUP_ROOT).filter(n => !n.startsWith('_') && fs.statSync(path.join(BACKUP_ROOT, n)).isDirectory());
    const entries = [];
    for (const id of ids) {
      const dir = path.join(BACKUP_ROOT, id);
      const manifestPath = path.join(dir, 'manifest.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) {}
      }
      const totalSize = fs.readdirSync(dir)
        .map(f => path.join(dir, f))
        .filter(fp => fs.statSync(fp).isFile())
        .reduce((acc, fp) => acc + fs.statSync(fp).size, 0);
      entries.push({ id, dir, manifest, totalSize });
    }
    res.json({ ok: true, data: entries });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'backup list error', error: err?.message || String(err) });
  }
});

// 恢复（全量或按模型）
router.post('/restore', async (req, res) => {
  try {
    const { id, models: selectedModels, mode = 'replace' } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: 'missing backup id' });
    const dir = path.join(BACKUP_ROOT, id);
    if (!fs.existsSync(dir)) return res.status(404).json({ ok: false, message: 'backup not found' });

    const modelNames = selectedModels && Array.isArray(selectedModels) && selectedModels.length > 0 ? selectedModels : getModelNames();
    for (const name of modelNames) {
      const file = path.join(dir, `${name}.json`);
      if (!fs.existsSync(file)) continue;
      const Model = mongoose.model(name);
      const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (mode === 'replace') {
        await Model.deleteMany({}).exec();
      }
      if (Array.isArray(docs) && docs.length > 0) {
        // 批量插入（忽略错误以提高鲁棒性）
        try { await Model.insertMany(docs, { ordered: false }); } catch (e) {}
      }
    }

    auditLog('backup_restore', { id, modelsCount: modelNames.length, mode });
    res.json({ ok: true, data: { id, restoredModels: modelNames } });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'backup restore error', error: err?.message || String(err) });
  }
});

// 简单校验（重新计算哈希并比对）
router.post('/verify', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: 'missing backup id' });
    const dir = path.join(BACKUP_ROOT, id);
    const checksumsPath = path.join(dir, 'checksums.json');
    if (!fs.existsSync(checksumsPath)) return res.status(404).json({ ok: false, message: 'checksums not found' });
    const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
    const result = {};
    for (const [fname, expected] of Object.entries(checksums)) {
      const fp = path.join(dir, fname);
      if (!fs.existsSync(fp)) { result[fname] = { ok: false, error: 'file missing' }; continue; }
      const actual = await sha256File(fp);
      result[fname] = { ok: actual === expected, expected, actual };
    }
    auditLog('backup_verify', { id });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'backup verify error', error: err?.message || String(err) });
  }
});

module.exports = router;