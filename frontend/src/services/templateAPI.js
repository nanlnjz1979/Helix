import api from './api';

/**
 * 获取模板列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.status - 模板状态
 * @param {string} params.category - 分类ID
 * @param {string} params.source - 来源
 * @param {boolean} params.isPaid - 是否付费
 * @returns {Promise} - 返回模板列表
 */
export const getTemplates = async (params = {}) => {
  try {
    const response = await api.get('/templates', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        keyword: params.keyword,
        status: params.status,
        category: params.category,
        source: params.source,
        isPaid: params.isPaid
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取模板列表失败:', error);
    throw error;
  }
};

/**
 * 获取单个模板详情
 * @param {string} templateId - 模板ID
 * @returns {Promise} - 返回模板详情
 */
export const getTemplateDetail = async (templateId) => {
  try {
    const response = await api.get(`/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('获取模板详情失败:', error);
    throw error;
  }
};

/**
 * 创建新模板
 * @param {Object} templateData - 模板数据
 * @returns {Promise} - 返回创建结果
 */
export const createTemplate = async (templateData) => {
  try {
    const response = await api.post('/templates', templateData);
    return response.data;
  } catch (error) {
    console.error('创建模板失败:', error);
    throw error;
  }
};

/**
 * 更新模板
 * @param {string} templateId - 模板ID
 * @param {Object} templateData - 模板数据
 * @returns {Promise} - 返回更新结果
 */
export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await api.put(`/templates/${templateId}`, templateData);
    return response.data;
  } catch (error) {
    console.error('更新模板失败:', error);
    throw error;
  }
};

/**
 * 删除模板
 * @param {string} templateId - 模板ID
 * @returns {Promise} - 返回删除结果
 */
export const deleteTemplate = async (templateId) => {
  try {
    const response = await api.delete(`/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('删除模板失败:', error);
    throw error;
  }
};

/**
 * 切换模板状态（上下架）
 * @param {string} templateId - 模板ID
 * @param {string} status - 目标状态（published/draft/offline）
 * @returns {Promise} - 返回操作结果
 */
export const changeTemplateStatus = async (templateId, status) => {
  try {
    const response = await api.patch(`/templates/${templateId}/status`, {
      status
    });
    return response.data;
  } catch (error) {
    console.error('切换模板状态失败:', error);
    throw error;
  }
};

/**
 * 克隆模板
 * @param {string} templateId - 模板ID
 * @param {Object} cloneData - 克隆参数
 * @returns {Promise} - 返回克隆结果
 */
export const cloneTemplate = async (templateId, cloneData = {}) => {
  try {
    const response = await api.post(`/templates/${templateId}/clone`, cloneData);
    return response.data;
  } catch (error) {
    console.error('克隆模板失败:', error);
    throw error;
  }
};

/**
 * 获取模板分类列表
 * @returns {Promise} - 返回分类列表
 */
export const getTemplateCategories = async () => {
  try {
    const response = await api.get('/template-categories');
    return response.data;
  } catch (error) {
    console.error('获取模板分类失败:', error);
    throw error;
  }
};

/**
 * 创建模板分类
 * @param {Object} categoryData - 分类数据
 * @returns {Promise} - 返回创建结果
 */
export const createTemplateCategory = async (categoryData) => {
  try {
    const response = await api.post('/template-categories', categoryData);
    return response.data;
  } catch (error) {
    console.error('创建模板分类失败:', error);
    throw error;
  }
};

/**
 * 更新模板分类
 * @param {string} categoryId - 分类ID
 * @param {Object} categoryData - 分类数据
 * @returns {Promise} - 返回更新结果
 */
export const updateTemplateCategory = async (categoryId, categoryData) => {
  try {
    const response = await api.put(`/template-categories/${categoryId}`, categoryData);
    return response.data;
  } catch (error) {
    console.error('更新模板分类失败:', error);
    throw error;
  }
};

/**
 * 删除模板分类
 * @param {string} categoryId - 分类ID
 * @returns {Promise} - 返回删除结果
 */
export const deleteTemplateCategory = async (categoryId) => {
  try {
    const response = await api.delete(`/template-categories/${categoryId}`);
    return response.data;
  } catch (error) {
    console.error('删除模板分类失败:', error);
    throw error;
  }
};

/**
 * 获取待审核的模板列表
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回待审核模板列表
 */
export const getPendingTemplates = async (params = {}) => {
  try {
    const response = await api.get('/templates/pending', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取待审核模板失败:', error);
    throw error;
  }
};

/**
 * 审核模板
 * @param {string} templateId - 模板ID
 * @param {Object} reviewData - 审核数据
 * @param {string} reviewData.status - 审核结果（approved/rejected）
 * @param {string} reviewData.reason - 驳回理由
 * @returns {Promise} - 返回审核结果
 */
export const reviewTemplate = async (templateId, reviewData) => {
  try {
    const response = await api.post(`/templates/${templateId}/review`, reviewData);
    return response.data;
  } catch (error) {
    console.error('审核模板失败:', error);
    throw error;
  }
};

/**
 * 测试模板代码
 * @param {string} templateId - 模板ID
 * @param {string} code - 策略代码
 * @returns {Promise} - 返回测试结果
 */
export const testTemplateCode = async (templateId, code) => {
  try {
    const response = await api.post(`/templates/${templateId}/test`, {
      code
    });
    return response.data;
  } catch (error) {
    console.error('测试模板代码失败:', error);
    throw error;
  }
};

/**
 * 获取模板使用统计
 * @param {string} templateId - 模板ID（可选，不填则获取所有模板统计）
 * @returns {Promise} - 返回统计数据
 */
export const getTemplateStats = async (templateId = null) => {
  try {
    const url = templateId 
      ? `/templates/${templateId}/stats` 
      : '/templates/stats';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('获取模板统计失败:', error);
    throw error;
  }
};

/**
 * 获取模板版本历史
 * @param {string} templateId - 模板ID
 * @returns {Promise} - 返回版本历史
 */
export const getTemplateVersions = async (templateId) => {
  try {
    const response = await api.get(`/templates/${templateId}/versions`);
    return response.data;
  } catch (error) {
    console.error('获取模板版本历史失败:', error);
    throw error;
  }
};

export default {
  getTemplates,
  getTemplateDetail,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  changeTemplateStatus,
  cloneTemplate,
  getTemplateCategories,
  createTemplateCategory,
  updateTemplateCategory,
  deleteTemplateCategory,
  getPendingTemplates,
  reviewTemplate,
  testTemplateCode,
  getTemplateStats,
  getTemplateVersions
};