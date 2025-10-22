const express = require('express');
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');
const checkDiskSpace = require('check-disk-space').default || require('check-disk-space');

// 采样计算CPU使用率（近似值）
function sampleCpuUsage(intervalMs = 300) {
  const snapshot = () => {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
    }
    return { idle, total };
  };
  const start = snapshot();
  return new Promise(resolve => {
    setTimeout(() => {
      const end = snapshot();
      const idleDiff = end.idle - start.idle;
      const totalDiff = end.total - start.total;
      const usage = totalDiff > 0 ? (100 * (1 - idleDiff / totalDiff)) : 0;
      resolve(Math.round(usage * 10) / 10);
    }, intervalMs);
  });
}

// Windows下通过 fsutil 获取磁盘容量（仅主系统盘C:，可扩展）
function getDiskInfoWindows() {
  return new Promise(resolve => {
    exec('fsutil volume diskfree C:', { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        const lines = stdout.split(/\r?\n/).filter(Boolean);
        // 解析字节数
        const freeBytes = BigInt(lines[0].match(/\d+/)?.[0] || 0);
        const totalBytes = BigInt(lines[1].match(/\d+/)?.[0] || 0);
        const usedBytes = totalBytes - freeBytes;
        const toGB = b => Number((Number(b) / 1024 / 1024 / 1024).toFixed(1));
        const usedPct = totalBytes > 0n ? Number((Number(usedBytes) / Number(totalBytes)) * 100).toFixed(1) : null;
        resolve({ total_gb: toGB(totalBytes), used_gb: toGB(usedBytes), free_gb: toGB(freeBytes), used_pct: usedPct ? Number(usedPct) : null });
      } catch (e) {
        resolve(null);
      }
    });
  });
}

async function getDiskInfo() {
  try {
    const path = process.platform === 'win32' ? 'C:' : '/';
    const info = await checkDiskSpace(path);
    const totalGb = Number((info.size / 1024 / 1024 / 1024).toFixed(1));
    const freeGb = Number((info.free / 1024 / 1024 / 1024).toFixed(1));
    const usedGb = Number(((info.size - info.free) / 1024 / 1024 / 1024).toFixed(1));
    const usedPct = totalGb > 0 ? Number((((info.size - info.free) / info.size) * 100).toFixed(1)) : null;
    return { total_gb: totalGb, used_gb: usedGb, free_gb: freeGb, used_pct: usedPct };
  } catch (e) {
    return null;
  }
}

router.get('/summary', async (req, res) => {
  try {
    const [cpuUsagePct, diskInfo] = await Promise.all([
      sampleCpuUsage(300),
      getDiskInfo()
    ]);

    const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const usedMemMb = totalMemMb - freeMemMb;
    const usedMemPercentage = Math.round((usedMemMb / totalMemMb) * 1000) / 10;

    const loadAvg = os.loadavg();
    const processMem = process.memoryUsage();

    const data = {
      hardware: {
        cpu: {
          usage_pct: typeof cpuUsagePct === 'number' ? cpuUsagePct : null,
          cores: os.cpus()?.length ?? null,
          loadavg: {
            one: loadAvg?.[0] ?? null,
            five: loadAvg?.[1] ?? null,
            fifteen: loadAvg?.[2] ?? null
          }
        },
        memory: {
          total_mb: totalMemMb,
          used_mb: usedMemMb,
          free_mb: freeMemMb,
          used_pct: usedMemPercentage
        },
        disk: diskInfo || { total_gb: null, used_gb: null, free_gb: null, used_pct: null },
        network: { input_mb: null, output_mb: null }
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        uptime_sec: os.uptime(),
        boot_time: Date.now() - (os.uptime() * 1000)
      },
      application: {
        pid: process.pid,
        node_version: process.version,
        memory_rss_mb: Math.round(processMem.rss / 1024 / 1024),
        memory_heap_used_mb: Math.round(processMem.heapUsed / 1024 / 1024),
        memory_heap_total_mb: Math.round(processMem.heapTotal / 1024 / 1024)
      },
      services: [
        { name: 'Web API', status: 'running' }
      ],
      database: {
        status: 'unknown'
      },
      availability: {
        http_ping_ms: null,
        online_ratio_24h_pct: null
      }
    };

    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'monitor summary error', error: err?.message || String(err) });
  }
});

module.exports = router;