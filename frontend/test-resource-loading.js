// 测试资源加载的脚本
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 检查文件是否存在的函数
function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// 测试配置文件是否存在
console.log('=== 检查项目配置文件 ===');
const setupProxyExists = fileExists(path.join(__dirname, 'setupProxy.js'));
const manifestExists = fileExists(path.join(__dirname, 'public', 'manifest.json'));
const faviconExists = fileExists(path.join(__dirname, 'public', 'favicon.ico'));

console.log(`setupProxy.js 存在: ${setupProxyExists}`);
console.log(`manifest.json 存在: ${manifestExists}`);
console.log(`favicon.ico 存在: ${faviconExists}`);

// 检查index.js是否已经修复
console.log('\n=== 检查index.js修复 ===');
const indexJsPath = path.join(__dirname, 'src', 'index.js');
if (fileExists(indexJsPath)) {
  const indexJsContent = fs.readFileSync(indexJsPath, 'utf8');
  const hasErrorScript = indexJsContent.includes('test-register-modal.js');
  console.log(`index.js 中是否包含错误的脚本加载代码: ${hasErrorScript}`);
}

// 检查package.json中的端口配置
console.log('\n=== 检查端口配置 ===');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fileExists(packageJsonPath)) {
  const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const portConfig = packageJsonContent.scripts.start;
  console.log(`前端服务端口配置: ${portConfig}`);
}

// 创建一个简单的HTML文件来测试资源加载
const testHtmlPath = path.join(__dirname, 'public', 'test-resources.html');
const testHtmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>资源加载测试</title>
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <h1>资源加载测试页面</h1>
  <div id="test-results"></div>
  <script>
    // 测试资源加载
    const results = document.getElementById('test-results');
    let successCount = 0;
    let errorCount = 0;
    
    function logResult(message, isSuccess) {
      const div = document.createElement('div');
      div.style.padding = '5px';
      div.style.margin = '5px';
      div.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
      div.textContent = message;
      results.appendChild(div);
      
      if (isSuccess) successCount++;
      else errorCount++;
    }
    
    // 测试favicon加载
    const favicon = new Image();
    favicon.onload = () => logResult('✓ favicon.ico 加载成功', true);
    favicon.onerror = () => logResult('✗ favicon.ico 加载失败', false);
    favicon.src = '/favicon.ico?timestamp=' + Date.now();
    
    // 测试manifest.json加载
    fetch('/manifest.json?timestamp=' + Date.now())
      .then(response => {
        if (response.ok) {
          logResult('✓ manifest.json 加载成功', true);
          return response.json();
        } else {
          throw new Error('加载失败');
        }
      })
      .catch(error => logResult('✗ manifest.json 加载失败: ' + error.message, false));
      
    // 测试API代理
    fetch('/api/test-proxy?timestamp=' + Date.now())
      .then(response => {
        if (response.status === 404) {
          // 如果后端没有这个端点，404也是可以接受的，说明代理配置正确
          logResult('✓ API代理配置正确 (收到404响应，说明请求已发送到后端)', true);
        } else if (response.ok) {
          logResult('✓ API代理配置正确且后端响应成功', true);
        } else {
          logResult('⚠ API代理配置正确但后端返回错误状态码: ' + response.status, false);
        }
      })
      .catch(error => logResult('✗ API代理配置错误: ' + error.message, false));
      
    // 显示测试统计
    setTimeout(() => {
      const summary = document.createElement('div');
      summary.style.marginTop = '20px';
      summary.style.padding = '10px';
      summary.style.border = '2px solid #ccc';
      summary.textContent = '测试结果: 成功 ' + successCount + ', 失败 ' + errorCount;
      results.appendChild(summary);
    }, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync(testHtmlPath, testHtmlContent);
console.log(`\n已创建测试页面: ${testHtmlPath}`);
console.log(`请访问 http://localhost:3001/test-resources.html 进行资源加载测试`);