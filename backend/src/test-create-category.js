// 测试Category构造函数和createCategory功能
console.log('===== 测试Category构造函数和createCategory功能 =====');
console.log('测试开始时间:', new Date().toLocaleString());

// 模拟request和response对象
function createMockRequest(body, user = { _id: 'mock_user_id' }) {
  return {
    body,
    user
  };
}

function createMockResponse() {
  const res = {};
  res.status = function(statusCode) {
    this.statusCode = statusCode;
    return this;
  };
  res.json = function(data) {
    this.jsonData = data;
    console.log(`响应状态码: ${this.statusCode}`);
    console.log(`响应数据:`, data);
    return this;
  };
  res.send = function(data) {
    this.sendData = data;
    console.log(`发送数据:`, data);
    return this;
  };
  return res;
}

// 尝试加载控制器
let categoryController;
let mongoose;

try {
  // 加载必要的模块
  mongoose = require('mongoose');
  console.log('mongoose版本:', mongoose.version);
  console.log('MongoDB连接状态:', mongoose.connection.readyState);
  
  // 加载控制器
  categoryController = require('./controllers/categoryController');
  console.log('控制器加载成功');
  console.log('控制器导出的方法:', Object.keys(categoryController));
  
  // 立即测试createCategory函数
  async function runTests() {
    try {
      // 测试1: 调用createCategory函数
      console.log('\n🔍 测试1: 调用createCategory函数');
      try {
        const mockReq = createMockRequest({
          name: '测试类别',
          description: '测试描述',
          visibility: 'public'
        });
        const mockRes = createMockResponse();
        
        console.log('准备调用createCategory...');
        await categoryController.createCategory(mockReq, mockRes);
        console.log('✅ createCategory函数执行成功');
        
        // 检查响应
        if (mockRes.statusCode === 201 && mockRes.jsonData && mockRes.jsonData.category) {
          console.log('类别创建成功:', mockRes.jsonData.category);
          console.log('类别名称:', mockRes.jsonData.category.name);
          console.log('✅ Category构造函数功能正常工作！');
        } else if (mockRes.statusCode === 500) {
          console.error('❌ 创建类别失败，服务器错误:', mockRes.jsonData?.error);
        } else {
          console.error('❌ 创建类别失败，未知响应状态:', mockRes.statusCode);
        }
      } catch (err) {
        console.error('❌ createCategory函数执行异常:', err.message);
        console.error('错误堆栈:', err.stack);
        // 特别检查是否是构造函数错误
        if (err.message.includes('Category is not a constructor')) {
          console.error('❌ 仍然存在构造函数错误！');
        }
      }
      
    } catch (err) {
      console.error('❌ 测试过程中出错:', err.message);
      console.error('错误堆栈:', err.stack);
    }
    
    console.log('\n===== 测试结束 =====');
    console.log('测试结束时间:', new Date().toLocaleString());
  }
  
  // 立即运行测试
  runTests();
  
} catch (err) {
  console.error('❌ 加载模块失败:', err.message);
  console.error('错误堆栈:', err.stack);
  console.log('\n===== 测试结束 =====');
}