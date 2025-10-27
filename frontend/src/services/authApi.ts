import api from './api';

// 注册数据接口
export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// 登录数据接口
export interface LoginData {
  email: string;
  password: string;
}

// 用户数据接口
export interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// 认证响应接口
export interface AuthResponse {
  user: UserData;
  token: string;
}

// 验证响应接口
export interface VerifyResponse {
  user: UserData;
}

// 认证 API 对象
export const authApi = {
  /**
   * 用户注册
   * @param data 注册数据
   * @returns 用户信息和 token
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  /**
   * 用户登录
   * @param data 登录数据
   * @returns 用户信息和 token
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  /**
   * 验证 Token
   * @returns 用户信息
   */
  verify: async (): Promise<VerifyResponse> => {
    const response = await api.get<VerifyResponse>('/api/auth/verify');
    return response.data;
  },

  /**
   * 用户登出
   * @returns void
   */
  logout: async (): Promise<void> => {
    // 清除本地存储的 token
    localStorage.removeItem('token');

    // 可选：调用后端登出接口（如果有）
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // 即使后端登出失败，也继续执行本地清理
      console.error('Logout API error:', error);
    }
  },
};

export default authApi;
