/**
 * WebSocket 客户端服务
 *
 * 提供与后端 Socket.IO 服务器的实时通信功能
 * - 单例模式，确保只有一个连接
 * - 自动重连机制
 * - JWT 认证
 * - 事件监听管理
 */

import { io, Socket } from 'socket.io-client';

/**
 * Socket 事件回调函数类型
 */
type SocketCallback = (...args: any[]) => void;

/**
 * SocketService 类
 * 使用单例模式管理 WebSocket 连接
 */
class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000; // 3 秒

  /**
   * 构造函数
   * 从环境变量读取服务器地址
   */
  constructor() {
    // 从环境变量读取 WebSocket 服务器地址
    // 开发环境：http://localhost:3000
    // 生产环境：从 VITE_API_URL 读取
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.serverUrl = apiUrl;

    console.log('[SocketService] 初始化，服务器地址:', this.serverUrl);
  }

  /**
   * 连接到 WebSocket 服务器
   *
   * @param token JWT 认证令牌
   * @returns Promise<void>
   */
  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 如果已经连接，直接返回
      if (this.socket?.connected) {
        console.log('[SocketService] 已经连接，无需重新连接');
        resolve();
        return;
      }

      // 如果正在连接，等待连接完成
      if (this.isConnecting) {
        console.log('[SocketService] 正在连接中，请稍候...');
        // 等待连接完成
        this.socket?.once('connect', () => resolve());
        this.socket?.once('connect_error', (error) => reject(error));
        return;
      }

      this.isConnecting = true;
      console.log('[SocketService] 开始连接到服务器...');

      // 创建 Socket.IO 连接
      this.socket = io(this.serverUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'], // 优先使用 WebSocket，降级到轮询
        reconnection: true, // 启用自动重连
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 10000, // 最大重连延迟 10 秒
        timeout: 20000, // 连接超时 20 秒
      });

      // ========================================
      // 连接事件监听
      // ========================================

      /**
       * 连接成功
       */
      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[SocketService] ✅ 连接成功！Socket ID:', this.socket?.id);
        resolve();
      });

      /**
       * 连接错误
       */
      this.socket.on('connect_error', (error: Error) => {
        this.isConnecting = false;
        this.reconnectAttempts++;

        console.error(`[SocketService] ❌ 连接失败 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);

        // 如果是认证错误，不再重试
        if (error.message.includes('认证') || error.message.includes('令牌')) {
          console.error('[SocketService] 认证失败，停止重连');
          this.socket?.disconnect();
          reject(new Error('认证失败: ' + error.message));
          return;
        }

        // 如果达到最大重连次数，放弃重连
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[SocketService] 达到最大重连次数，停止重连');
          this.socket?.disconnect();
          reject(new Error('连接失败，已达到最大重试次数'));
        } else {
          console.log(`[SocketService] 将在 ${this.reconnectDelay / 1000} 秒后重试...`);
        }
      });

      /**
       * 断开连接
       */
      this.socket.on('disconnect', (reason: string) => {
        console.warn('[SocketService] 🔌 连接已断开，原因:', reason);

        // 如果是服务器主动断开或网络问题，尝试重连
        if (reason === 'io server disconnect') {
          console.log('[SocketService] 服务器主动断开连接，尝试重连...');
          this.socket?.connect();
        } else if (reason === 'transport close' || reason === 'ping timeout') {
          console.log('[SocketService] 网络问题导致断开，Socket.IO 将自动重连...');
        }
      });

      /**
       * 重连中
       */
      this.socket.on('reconnect', (attemptNumber: number) => {
        console.log(`[SocketService] 🔄 重连成功！尝试次数: ${attemptNumber}`);
        this.reconnectAttempts = 0;
      });

      /**
       * 重连尝试
       */
      this.socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`[SocketService] ⏳ 正在尝试重连... (${attemptNumber}/${this.maxReconnectAttempts})`);
      });

      /**
       * 重连失败
       */
      this.socket.on('reconnect_failed', () => {
        console.error('[SocketService] ❌ 重连失败，已达到最大重试次数');
      });

      /**
       * 错误处理
       */
      this.socket.on('error', (error: Error) => {
        console.error('[SocketService] ❌ Socket 错误:', error);
      });

      // ========================================
      // 心跳检测（可选）
      // ========================================
      this.socket.on('pong', (data: any) => {
        console.log('[SocketService] 💓 收到心跳响应:', data);
      });
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('[SocketService] 断开连接...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('[SocketService] ✅ 已断开连接');
    } else {
      console.log('[SocketService] 未连接，无需断开');
    }
  }

  /**
   * 发送事件到服务器
   *
   * @param event 事件名称
   * @param data 事件数据
   * @param callback 回调函数（可选）
   */
  public emit(event: string, data?: any, callback?: SocketCallback): void {
    if (!this.socket?.connected) {
      console.error('[SocketService] ❌ 未连接到服务器，无法发送事件:', event);
      return;
    }

    console.log(`[SocketService] 📤 发送事件: ${event}`, data);

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * 监听服务器事件
   *
   * @param event 事件名称
   * @param callback 回调函数
   */
  public on(event: string, callback: SocketCallback): void {
    if (!this.socket) {
      console.error('[SocketService] ❌ Socket 未初始化，无法监听事件:', event);
      return;
    }

    console.log(`[SocketService] 👂 监听事件: ${event}`);
    this.socket.on(event, callback);
  }

  /**
   * 移除事件监听
   *
   * @param event 事件名称
   * @param callback 回调函数（可选，如果不提供则移除该事件的所有监听）
   */
  public off(event: string, callback?: SocketCallback): void {
    if (!this.socket) {
      console.error('[SocketService] ❌ Socket 未初始化，无法移除事件监听:', event);
      return;
    }

    if (callback) {
      console.log(`[SocketService] 🔇 移除事件监听: ${event}`);
      this.socket.off(event, callback);
    } else {
      console.log(`[SocketService] 🔇 移除所有事件监听: ${event}`);
      this.socket.off(event);
    }
  }

  /**
   * 监听事件一次（自动移除）
   *
   * @param event 事件名称
   * @param callback 回调函数
   */
  public once(event: string, callback: SocketCallback): void {
    if (!this.socket) {
      console.error('[SocketService] ❌ Socket 未初始化，无法监听事件:', event);
      return;
    }

    console.log(`[SocketService] 👂 监听事件一次: ${event}`);
    this.socket.once(event, callback);
  }

  /**
   * 获取连接状态
   *
   * @returns boolean
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 获取 Socket ID
   *
   * @returns string | undefined
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * 发送心跳（测试连接）
   */
  public ping(): void {
    if (!this.socket?.connected) {
      console.error('[SocketService] ❌ 未连接到服务器，无法发送心跳');
      return;
    }

    console.log('[SocketService] 💓 发送心跳...');
    this.socket.emit('ping');
  }

  /**
   * 手动重连
   */
  public reconnect(): void {
    if (this.socket?.connected) {
      console.log('[SocketService] 已连接，无需重连');
      return;
    }

    console.log('[SocketService] 手动重连...');
    this.reconnectAttempts = 0;
    this.socket?.connect();
  }

  /**
   * 更新认证令牌
   * 注意：需要先断开连接，然后使用新令牌重新连接
   *
   * @param token 新的 JWT 令牌
   */
  public updateToken(token: string): Promise<void> {
    console.log('[SocketService] 更新认证令牌...');
    this.disconnect();
    return this.connect(token);
  }
}

// ========================================
// 导出单例实例
// ========================================

/**
 * Socket 服务单例实例
 * 确保整个应用只有一个 WebSocket 连接
 */
const socketService = new SocketService();

export default socketService;

// 也可以导出类型供其他模块使用
export type { SocketCallback };
