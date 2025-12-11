# 模拟账户和持仓 API 文档

## 1. 概述

本文档描述了模拟账户和持仓管理系统的 API 接口，包括账户资金管理和持仓管理的相关功能。

## 2. 基本信息

- **API 基础 URL**: `http://localhost:5000/api/simulator`
- **认证方式**: JWT Token（在请求头中添加 `Authorization: Bearer <token>`）
- **数据格式**: JSON
- **状态码**: 标准 HTTP 状态码

## 3. 账户 API

### 3.1 保存/更新账户信息

**端点**: `POST /account`

**功能**: 创建或更新账户信息

**请求体**: 
```json
{
  "strategiesId": "60d60d6099b8969b712cb9c",  // 策略ID，必填
  "userId": "80d60d6099b8969b7122dc3",         // 用户ID，必填
  "gatewayName": "CUSTOM",                     // 网关名称，必填
  "balance": 100000.0,                         // 总资金，可选，默认0
  "available": 98000.0,                        // 可用资金，可选，默认0
  "frozen": 2000.0,                            // 冻结资金，可选，默认0
  "status": "ACTIVE",                          // 账户状态：ACTIVE/FROZEN/CLOSED/KILLPOS，可选，默认ACTIVE
  "totalPnl": 1500.0,                          // 总盈亏，可选，默认0
  "realizedPnl": 500.0,                        // 已实现盈亏，可选，默认0
  "unrealizedPnl": 1000.0,                      // 浮动盈亏，可选，默认0
  "changeTime": "2025-12-08T09:30:00.000Z",   // 变动时间，可选，默认当前时间
  "changeType": "TRADE"                        // 变动类型：TRADE/DEPOSIT/WITHDRAW/INITIAL，必填
}
```

**响应**: 
```json
{
  "message": "账户信息保存成功",
  "account": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "balance": 100000.0,
    "available": 98000.0,
    "frozen": 2000.0,
    "status": "ACTIVE",
    "totalPnl": 1500.0,
    "realizedPnl": 500.0,
    "unrealizedPnl": 1000.0,
    "changeTime": "2025-12-08T09:30:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T09:30:00.000Z"
  }
}
```

### 3.2 获取账户列表

**端点**: `GET /account`

**功能**: 获取账户列表

**查询参数**: 
- `strategyId`: 策略ID
- `userId`: 用户ID
- `gatewayName`: 网关名称
- `status`: 账户状态

**响应**: 
```json
{
  "message": "获取账户列表成功",
  "accounts": [
    {
      "_id": "675643210987654321098765",
      "strategiesId": "60d60d6099b8969b712cb9c",
      "userId": "80d60d6099b8969b7122dc3",
      "gatewayName": "CUSTOM",
      "balance": 100000.0,
      "available": 98000.0,
      "frozen": 2000.0,
      "status": "ACTIVE",
      "totalPnl": 1500.0,
      "realizedPnl": 500.0,
      "unrealizedPnl": 1000.0,
      "changeTime": "2025-12-08T09:30:00.000Z",
      "changeType": "TRADE",
      "createdAt": "2025-12-08T09:30:00.000Z",
      "updatedAt": "2025-12-08T09:30:00.000Z"
    }
  ]
}
```

### 3.3 获取单个账户信息

**端点**: `GET /account/:id`

**功能**: 获取单个账户的详细信息

**路径参数**: 
- `id`: 账户ID

**响应**: 
```json
{
  "message": "获取账户信息成功",
  "account": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "balance": 100000.0,
    "available": 98000.0,
    "frozen": 2000.0,
    "status": "ACTIVE",
    "totalPnl": 1500.0,
    "realizedPnl": 500.0,
    "unrealizedPnl": 1000.0,
    "changeTime": "2025-12-08T09:30:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T09:30:00.000Z"
  }
}
```

### 3.4 更新账户信息

**端点**: `PUT /account/:id`

**功能**: 更新账户信息

**路径参数**: 
- `id`: 账户ID

**请求体**: 
```json
{
  "balance": 105000.0,
  "available": 103000.0,
  "frozen": 2000.0,
  "status": "ACTIVE",
  "totalPnl": 2000.0,
  "realizedPnl": 1000.0,
  "unrealizedPnl": 1000.0,
  "changeTime": "2025-12-08T10:00:00.000Z",
  "changeType": "TRADE"
}
```

**响应**: 
```json
{
  "message": "更新账户信息成功",
  "account": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "balance": 105000.0,
    "available": 103000.0,
    "frozen": 2000.0,
    "status": "ACTIVE",
    "totalPnl": 2000.0,
    "realizedPnl": 1000.0,
    "unrealizedPnl": 1000.0,
    "changeTime": "2025-12-08T10:00:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T10:00:00.000Z"
  }
}
```

### 3.5 删除账户信息

**端点**: `DELETE /account/:id`

**功能**: 删除账户信息

**路径参数**: 
- `id`: 账户ID

**响应**: 
```json
{
  "message": "删除账户信息成功"
}
```

### 3.6 获取指定用户的账户列表

**端点**: `GET /account/by-user/:userId`

**功能**: 获取指定用户的账户列表

**路径参数**: 
- `userId`: 用户ID

**响应**: 
```json
{
  "message": "获取用户账户列表成功",
  "accounts": [
    {
      "_id": "675643210987654321098765",
      "strategiesId": "60d60d6099b8969b712cb9c",
      "userId": "80d60d6099b8969b7122dc3",
      "gatewayName": "CUSTOM",
      "balance": 100000.0,
      "available": 98000.0,
      "frozen": 2000.0,
      "status": "ACTIVE",
      "totalPnl": 1500.0,
      "realizedPnl": 500.0,
      "unrealizedPnl": 1000.0,
      "changeTime": "2025-12-08T09:30:00.000Z",
      "changeType": "TRADE",
      "createdAt": "2025-12-08T09:30:00.000Z",
      "updatedAt": "2025-12-08T09:30:00.000Z"
    }
  ]
}
```

## 4. 持仓 API

### 4.1 保存/更新持仓信息

**端点**: `POST /positions`

**功能**: 创建或更新持仓信息

**请求体**: 
```json
{
  "strategiesId": "60d60d6099b8969b712cb9c",  // 策略ID，必填
  "userId": "80d60d6099b8969b7122dc3",         // 用户ID，必填
  "gatewayName": "CUSTOM",                     // 网关名称，必填
  "symbol": "000001",                          // 合约代码，必填
  "exchange": "SSE",                          // 交易所，必填
  "direction": "LONG",                         // 持仓方向：LONG/SHORT，必填
  "volume": 1000,                               // 持仓数量，必填
  "price": 10.0,                                // 持仓均价（成本价），必填
  "frozen": 200,                                // 冻结数量，可选，默认0
  "totalPnl": 1500.0,                            // 总盈亏，可选，默认0
  "changeTime": "2025-12-08T09:30:00.000Z",   // 变动时间，可选，默认当前时间
  "changeType": "TRADE"                        // 变动类型：TRADE/PRICE_CHANGE/INITIAL，必填
}
```

**响应**: 
```json
{
  "message": "持仓信息保存成功",
  "position": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "symbol": "000001",
    "exchange": "SSE",
    "direction": "LONG",
    "volume": 1000,
    "price": 10.0,
    "frozen": 200,
    "totalPnl": 1500.0,
    "changeTime": "2025-12-08T09:30:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T09:30:00.000Z"
  }
}
```

### 4.2 获取持仓列表

**端点**: `GET /positions`

**功能**: 获取持仓列表

**查询参数**: 
- `strategyId`: 策略ID
- `userId`: 用户ID
- `gatewayName`: 网关名称
- `symbol`: 合约代码
- `exchange`: 交易所
- `direction`: 持仓方向

**响应**: 
```json
{
  "message": "获取持仓列表成功",
  "positions": [
    {
      "_id": "675643210987654321098765",
      "strategiesId": "60d60d6099b8969b712cb9c",
      "userId": "80d60d6099b8969b7122dc3",
      "gatewayName": "CUSTOM",
      "symbol": "000001",
      "exchange": "SSE",
      "direction": "LONG",
      "volume": 1000,
      "price": 10.0,
      "frozen": 200,
      "totalPnl": 1500.0,
      "changeTime": "2025-12-08T09:30:00.000Z",
      "changeType": "TRADE",
      "createdAt": "2025-12-08T09:30:00.000Z",
      "updatedAt": "2025-12-08T09:30:00.000Z"
    }
  ]
}
```

### 4.3 获取单个持仓信息

**端点**: `GET /positions/:id`

**功能**: 获取单个持仓的详细信息

**路径参数**: 
- `id`: 持仓ID

**响应**: 
```json
{
  "message": "获取持仓信息成功",
  "position": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "symbol": "000001",
    "exchange": "SSE",
    "direction": "LONG",
    "volume": 1000,
    "price": 10.0,
    "frozen": 200,
    "totalPnl": 1500.0,
    "changeTime": "2025-12-08T09:30:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T09:30:00.000Z"
  }
}
```

### 4.4 更新持仓信息

**端点**: `PUT /positions/:id`

**功能**: 更新持仓信息

**路径参数**: 
- `id`: 持仓ID

**请求体**: 
```json
{
  "volume": 1500,
  "price": 10.5,
  "frozen": 300,
  "totalPnl": 2500.0,
  "changeTime": "2025-12-08T10:00:00.000Z",
  "changeType": "TRADE"
}
```

**响应**: 
```json
{
  "message": "更新持仓信息成功",
  "position": {
    "_id": "675643210987654321098765",
    "strategiesId": "60d60d6099b8969b712cb9c",
    "userId": "80d60d6099b8969b7122dc3",
    "gatewayName": "CUSTOM",
    "symbol": "000001",
    "exchange": "SSE",
    "direction": "LONG",
    "volume": 1500,
    "price": 10.5,
    "frozen": 300,
    "totalPnl": 2500.0,
    "changeTime": "2025-12-08T10:00:00.000Z",
    "changeType": "TRADE",
    "createdAt": "2025-12-08T09:30:00.000Z",
    "updatedAt": "2025-12-08T10:00:00.000Z"
  }
}
```

### 4.5 删除持仓信息

**端点**: `DELETE /positions/:id`

**功能**: 删除持仓信息

**路径参数**: 
- `id`: 持仓ID

**响应**: 
```json
{
  "message": "删除持仓信息成功"
}
```

### 4.6 获取指定策略的持仓列表

**端点**: `GET /positions/by-strategy/:strategyId`

**功能**: 获取指定策略的持仓列表

**路径参数**: 
- `strategyId`: 策略ID

**响应**: 
```json
{
  "message": "获取策略持仓列表成功",
  "positions": [
    {
      "_id": "675643210987654321098765",
      "strategiesId": "60d60d6099b8969b712cb9c",
      "userId": "80d60d6099b8969b7122dc3",
      "gatewayName": "CUSTOM",
      "symbol": "000001",
      "exchange": "SSE",
      "direction": "LONG",
      "volume": 1000,
      "price": 10.0,
      "frozen": 200,
      "totalPnl": 1500.0,
      "changeTime": "2025-12-08T09:30:00.000Z",
      "changeType": "TRADE",
      "createdAt": "2025-12-08T09:30:00.000Z",
      "updatedAt": "2025-12-08T09:30:00.000Z"
    }
  ]
}
```

## 5. 错误响应

**格式**: 
```json
{
  "message": "错误信息",
  "error": "详细错误描述"
}
```

**常见错误码**: 
- `400`: 请求参数错误
- `401`: 未授权（无效的Token）
- `404`: 资源不存在
- `500`: 服务器内部错误

## 6. 使用示例

### 6.1 保存账户信息

```bash
curl -X POST http://localhost:5000/api/simulator/account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"strategiesId":"60d60d6099b8969b712cb9c","userId":"80d60d6099b8969b7122dc3","gatewayName":"CUSTOM","balance":100000.0,"available":98000.0,"frozen":2000.0,"status":"ACTIVE","totalPnl":1500.0,"realizedPnl":500.0,"unrealizedPnl":1000.0,"changeType":"TRADE"}'
```

### 6.2 保存持仓信息

```bash
curl -X POST http://localhost:5000/api/simulator/positions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"strategiesId":"60d60d6099b8969b712cb9c","userId":"80d60d6099b8969b7122dc3","gatewayName":"CUSTOM","symbol":"000001","exchange":"SSE","direction":"LONG","volume":1000,"price":10.0,"frozen":200,"totalPnl":1500.0,"changeType":"TRADE"}'
```

## 7. 注意事项

1. **认证**: 所有API请求都需要在请求头中添加有效的JWT Token
2. **幂等性**: POST请求使用upsert操作，支持重复调用
3. **数据验证**: 所有请求都会进行严格的数据验证，确保数据的完整性和合法性
4. **枚举值**: 方向、状态、变动类型等字段必须使用规定的枚举值
5. **ObjectId**: strategiesId和userId必须是有效的MongoDB ObjectId格式
6. **数值范围**: 资金和持仓数量等数值字段必须符合合理的范围要求

## 8. 版本历史

- **v1.0.0** (2025-12-08): 初始版本，包含账户和持仓的基本功能

## 9. 维护人员

- 开发团队: 量化交易平台开发组
- 联系邮箱: dev@quant-trading-platform.com
- 文档更新时间: 2025-12-08
