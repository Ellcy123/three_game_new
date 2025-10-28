/**
 * useSocket Hook
 *
 * React Hook 用于在组件中方便地使用 WebSocket
 * - 自动连接和断开
 * - 自动清理监听器
 * - 提供便捷的 API
 * - TypeScript 类型支持
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socket';
import type { SocketCallback } from '../services/socket';

/**
 * useSocket Hook 返回值类型
 */
interface UseSocketReturn {
  /**
   * 发送事件到服务器
   */
  emit: (event: string, data?: any, callback?: SocketCallback) => void;

  /**
   * 监听服务器事件
   */
  on: (event: string, callback: SocketCallback) => void;

  /**
   * 移除事件监听
   */
  off: (event: string, callback?: SocketCallback) => void;

  /**
   * 监听事件一次
   */
  once: (event: string, callback: SocketCallback) => void;

  /**
   * 连接状态
   */
  isConnected: boolean;

  /**
   * Socket ID
   */
  socketId: string | undefined;

  /**
   * 发送心跳
   */
  ping: () => void;

  /**
   * 手动重连
   */
  reconnect: () => void;

  /**
   * 连接错误
   */
  error: Error | null;
}

/**
 * useSocket Hook 配置选项
 */
interface UseSocketOptions {
  /**
   * 是否自动连接（默认 true）
   */
  autoConnect?: boolean;

  /**
   * 自定义 Token（如果不提供，从 localStorage 读取）
   */
  token?: string;

  /**
   * 连接成功回调
   */
  onConnect?: () => void;

  /**
   * 断开连接回调
   */
  onDisconnect?: (reason: string) => void;

  /**
   * 连接错误回调
   */
  onError?: (error: Error) => void;
}

/**
 * useSocket Hook
 *
 * 在 React 组件中使用 WebSocket 的便捷 Hook
 *
 * @param options 配置选项
 * @returns UseSocketReturn
 *
 * @example
 * ```typescript
 * function RoomComponent() {
 *   const { emit, on, off, isConnected } = useSocket({
 *     onConnect: () => console.log('已连接'),
 *     onDisconnect: () => console.log('已断开'),
 *   });
 *
 *   useEffect(() => {
 *     const handlePlayerJoined = (data) => {
 *       console.log('玩家加入:', data);
 *     };
 *
 *     on('room:player_joined', handlePlayerJoined);
 *
 *     return () => {
 *       off('room:player_joined', handlePlayerJoined);
 *     };
 *   }, [on, off]);
 *
 *   const joinRoom = () => {
 *     emit('room:join', { room_id: 'xxx', character_type: 'cat' });
 *   };
 *
 *   return (
 *     <div>
 *       <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
 *       <button onClick={joinRoom}>加入房间</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    token: customToken,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  // ========================================
  // 状态管理
  // ========================================
  const [isConnected, setIsConnected] = useState<boolean>(socketService.isConnected());
  const [socketId, setSocketId] = useState<string | undefined>(socketService.getSocketId());
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 存储回调，避免依赖变化导致重连
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // 更新 ref
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onConnect, onDisconnect, onError]);

  // ========================================
  // 连接管理
  // ========================================
  useEffect(() => {
    // 如果不自动连接，直接返回
    if (!autoConnect) {
      return;
    }

    // 获取 Token
    const token = customToken || localStorage.getItem('token');

    if (!token) {
      console.warn('[useSocket] 未找到认证令牌，跳过连接');
      setError(new Error('未找到认证令牌'));
      return;
    }

    // 如果已经连接，跳过
    if (socketService.isConnected()) {
      console.log('[useSocket] 已连接，跳过重复连接');
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
      return;
    }

    // 连接到服务器
    console.log('[useSocket] 正在连接到服务器...');

    socketService
      .connect(token)
      .then(() => {
        console.log('[useSocket] 连接成功');
        setIsConnected(true);
        setSocketId(socketService.getSocketId());
        setError(null);
        onConnectRef.current?.();
      })
      .catch((err: Error) => {
        console.error('[useSocket] 连接失败:', err);
        setIsConnected(false);
        setError(err);
        onErrorRef.current?.(err);
      });

    // ========================================
    // 监听连接状态变化
    // ========================================
    const handleConnect = () => {
      console.log('[useSocket] Socket 已连接');
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
      setError(null);
      onConnectRef.current?.();
    };

    const handleDisconnect = (reason: string) => {
      console.log('[useSocket] Socket 已断开:', reason);
      setIsConnected(false);
      setSocketId(undefined);
      onDisconnectRef.current?.(reason);
    };

    const handleConnectError = (err: Error) => {
      console.error('[useSocket] Socket 连接错误:', err);
      setError(err);
      onErrorRef.current?.(err);
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);

    // ========================================
    // 清理
    // ========================================
    return () => {
      console.log('[useSocket] 清理 Socket 事件监听');
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);

      // 注意：不在这里断开连接，因为 Socket 是单例，可能被其他组件使用
      // 只有在应用完全卸载时才断开连接（例如用户登出）
    };
  }, [autoConnect, customToken]);

  // ========================================
  // 封装的方法
  // ========================================

  /**
   * 发送事件到服务器
   */
  const emit = useCallback(
    (event: string, data?: any, callback?: SocketCallback) => {
      socketService.emit(event, data, callback);
    },
    []
  );

  /**
   * 监听服务器事件
   */
  const on = useCallback((event: string, callback: SocketCallback) => {
    socketService.on(event, callback);
  }, []);

  /**
   * 移除事件监听
   */
  const off = useCallback((event: string, callback?: SocketCallback) => {
    socketService.off(event, callback);
  }, []);

  /**
   * 监听事件一次
   */
  const once = useCallback((event: string, callback: SocketCallback) => {
    socketService.once(event, callback);
  }, []);

  /**
   * 发送心跳
   */
  const ping = useCallback(() => {
    socketService.ping();
  }, []);

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    socketService.reconnect();
  }, []);

  // ========================================
  // 返回值
  // ========================================
  return {
    emit,
    on,
    off,
    once,
    isConnected,
    socketId,
    ping,
    reconnect,
    error,
  };
}

/**
 * useSocketEvent Hook
 *
 * 用于监听单个 Socket 事件的便捷 Hook
 * 自动处理清理
 *
 * @param event 事件名称
 * @param callback 回调函数
 * @param deps 依赖数组（可选）
 *
 * @example
 * ```typescript
 * function RoomComponent() {
 *   useSocketEvent('room:player_joined', (data) => {
 *     console.log('玩家加入:', data);
 *   });
 *
 *   return <div>房间组件</div>;
 * }
 * ```
 */
export function useSocketEvent(
  event: string,
  callback: SocketCallback,
  deps: React.DependencyList = []
): void {
  const { on, off } = useSocket({ autoConnect: true });

  useEffect(() => {
    on(event, callback);

    return () => {
      off(event, callback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, on, off, ...deps]);
}

/**
 * useSocketEmit Hook
 *
 * 返回一个发送特定事件的函数
 * 带有类型提示和回调处理
 *
 * @param event 事件名称
 * @returns 发送函数
 *
 * @example
 * ```typescript
 * function RoomComponent() {
 *   const joinRoom = useSocketEmit('room:join');
 *
 *   const handleJoin = () => {
 *     joinRoom(
 *       { room_id: 'xxx', character_type: 'cat' },
 *       (response) => {
 *         if (response.success) {
 *           console.log('加入成功');
 *         }
 *       }
 *     );
 *   };
 *
 *   return <button onClick={handleJoin}>加入房间</button>;
 * }
 * ```
 */
export function useSocketEmit(
  event: string
): (data?: any, callback?: SocketCallback) => void {
  const { emit } = useSocket({ autoConnect: true });

  return useCallback(
    (data?: any, callback?: SocketCallback) => {
      emit(event, data, callback);
    },
    [event, emit]
  );
}

/**
 * useSocketConnection Hook
 *
 * 仅用于管理连接，不提供事件方法
 * 适合在应用顶层使用
 *
 * @param options 配置选项
 * @returns 连接状态
 *
 * @example
 * ```typescript
 * function App() {
 *   const { isConnected, error } = useSocketConnection({
 *     onConnect: () => console.log('WebSocket 已连接'),
 *     onDisconnect: () => console.log('WebSocket 已断开'),
 *   });
 *
 *   return (
 *     <div>
 *       <p>连接状态: {isConnected ? '✅' : '❌'}</p>
 *       {error && <p>错误: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSocketConnection(options: UseSocketOptions = {}) {
  const { isConnected, socketId, error, reconnect } = useSocket(options);

  return {
    isConnected,
    socketId,
    error,
    reconnect,
  };
}

// 默认导出
export default useSocket;
