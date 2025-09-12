// 简化的认证工具函数

// 本地存储键名
const AUTH_KEYS = {
  USER: 'auth_user',
  CREDENTIALS: 'auth_credentials', 
  LOGIN_TIME: 'auth_login_time'
};

/**
 * 保存认证信息到本地存储
 */
export const saveAuthInfo = (userInfo, account, password) => {
  try {
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userInfo));
    localStorage.setItem(AUTH_KEYS.CREDENTIALS, JSON.stringify({ account, password }));
    localStorage.setItem(AUTH_KEYS.LOGIN_TIME, JSON.stringify(new Date().toISOString()));
  } catch (error) {
    console.error('保存认证信息失败:', error);
  }
};

/**
 * 从本地存储获取认证信息
 */
export const getAuthInfo = () => {
  try {
    const user = localStorage.getItem(AUTH_KEYS.USER);
    const credentials = localStorage.getItem(AUTH_KEYS.CREDENTIALS);
    const loginTime = localStorage.getItem(AUTH_KEYS.LOGIN_TIME);
    
    if (!user || !credentials || !loginTime) {
      return null;
    }

    return {
      user: JSON.parse(user),
      credentials: JSON.parse(credentials),
      loginTime: JSON.parse(loginTime)
    };
  } catch (error) {
    console.error('获取认证信息失败:', error);
    return null;
  }
};

/**
 * 清除所有认证缓存
 */
export const clearAuthCache = () => {
  localStorage.removeItem(AUTH_KEYS.USER);
  localStorage.removeItem(AUTH_KEYS.CREDENTIALS);
  localStorage.removeItem(AUTH_KEYS.LOGIN_TIME);
};

/**
 * 检查认证是否过期（默认24小时）
 */
export const isAuthExpired = (expireHours = 24) => {
  const authInfo = getAuthInfo();
  if (!authInfo) return true;
  
  const loginDate = new Date(authInfo.loginTime);
  const now = new Date();
  const diffHours = (now - loginDate) / (1000 * 60 * 60);
  
  return diffHours > expireHours;
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = () => {
  const authInfo = getAuthInfo();
  return authInfo ? authInfo.user : null;
};

/**
 * 获取认证凭据
 */
export const getCredentials = () => {
  const authInfo = getAuthInfo();
  return authInfo ? authInfo.credentials : null;
}; 