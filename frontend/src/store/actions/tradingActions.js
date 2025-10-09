// 交易相关的action

// 启动自动交易
export const startTrading = () => ({
  type: 'START_TRADING'
});

// 停止自动交易
export const stopTrading = () => ({
  type: 'STOP_TRADING'
});

// 添加活跃策略
export const addActiveStrategy = (strategy) => ({
  type: 'ADD_ACTIVE_STRATEGY',
  payload: strategy
});

// 移除活跃策略
export const removeActiveStrategy = (id) => ({
  type: 'REMOVE_ACTIVE_STRATEGY',
  payload: id
});

// 启动策略
export const startStrategy = (id) => ({
  type: 'START_STRATEGY',
  payload: id
});

// 停止策略
export const stopStrategy = (id) => ({
  type: 'STOP_STRATEGY',
  payload: id
});

// 更新策略资金
export const updateStrategyCapital = (id, capital) => ({
  type: 'UPDATE_STRATEGY_CAPITAL',
  payload: {
    id,
    capital
  }
});

// 添加交易记录
export const addTrade = (trade) => ({
  type: 'ADD_TRADE',
  payload: trade
});

// 清空交易历史
export const clearTradingHistory = () => ({
  type: 'CLEAR_TRADING_HISTORY'
});

// 模拟交易操作
export const simulateTrade = () => {
  return (dispatch, getState) => {
    const state = getState();
    const { activeStrategies } = state.trading;
    const { stocks } = state.market;
    
    // 只有在自动交易开启且有活跃策略时才执行模拟交易
    if (state.trading.isTrading && activeStrategies.length > 0 && stocks.length > 0) {
      // 随机选择一个活跃策略
      const randomStrategy = activeStrategies[Math.floor(Math.random() * activeStrategies.length)];
      
      // 随机选择一个股票
      const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
      
      // 随机决定买入或卖出
      const action = Math.random() > 0.5 ? '买入' : '卖出';
      
      // 生成交易数量（1-10之间的随机数）
      const quantity = Math.floor(Math.random() * 10) + 1;
      
      // 计算交易金额
      const amount = parseFloat((randomStock.price * quantity).toFixed(2));
      
      // 创建交易记录
      const trade = {
        id: `trade_${Date.now()}`,
        date: new Date().toISOString(),
        strategy: randomStrategy.name,
        symbol: randomStock.symbol,
        action,
        price: randomStock.price,
        quantity,
        amount
      };
      
      // 添加交易记录
      dispatch(addTrade(trade));
      
      // 更新策略资金（如果是卖出，增加资金；如果是买入，减少资金）
      if (randomStrategy.status === '运行中') {
        let newCapital = randomStrategy.currentCapital;
        if (action === '卖出') {
          // 模拟卖出获利（随机1-5%的利润）
          const profitPercent = Math.random() * 0.04 + 0.01;
          newCapital += amount * (1 + profitPercent);
        } else {
          // 买入减少资金
          newCapital -= amount;
        }
        
        // 更新策略资金
        dispatch(updateStrategyCapital(randomStrategy.id, newCapital));
      }
    }
  };
};

// 启动交易模拟器
export const startTradingSimulator = () => {
  return (dispatch) => {
    // 每5秒执行一次模拟交易
    const intervalId = setInterval(() => {
      dispatch(simulateTrade());
    }, 5000);
    
    // 保存interval ID以便后续清除
    dispatch({
      type: 'SET_TRADING_SIMULATOR_INTERVAL',
      payload: intervalId
    });
  };
};

// 停止交易模拟器
export const stopTradingSimulator = () => {
  return (dispatch, getState) => {
    const state = getState();
    if (state.trading.simulatorInterval) {
      clearInterval(state.trading.simulatorInterval);
      dispatch({
        type: 'CLEAR_TRADING_SIMULATOR_INTERVAL'
      });
    }
  };
};