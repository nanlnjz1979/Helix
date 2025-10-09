// 市场数据相关的reducer

const initialState = {
  stocks: [],
  selectedStock: 'AAPL',
  timeframe: '1d',
  loading: false,
  error: null
};

const marketReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_MARKET_DATA_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_MARKET_DATA_SUCCESS':
      return {
        ...state,
        stocks: action.payload,
        loading: false,
        error: null
      };
    case 'FETCH_MARKET_DATA_FAIL':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'SET_SELECTED_STOCK':
      return {
        ...state,
        selectedStock: action.payload
      };
    case 'SET_TIMEFRAME':
      return {
        ...state,
        timeframe: action.payload
      };
    default:
      return state;
  }
};

export default marketReducer;