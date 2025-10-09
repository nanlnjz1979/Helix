// 自动交易相关的reducer

const initialState = {
  isTrading: false,
  activeStrategies: [],
  tradingHistory: [
    {
      key: '1',
      date: '2023-06-01 10:30:45',
      symbol: 'AAPL',
      type: '买入',
      price: 180.5,
      quantity: 10,
      amount: 1805
    },
    {
      key: '2',
      date: '2023-06-01 11:15:22',
      symbol: 'MSFT',
      type: '卖出',
      price: 330.2,
      quantity: 5,
      amount: 1651
    },
    {
      key: '3',
      date: '2023-06-02 09:45:10',
      symbol: 'GOOGL',
      type: '买入',
      price: 125.8,
      quantity: 8,
      amount: 1006.4
    }
  ],
  accountBalance: 100000,
  profit: 5600,
  profitPercent: 5.6,
  positions: 3,
  loading: false,
  error: null
};

const tradingReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'START_TRADING':
      return {
        ...state,
        isTrading: true,
        activeStrategies: [...state.activeStrategies, action.payload]
      };
    case 'STOP_TRADING':
      return {
        ...state,
        isTrading: state.activeStrategies.length > 1,
        activeStrategies: state.activeStrategies.filter(
          strategy => strategy.id !== action.payload
        )
      };
    case 'ADD_TRADE':
      return {
        ...state,
        tradingHistory: [action.payload, ...state.tradingHistory]
      };
    case 'UPDATE_ACCOUNT_BALANCE':
      return {
        ...state,
        accountBalance: action.payload.balance,
        profit: action.payload.profit,
        profitPercent: action.payload.profitPercent
      };
    case 'FETCH_TRADING_HISTORY_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_TRADING_HISTORY_SUCCESS':
      return {
        ...state,
        tradingHistory: action.payload,
        loading: false,
        error: null
      };
    case 'FETCH_TRADING_HISTORY_FAIL':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
};

export default tradingReducer;