# 初始化Mock Categories到数据库

## 功能说明

这个脚本`init-categories-from-mock.js`的主要功能是将`categoryController.js`中定义的模拟策略类别数据初始化到MongoDB数据库中。

脚本会执行以下操作：
1. 连接到MongoDB数据库（使用.env文件中的配置）
2. 加载Category模型
3. 清除数据库中已存在的系统类别（`isSystem: true`的类别）
4. 初始化根类别（没有parent的类别）
5. 初始化子类别（有parent的类别）
6. 验证初始化结果

## 运行方法

在项目的backend目录下运行以下命令：

```bash
node init-categories-from-mock.js
```

## 注意事项

1. 请确保已在.env文件中正确配置了MONGODB_URI
2. 脚本会删除所有已存在的系统类别，请谨慎运行
3. 脚本会将所有模拟类别转换为MongoDB的ObjectId格式
4. 脚本会按照先根类别后子类别顺序创建，确保父子关系正确建立

## 数据来源

初始化数据来源于`categoryController.js`中的`initMockCategories()`函数，包含以下16个策略类别：

- 交易逻辑维度：趋势跟踪、均值回归、套利策略
- 交易品种维度：股票策略、期货策略
- 子类别示例：多因子选股、市值因子策略
- 风险等级维度：高风险策略、中风险策略、低风险策略
- 时间周期维度：高频策略、日内策略、日线级策略、周线级策略
- 属性标签类别：适用于牛市、需高频数据

## 验证

脚本运行完成后会显示初始化结果统计信息，并列出部分创建的类别信息。