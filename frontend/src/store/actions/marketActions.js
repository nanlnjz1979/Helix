// 市场数据相关的action

// 获取市场数据请求
export const fetchMarketDataRequest = () => ({
  type: 'FETCH_MARKET_DATA_REQUEST'
});

// 获取市场数据成功
export const fetchMarketDataSuccess = (data) => ({
  type: 'FETCH_MARKET_DATA_SUCCESS',
  payload: data
});

// 获取市场数据失败
export const fetchMarketDataFailure = (error) => ({
  type: 'FETCH_MARKET_DATA_FAILURE',
  payload: error
});

// 选择股票
export const selectStock = (stock) => ({
  type: 'SELECT_STOCK',
  payload: stock
});

// 设置时间周期
export const setTimePeriod = (period) => ({
  type: 'SET_TIME_PERIOD',
  payload: period
});

// 刷新市场数据
export const refreshMarketData = () => {
  return (dispatch) => {
    dispatch(fetchMarketDataRequest());
    
    // 模拟API请求
    setTimeout(() => {
      // 生成模拟数据
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX'];
      const stocks = symbols.map(symbol => ({
        symbol,
        name: getStockName(symbol),
        price: parseFloat((Math.random() * 500 + 100).toFixed(2)),
        change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
        changePercent: parseFloat((Math.random() * 5 - 2.5).toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        marketCap: parseFloat((Math.random() * 1000 + 100).toFixed(2))
      }));
      
      dispatch(fetchMarketDataSuccess(stocks));
    }, 800);
  };
};

// 根据股票代码获取股票名称
const getStockName = (symbol) => {
  const stockNames = {
    'AAPL': '苹果公司',
    'MSFT': '微软公司',
    'GOOGL': '谷歌公司',
    'AMZN': '亚马逊公司',
    'META': '元宇宙公司',
    'TSLA': '特斯拉公司',
    'NVDA': '英伟达公司',
    'NFLX': '奈飞公司'
  };
  return stockNames[symbol] || symbol;
};

// 获取K线图数据
export const fetchKlineData = (symbol, period = '1D') => {
  return (dispatch) => {
    // 模拟API请求
    setTimeout(() => {
      const klineData = generateKlineData(symbol, period);
      dispatch({
        type: 'FETCH_KLINE_DATA_SUCCESS',
        payload: {
          symbol,
          period,
          data: klineData
        }
      });
    }, 500);
  };
};

// 生成K线图模拟数据
const generateKlineData = (symbol, period) => {
  const data = [];
  const count = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 365;
  let basePrice = Math.random() * 100 + 100;
  
  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.02;
    const open = parseFloat((basePrice + (Math.random() * volatility * 2 - volatility)).toFixed(2));
    const close = parseFloat((open + (Math.random() * volatility * 2 - volatility)).toFixed(2));
    const high = parseFloat((Math.max(open, close) + Math.random() * volatility).toFixed(2));
    const low = parseFloat((Math.min(open, close) - Math.random() * volatility).toFixed(2));
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    
    // 更新下一个周期的基准价格
    basePrice = close;
    
    // 根据周期生成日期
    const now = new Date();
    let date;
    
    if (period === '1D') {
      date = new Date(now.getTime() - (count - i - 1) * 60 * 60 * 1000);
    } else if (period === '1W') {
      date = new Date(now.getTime() - (count - i - 1) * 24 * 60 * 60 * 1000);
    } else if (period === '1M') {
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - i - 1));
    } else {
      date = new Date(now.getFullYear(), now.getMonth() - (count - i - 1), now.getDate());
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return data;
};