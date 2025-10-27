import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 读取 token
    const token = localStorage.getItem('token');

    // 如果 token 存在，添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response;
  },
  (error: AxiosError) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      // 清除 localStorage 中的 token
      localStorage.removeItem('token');

      // 跳转到登录页
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
