require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const Category = require('./src/models/Category');

// 配置项
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helix';

// 记录日志函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 创建测试服务器
async function createTestServer() {
  try {
    log('创建测试服务器...');
    const app = express();
    app.use(express.json());

    // 模拟auth中间件
    const authMiddleware = (req, res, next) => {
      // 模拟验证通过，设置用户信息
      req.user = {
        _id: '68e8a39be5f04b2ca2fa9c1e',
        role: 'admin'
      };
      log('Auth中间件: 用户验证通过，角色为admin');
      next();
    };

    // 模拟admin中间件
    const adminMiddleware = (req, res, next) => {
      if (req.user && req.user.role === 'admin') {
        log('Admin中间件: 管理员权限验证通过');
        next();
      } else {
        res.status(403).json({ message: '无管理权限' });
      }
    };

    // 直接定义测试路由，避免加载整个应用
    app.post('/api/admin/categories', authMiddleware, adminMiddleware, async (req, res) => {
      log('测试路由接收到请求，调用createCategory逻辑');
      try {
        const { name, description, parent, tags, visibility = 'public', isSystem = false } = req.body;
        log(`接收到的请求数据: name=${name}, description=${description}, parent=${parent}`);

        // 验证必填字段
        if (!name) {
          return res.status(400).json({ message: '类别名称不能为空' });
        }

        // 构建类别数据
        const categoryData = {
          name,
          description: description || '',
          parent: parent || null,
          tags: tags || [],
          visibility,
          isSystem,
          owner: req.user._id,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        log('连接数据库准备保存数据...');
        // 确保数据库连接
        if (mongoose.connection.readyState !== 1) {
          await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
          });
          log('MongoDB连接成功，当前连接状态:', mongoose.connection.readyState);
        }

        // 创建并保存类别
        const newCategory = new Category(categoryData);
        log('创建Category实例成功');
        
        const savedCategory = await newCategory.save();
        log('数据保存成功，保存的ID:', savedCategory._id);

        // 重新查询以获取完整数据
        const populatedCategory = await Category.findById(savedCategory._id).populate('children');
        log('重新查询成功，准备返回响应');

        // 返回成功响应
        res.status(201).json({
          message: '类别创建成功',
          category: populatedCategory
        });

      } catch (error) {
        log(`创建类别错误: ${error.message}`);
        res.status(500).json({ message: '服务器错误', error: error.message });
      }
    });

    return app;
  } catch (error) {
    log(`创建测试服务器失败: ${error.message}`);
    throw error;
  }
}

// 验证数据库中的记录
async function verifyDatabaseRecord(categoryName) {
  try {
    log(`验证数据库中的记录: ${categoryName}`);
    // 确保数据库连接
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }

    // 查询数据库
    const category = await Category.findOne({ name: categoryName });
    
    if (category) {
      log(`✅ 数据库验证成功: 找到策略类型 ${categoryName}`);
      log(`数据库记录ID: ${category._id}`);
      return category;
    } else {
      log(`❌ 数据库验证失败: 未找到策略类型 ${categoryName}`);
      // 查询所有类别以确认数据库状态
      const allCategories = await Category.find().limit(5);
      log(`数据库中前5个类别: ${allCategories.map(c => c.name).join(', ')}`);
      return null;
    }
  } catch (error) {
    log(`数据库验证错误: ${error.message}`);
    return null;
  }
}

// 主测试函数
async function runComprehensiveTest() {
  let testApp = null;

  try {
    log('开始全面集成测试...');
    
    // 创建测试服务器
    testApp = await createTestServer();
    
    // 准备测试数据
    const testCategoryName = `全面测试策略类型-${Date.now()}`;
    const testCategoryData = {
      name: testCategoryName,
      description: '这是一个全面测试的策略类型',
      parent: null,
      tags: ['全面测试', '集成测试', 'API测试'],
      visibility: 'public',
      isSystem: false
    };
    
    log(`准备发送测试请求，创建策略类型: ${testCategoryName}`);
    
    // 发送测试请求
    const response = await request(testApp)
      .post('/api/admin/categories')
      .send(testCategoryData)
      .set('Accept', 'application/json');
    
    log(`API响应状态码: ${response.status}`);
    log(`API响应数据: ${JSON.stringify(response.body)}`);
    
    // 验证响应
    if (response.status !== 201) {
      log(`❌ 测试失败: API返回非成功状态码 ${response.status}`);
      return;
    }
    
    if (!response.body.category || response.body.category.name !== testCategoryName) {
      log('❌ 测试失败: API返回的数据不正确');
      return;
    }
    
    log(`\n等待1秒后验证数据库...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 验证数据库记录
    const dbRecord = await verifyDatabaseRecord(testCategoryName);
    
    // 测试总结
    log('\n--- 全面测试总结 ---');
    if (response.status === 201 && dbRecord) {
      log('✅ 全面测试成功: API调用成功且数据正确保存到数据库');
      log(`API返回的ID: ${response.body.category._id}`);
      log(`数据库中的ID: ${dbRecord._id}`);
      log('\n问题定位结论:');
      log('1. 直接使用Category模型创建和保存数据正常');
      log('2. 模拟完整API调用流程也正常');
      log('3. 问题可能出在实际应用中的以下环节:');
      log('   a. 真实的身份验证逻辑');
      log('   b. 数据库连接状态检测');
      log('   c. mock模式与真实模式的切换逻辑');
      log('   d. 环境配置问题');
    } else if (response.status === 201 && !dbRecord) {
      log('❌ 测试失败: API返回成功但数据库中未找到记录');
      log('这表明后端代码中可能存在mock模式使用但未正确保存到数据库的问题');
    } else {
      log('❌ 测试失败: API调用失败');
    }
    log('---------------------');
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`);
    console.error(error.stack);
  } finally {
    // 清理资源
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      log('MongoDB连接已断开');
    }
  }
}

// 运行测试
runComprehensiveTest();