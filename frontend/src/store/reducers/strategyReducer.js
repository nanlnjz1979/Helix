// 交易策略相关的reducer

const initialState = {
  strategies: [
    {
      id: '1',
      name: '均线交叉策略',
      description: '当短期均线上穿长期均线时买入，下穿时卖出',
      type: '技术指标',
      status: '已启用',
      createdAt: '2023-05-15'
    },
    {
      id: '2',
      name: 'RSI超买超卖策略',
      description: '当RSI指标低于30时买入，高于70时卖出',
      type: '技术指标',
      status: '已启用',
      createdAt: '2023-05-20'
    },
    {
      id: '3',
      name: '布林带突破策略',
      description: '价格突破上轨时买入，突破下轨时卖出',
      type: '技术指标',
      status: '未启用',
      createdAt: '2023-05-25'
    }
  ],
  selectedStrategy: null,
  loading: false,
  error: null
};

const strategyReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_STRATEGIES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_STRATEGIES_SUCCESS':
      return {
        ...state,
        strategies: action.payload,
        loading: false,
        error: null
      };
    case 'FETCH_STRATEGIES_FAIL':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'CREATE_STRATEGY':
      return {
        ...state,
        strategies: [...state.strategies, action.payload]
      };
    case 'UPDATE_STRATEGY':
      return {
        ...state,
        strategies: state.strategies.map(strategy =>
          strategy.id === action.payload.id ? action.payload : strategy
        )
      };
    case 'DELETE_STRATEGY':
      return {
        ...state,
        strategies: state.strategies.filter(strategy => strategy.id !== action.payload)
      };
    case 'SET_SELECTED_STRATEGY':
      return {
        ...state,
        selectedStrategy: action.payload
      };
    default:
      return state;
  }
};

export default strategyReducer;