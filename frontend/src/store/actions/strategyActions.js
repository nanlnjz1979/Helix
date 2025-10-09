// 策略相关的action

// 获取策略列表请求
export const fetchStrategiesRequest = () => ({
  type: 'FETCH_STRATEGIES_REQUEST'
});

// 获取策略列表成功
export const fetchStrategiesSuccess = (strategies) => ({
  type: 'FETCH_STRATEGIES_SUCCESS',
  payload: strategies
});

// 获取策略列表失败
export const fetchStrategiesFailure = (error) => ({
  type: 'FETCH_STRATEGIES_FAILURE',
  payload: error
});

// 创建策略请求
export const createStrategyRequest = (strategy) => ({
  type: 'CREATE_STRATEGY_REQUEST'
});

// 创建策略成功
export const createStrategySuccess = (strategy) => ({
  type: 'CREATE_STRATEGY_SUCCESS',
  payload: strategy
});

// 创建策略失败
export const createStrategyFailure = (error) => ({
  type: 'CREATE_STRATEGY_FAILURE',
  payload: error
});

// 更新策略请求
export const updateStrategyRequest = (strategy) => ({
  type: 'UPDATE_STRATEGY_REQUEST'
});

// 更新策略成功
export const updateStrategySuccess = (strategy) => ({
  type: 'UPDATE_STRATEGY_SUCCESS',
  payload: strategy
});

// 更新策略失败
export const updateStrategyFailure = (error) => ({
  type: 'UPDATE_STRATEGY_FAILURE',
  payload: error
});

// 删除策略请求
export const deleteStrategyRequest = (id) => ({
  type: 'DELETE_STRATEGY_REQUEST'
});

// 删除策略成功
export const deleteStrategySuccess = (id) => ({
  type: 'DELETE_STRATEGY_SUCCESS',
  payload: id
});

// 删除策略失败
export const deleteStrategyFailure = (error) => ({
  type: 'DELETE_STRATEGY_FAILURE',
  payload: error
});

// 选择策略
export const selectStrategy = (strategy) => ({
  type: 'SELECT_STRATEGY',
  payload: strategy
});

// 获取策略列表
export const fetchStrategies = () => {
  return (dispatch) => {
    dispatch(fetchStrategiesRequest());
    
    // 模拟API请求
    setTimeout(() => {
      // 模拟策略数据
      const strategies = [
        {
          id: '1',
          name: '均线交叉策略',
          description: '基于短期均线和长期均线交叉的交易策略',
          type: '趋势跟踪',
          status: '启用',
          code: `def ma_crossover_strategy(data, short_window=5, long_window=20):\n    # 计算短期均线和长期均线\n    data['short_ma'] = data['close'].rolling(window=short_window).mean()\n    data['long_ma'] = data['close'].rolling(window=long_window).mean()\n    \n    # 生成交易信号\n    data['signal'] = 0\n    data['signal'][short_window:] = np.where(\n        data['short_ma'][short_window:] > data['long_ma'][short_window:], 1, 0\n    )\n    \n    # 生成持仓信号\n    data['position'] = data['signal'].diff()\n    \n    return data`,
          parameters: [
            { name: 'short_window', type: 'number', default: 5, min: 2, max: 50 },
            { name: 'long_window', type: 'number', default: 20, min: 5, max: 200 }
          ],
          createdAt: '2023-01-15T10:30:00Z',
          updatedAt: '2023-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'RSI超买超卖策略',
          description: '基于相对强弱指数(RSI)的超买超卖交易策略',
          type: '均值回归',
          status: '启用',
          code: `def rsi_strategy(data, period=14, overbought=70, oversold=30):\n    # 计算价格变化\n    delta = data['close'].diff()\n    \n    # 分离涨跌\n    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()\n    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()\n    \n    # 计算RSI\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    \n    # 添加到数据中\n    data['rsi'] = rsi\n    \n    # 生成交易信号\n    data['signal'] = 0\n    data['signal'][period:] = np.where(data['rsi'][period:] < oversold, 1, 0)\n    data['signal'][period:] = np.where(data['rsi'][period:] > overbought, -1, data['signal'][period:])\n    \n    # 生成持仓信号\n    data['position'] = data['signal'].diff()\n    \n    return data`,
          parameters: [
            { name: 'period', type: 'number', default: 14, min: 2, max: 50 },
            { name: 'overbought', type: 'number', default: 70, min: 50, max: 90 },
            { name: 'oversold', type: 'number', default: 30, min: 10, max: 50 }
          ],
          createdAt: '2023-01-16T14:20:00Z',
          updatedAt: '2023-01-16T14:20:00Z'
        },
        {
          id: '3',
          name: 'MACD策略',
          description: '基于移动平均收敛发散指标(MACD)的交易策略',
          type: '趋势跟踪',
          status: '停用',
          code: `def macd_strategy(data, fast_period=12, slow_period=26, signal_period=9):\n    # 计算短期和长期EMA\n    data['ema_fast'] = data['close'].ewm(span=fast_period, adjust=False).mean()\n    data['ema_slow'] = data['close'].ewm(span=slow_period, adjust=False).mean()\n    \n    # 计算MACD线\n    data['macd'] = data['ema_fast'] - data['ema_slow']\n    \n    # 计算信号线\n    data['signal_line'] = data['macd'].ewm(span=signal_period, adjust=False).mean()\n    \n    # 生成交易信号\n    data['signal'] = 0\n    data['signal'][slow_period:] = np.where(\n        data['macd'][slow_period:] > data['signal_line'][slow_period:], 1, 0\n    )\n    \n    # 生成持仓信号\n    data['position'] = data['signal'].diff()\n    \n    return data`,
          parameters: [
            { name: 'fast_period', type: 'number', default: 12, min: 5, max: 50 },
            { name: 'slow_period', type: 'number', default: 26, min: 10, max: 100 },
            { name: 'signal_period', type: 'number', default: 9, min: 2, max: 50 }
          ],
          createdAt: '2023-01-17T09:45:00Z',
          updatedAt: '2023-01-17T09:45:00Z'
        }
      ];
      
      dispatch(fetchStrategiesSuccess(strategies));
    }, 800);
  };
};

// 创建策略
export const createStrategy = (strategy) => {
  return (dispatch) => {
    dispatch(createStrategyRequest());
    
    // 模拟API请求
    setTimeout(() => {
      // 为新策略生成ID和时间戳
      const newStrategy = {
        ...strategy,
        id: `strategy_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      dispatch(createStrategySuccess(newStrategy));
    }, 800);
  };
};

// 更新策略
export const updateStrategy = (strategy) => {
  return (dispatch) => {
    dispatch(updateStrategyRequest());
    
    // 模拟API请求
    setTimeout(() => {
      // 更新时间戳
      const updatedStrategy = {
        ...strategy,
        updatedAt: new Date().toISOString()
      };
      
      dispatch(updateStrategySuccess(updatedStrategy));
    }, 800);
  };
};

// 删除策略
export const deleteStrategy = (id) => {
  return (dispatch) => {
    dispatch(deleteStrategyRequest());
    
    // 模拟API请求
    setTimeout(() => {
      dispatch(deleteStrategySuccess(id));
    }, 500);
  };
};