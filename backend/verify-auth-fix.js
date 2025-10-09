#!/usr/bin/env node
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================');
console.log('      认证功能修复验证工具           ');
console.log('====================================\n');

// 检查是否已安装依赖
function checkDependencies() {
  console.log('[1/4] 检查项目依赖...');
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const requiredDeps = ['bcryptjs', 'jsonwebtoken', 'mongoose'];
      const missingDeps = [];
      
      requiredDeps.forEach(dep => {
        if (!packageJson.dependencies[dep]) {
          missingDeps.push(dep);
        }
      });
      
      if (missingDeps.length > 0) {
        console.log(`⚠️  缺少必要的依赖: ${missingDeps.join(', ')}`);
        console.log('请先安装依赖: npm install');
        return false;
      }
      
      console.log('✓ 依赖检查通过');
      return true;
    } else {
      console.log('❌ 找不到package.json文件');
      return false;
    }
  } catch (error) {
    console.log(`❌ 依赖检查失败: ${error.message}`);
    return false;
  }
}

// 检查后端服务是否运行
function checkServiceRunning() {
  return new Promise((resolve) => {
    console.log('\n[2/4] 检查后端服务运行状态...');
    
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`✓ 服务状态: 运行中 (状态码: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (e) => {
      console.log(`❌ 服务状态: 未运行`);
      resolve(false);
    });

    req.setTimeout(2000, () => {
      console.log(`❌ 服务状态: 连接超时`);
      resolve(false);
    });

    req.end();
  });
}

// 运行简单测试
function runSimpleTest() {
  return new Promise((resolve) => {
    console.log('\n[3/4] 运行简单认证测试...');
    
    const testScript = path.join(__dirname, 'simple-auth-test.js');
    
    if (!fs.existsSync(testScript)) {
      console.log('❌ 找不到测试脚本: simple-auth-test.js');
      resolve(false);
      return;
    }
    
    console.log('运行测试...');
    const testProcess = exec(`node ${testScript}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`测试执行失败: ${error.message}`);
        resolve(false);
        return;
      }
      
      if (stderr) {
        console.log(`测试错误输出: ${stderr}`);
      }
      
      console.log(stdout);
      
      // 检查测试结果
      const successPatterns = [
        '管理员登录成功',
        '普通用户登录成功',
        '无效密码测试通过',
        '无效用户测试通过'
      ];
      
      const failures = successPatterns.filter(pattern => !stdout.includes(pattern));
      
      if (failures.length === 0) {
        console.log('✓ 所有测试通过！认证功能已成功修复。');
        resolve(true);
      } else {
        console.log(`❌ 测试未完全通过。失败项: ${failures.join(', ')}`);
        resolve(false);
      }
    });
  });
}

// 显示修复总结和使用指南
function showSummary(isFixed) {
  console.log('\n====================================');
  console.log('             修复总结                ');
  console.log('====================================');
  
  if (isFixed) {
    console.log('✓ 认证功能已成功修复！\n');
  } else {
    console.log('⚠️  认证功能尚未完全修复。\n');
  }
  
  console.log('【修复的主要问题】');
  console.log('1. 确保认证模块自动初始化');
  console.log('2. 改进模型加载逻辑和错误处理');
  console.log('3. 增强密码验证机制');
  console.log('4. 添加详细的状态监控和日志\n');
  
  console.log('【使用指南】');
  console.log('1. 启动后端服务:');
  console.log('   $ npm start 或 npm run dev\n');
  console.log('2. 运行测试:');
  console.log('   $ cd backend');
  console.log('   $ node simple-auth-test.js  # 简单测试');
  console.log('   $ node fixed-test-auth.js   # 完整测试\n');
  
  console.log('【默认用户】');
  console.log('- 管理员: username=admin, password=admin123');
  console.log('- 普通用户: username=user1, password=user123\n');
  
  console.log('【注意事项】');
  console.log('- 默认使用模拟模式，不依赖MongoDB连接');
  console.log('- 设置环境变量 USE_REAL_DB=true 可使用真实数据库');
  console.log('- 请参阅 TEST-AUTH-FIX-README.md 获取详细信息');
  console.log('====================================');
}

// 主函数
async function main() {
  try {
    const hasDependencies = checkDependencies();
    if (!hasDependencies) {
      showSummary(false);
      return;
    }
    
    const isServiceRunning = await checkServiceRunning();
    if (!isServiceRunning) {
      console.log('\n请先启动后端服务，然后再运行此验证工具。');
      console.log('启动命令: npm start 或 npm run dev');
      showSummary(false);
      return;
    }
    
    const testResult = await runSimpleTest();
    showSummary(testResult);
  } catch (error) {
    console.log(`\n验证过程中发生错误: ${error.message}`);
    showSummary(false);
  }
}

// 运行验证
main();