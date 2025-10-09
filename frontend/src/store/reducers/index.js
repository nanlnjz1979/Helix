import { combineReducers } from 'redux';
import authReducer from './authReducer';
import marketReducer from './marketReducer';
import strategyReducer from './strategyReducer';
import tradingReducer from './tradingReducer';

// 组合所有的reducer
const rootReducer = combineReducers({
  auth: authReducer,
  market: marketReducer,
  strategy: strategyReducer,
  trading: tradingReducer
});

export default rootReducer;