import { create } from 'zustand';
import authApi, { RegisterData, UserData } from '../services/authApi';

// 认证状态接口
interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 动作方法
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// 创建 zustand store
export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // 登录
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.login({ email, password });

      // 保存 token 到 localStorage
      localStorage.setItem('token', response.token);

      // 更新状态
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '登录失败，请重试';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // 注册
  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.register(data);

      // 保存 token 到 localStorage
      localStorage.setItem('token', response.token);

      // 更新状态
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '注册失败，请重试';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // 登出
  logout: async () => {
    set({ isLoading: true });

    try {
      await authApi.logout();

      // 清除 localStorage 中的 token
      localStorage.removeItem('token');

      // 重置状态
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // 即使登出失败，也清除本地状态
      localStorage.removeItem('token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // 检查认证状态
  checkAuth: async () => {
    const token = localStorage.getItem('token');

    // 如果没有 token，直接返回
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await authApi.verify();

      // 验证成功，更新用户状态
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // 验证失败，清除 token 和状态
      localStorage.removeItem('token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;
