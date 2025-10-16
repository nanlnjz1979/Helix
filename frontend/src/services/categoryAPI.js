import api from './api.js';

// 类别管理相关API
export const categoryAPI = {
  // 获取所有类别
  getAllCategories: async () => {
    console.log('[CATEGORY API] 获取所有类别');
    try {
      const response = await api.get('/admin/categories');
      console.log('[CATEGORY API] 获取类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 获取类别失败:', error);
      throw error;
    }
  },

  // 获取单个类别详情
  getCategoryById: async (categoryId) => {
    console.log('[CATEGORY API] 获取类别详情 - ID:', categoryId);
    try {
      const response = await api.get(`/admin/categories/${categoryId}`);
      console.log('[CATEGORY API] 获取类别详情成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 获取类别详情失败:', error);
      throw error;
    }
  },

  // 创建新类别
  createCategory: async (categoryData) => {
    console.log('[CATEGORY API] 创建新类别:', categoryData.name);
    try {
      const response = await api.post('/admin/categories', categoryData);
      console.log('[CATEGORY API] 创建类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 创建类别失败:', error);
      throw error;
    }
  },

  // 更新类别
  updateCategory: async (categoryId, categoryData) => {
    console.log('[CATEGORY API] 更新类别 - ID:', categoryId);
    try {
      const response = await api.put(`/admin/categories/${categoryId}`, categoryData);
      console.log('[CATEGORY API] 更新类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 更新类别失败:', error);
      throw error;
    }
  },

  // 删除类别
  deleteCategory: async (categoryId) => {
    console.log('[CATEGORY API] 删除类别 - ID:', categoryId);
    try {
      const response = await api.delete(`/admin/categories/${categoryId}`);
      console.log('[CATEGORY API] 删除类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 删除类别失败:', error);
      throw error;
    }
  },

  // 将策略关联到类别
  assignStrategyToCategory: async (strategyId, categoryIds) => {
    console.log('[CATEGORY API] 将策略关联到类别 - 策略ID:', strategyId);
    try {
      const response = await api.post(`/admin/strategies/${strategyId}/categories`, {
        categories: categoryIds
      });
      console.log('[CATEGORY API] 策略关联类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 策略关联类别失败:', error);
      throw error;
    }
  },

  // 获取策略的所有关联类别
  getStrategyCategories: async (strategyId) => {
    console.log('[CATEGORY API] 获取策略的关联类别 - 策略ID:', strategyId);
    try {
      const response = await api.get(`/admin/strategies/${strategyId}/categories`);
      console.log('[CATEGORY API] 获取策略关联类别成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 获取策略关联类别失败:', error);
      throw error;
    }
  },

  // 按类别筛选策略
  getStrategiesByCategory: async (categoryId) => {
    console.log('[CATEGORY API] 按类别筛选策略 - 类别ID:', categoryId);
    try {
      const response = await api.get(`/admin/categories/${categoryId}/strategies`);
      console.log('[CATEGORY API] 按类别筛选策略成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 按类别筛选策略失败:', error);
      throw error;
    }
  },

  // 获取类别统计数据
  getCategoryStatistics: async () => {
    console.log('[CATEGORY API] 获取类别统计数据');
    try {
      const response = await api.get('/admin/categories/statistics');
      console.log('[CATEGORY API] 获取类别统计数据成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 获取类别统计数据失败:', error);
      throw error;
    }
  },

  // 策略类别变更历史API已删除

  // 获取类别树结构
  getCategoryTree: async () => {
    console.log('[CATEGORY API] 获取类别树结构');
    try {
      const response = await api.get('/admin/categories/tree');
      console.log('[CATEGORY API] 获取类别树结构成功，响应数据:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CATEGORY API] 获取类别树结构失败:', error);
      throw error;
    }
  }
};

export default categoryAPI;