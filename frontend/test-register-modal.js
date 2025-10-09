// 测试注册模态框功能
console.log('测试注册模态框功能');
console.log('window.showRegisterModal:', typeof window.showRegisterModal);

// 如果showRegisterModal存在，尝试调用它
if (window.showRegisterModal) {
  console.log('调用window.showRegisterModal()...');
  try {
    window.showRegisterModal();
    console.log('调用成功');
  } catch (error) {
    console.error('调用失败:', error);
  }
} else {
  console.error('window.showRegisterModal不存在');
  // 尝试手动创建并触发事件
  const event = new Event('showRegisterModal');
  window.dispatchEvent(event);
}

// 检查RegisterModal组件是否在DOM中
setTimeout(() => {
  const registerModal = document.querySelector('.register-modal');
  console.log('注册模态框是否在DOM中:', !!registerModal);
  if (registerModal) {
    console.log('注册模态框样式:', window.getComputedStyle(registerModal).display);
  }
}, 1000);