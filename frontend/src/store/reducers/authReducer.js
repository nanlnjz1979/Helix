// 认证相关的reducer

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  registering: false,
  changingPassword: false
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
    case 'REGISTER_REQUEST':
      return {
        ...state,
        registering: true,
        error: null
      };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        registering: false,
        error: null
      };
    case 'REGISTER_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        registering: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...initialState
      };
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        token: localStorage.getItem('token'),
        loading: false,
        error: null
      };
    case 'LOAD_USER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOAD_USER_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
    case 'CHANGE_PASSWORD_REQUEST':
      return {
        ...state,
        changingPassword: true,
        error: null
      };
    case 'CHANGE_PASSWORD_SUCCESS':
      return {
        ...state,
        changingPassword: false
      };
    case 'CHANGE_PASSWORD_FAILURE':
      return {
        ...state,
        changingPassword: false,
        error: action.payload
      };
    default:
      return state;
  }
};

export default authReducer;