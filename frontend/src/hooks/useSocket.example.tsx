/**
 * useSocket Hook 使用示例
 *
 * 展示如何在 React 组件中使用 useSocket Hook
 */

import React, { useEffect, useState } from 'react';
import useSocket, { useSocketEvent, useSocketEmit, useSocketConnection } from './useSocket';

// ========================================
// 示例 1: 基础使用
// ========================================

/**
 * 基础房间组件
 * 展示如何使用 useSocket Hook 连接和发送/接收事件
 */
export function Example1_BasicUsage() {
  const { emit, on, off, isConnected } = useSocket({
    onConnect: () => console.log('✅ WebSocket 已连接'),
    onDisconnect: (reason) => console.log('🔌 WebSocket 已断开:', reason),
    onError: (error) => console.error('❌ 连接错误:', error),
  });

  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    // 监听玩家加入事件
    const handlePlayerJoined = (data: any) => {
      console.log('有玩家加入:', data);
      setPlayers((prev) => [...prev, data]);
    };

    // 监听玩家离开事件
    const handlePlayerLeft = (data: any) => {
      console.log('有玩家离开:', data);
      setPlayers((prev) => prev.filter((p) => p.user_id !== data.user_id));
    };

    on('room:player_joined', handlePlayerJoined);
    on('room:player_left', handlePlayerLeft);

    // 清理监听器
    return () => {
      off('room:player_joined', handlePlayerJoined);
      off('room:player_left', handlePlayerLeft);
    };
  }, [on, off]);

  // 加入房间
  const handleJoinRoom = () => {
    emit(
      'room:join',
      {
        room_id: 'room-123',
        character_type: 'cat',
        character_name: '天一',
      },
      (response: any) => {
        if (response.success) {
          console.log('✅ 加入房间成功:', response.data);
        } else {
          console.error('❌ 加入房间失败:', response.error);
        }
      }
    );
  };

  return (
    <div>
      <h2>房间管理</h2>
      <p>连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</p>
      <button onClick={handleJoinRoom} disabled={!isConnected}>
        加入房间
      </button>
      <div>
        <h3>房间玩家 ({players.length})</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index}>{player.username}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ========================================
// 示例 2: 使用 useSocketEvent Hook
// ========================================

/**
 * 使用 useSocketEvent Hook 简化事件监听
 */
export function Example2_UseSocketEvent() {
  const [messages, setMessages] = useState<any[]>([]);

  // 使用 useSocketEvent 监听聊天消息
  useSocketEvent('chat:new_message', (data: any) => {
    console.log('收到新消息:', data);
    setMessages((prev) => [...prev, data]);
  });

  // 监听游戏开始
  useSocketEvent('game:started', (data: any) => {
    console.log('游戏开始!', data);
    alert('游戏已开始！');
  });

  return (
    <div>
      <h2>聊天消息</h2>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>
            <strong>{msg.username}:</strong> {msg.content}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ========================================
// 示例 3: 使用 useSocketEmit Hook
// ========================================

/**
 * 使用 useSocketEmit Hook 简化事件发送
 */
export function Example3_UseSocketEmit() {
  const joinRoom = useSocketEmit('room:join');
  const leaveRoom = useSocketEmit('room:leave');
  const startGame = useSocketEmit('room:start_game');

  const [roomId] = useState('room-123');

  const handleJoin = () => {
    joinRoom(
      {
        room_id: roomId,
        character_type: 'dog',
        character_name: '小黑',
      },
      (response: any) => {
        if (response.success) {
          alert('加入房间成功！');
        } else {
          alert('加入房间失败: ' + response.error.message);
        }
      }
    );
  };

  const handleLeave = () => {
    leaveRoom({ room_id: roomId }, (response: any) => {
      if (response.success) {
        alert('离开房间成功！');
      }
    });
  };

  const handleStart = () => {
    startGame({ room_id: roomId }, (response: any) => {
      if (response.success) {
        alert('游戏已开始！');
      } else {
        alert('开始游戏失败: ' + response.error.message);
      }
    });
  };

  return (
    <div>
      <h2>房间操作</h2>
      <button onClick={handleJoin}>加入房间</button>
      <button onClick={handleLeave}>离开房间</button>
      <button onClick={handleStart}>开始游戏</button>
    </div>
  );
}

// ========================================
// 示例 4: 使用 useSocketConnection Hook
// ========================================

/**
 * 在应用顶层管理 WebSocket 连接
 */
export function Example4_AppLayout() {
  const { isConnected, error, reconnect } = useSocketConnection({
    autoConnect: true,
    onConnect: () => {
      console.log('应用 WebSocket 已连接');
    },
    onDisconnect: (reason) => {
      console.log('应用 WebSocket 已断开:', reason);
    },
  });

  return (
    <div>
      <header>
        <h1>ECHO Game</h1>
        <div>
          状态: {isConnected ? '✅ 在线' : '❌ 离线'}
          {!isConnected && error && <span> - {error.message}</span>}
          {!isConnected && (
            <button onClick={reconnect} style={{ marginLeft: 10 }}>
              重新连接
            </button>
          )}
        </div>
      </header>

      <main>{/* 应用主内容 */}</main>
    </div>
  );
}

// ========================================
// 示例 5: 完整的房间组件
// ========================================

interface Player {
  user_id: string;
  username: string;
  character_type: string;
  character_name: string;
}

interface Room {
  id: string;
  name: string;
  players: Player[];
  status: string;
}

/**
 * 完整的房间组件示例
 * 包含加入、离开、玩家列表、游戏开始等功能
 */
export function Example5_CompleteRoom() {
  const { emit, on, off, isConnected, socketId } = useSocket({
    autoConnect: true,
    onConnect: () => console.log('房间 WebSocket 已连接'),
  });

  const [room, setRoom] = useState<Room | null>(null);
  const [roomId] = useState('room-abc-123');

  // ========================================
  // 监听房间事件
  // ========================================
  useEffect(() => {
    // 玩家加入
    const handlePlayerJoined = (data: Player) => {
      console.log('玩家加入:', data);
      if (room) {
        setRoom({
          ...room,
          players: [...room.players, data],
        });
      }
    };

    // 玩家离开
    const handlePlayerLeft = (data: { user_id: string }) => {
      console.log('玩家离开:', data);
      if (room) {
        setRoom({
          ...room,
          players: room.players.filter((p) => p.user_id !== data.user_id),
        });
      }
    };

    // 玩家断线
    const handlePlayerDisconnected = (data: { user_id: string; username: string }) => {
      console.log('玩家断线:', data);
      alert(`${data.username} 断线了`);
    };

    // 玩家重连
    const handlePlayerReconnected = (data: { user_id: string; username: string }) => {
      console.log('玩家重连:', data);
      alert(`${data.username} 重新连接了`);
    };

    // 游戏开始
    const handleGameStarted = (data: any) => {
      console.log('游戏开始:', data);
      alert('游戏已开始！');
      // 跳转到游戏界面
      // navigate('/game');
    };

    on('room:player_joined', handlePlayerJoined);
    on('room:player_left', handlePlayerLeft);
    on('room:player_disconnected', handlePlayerDisconnected);
    on('room:player_reconnected', handlePlayerReconnected);
    on('game:started', handleGameStarted);

    return () => {
      off('room:player_joined', handlePlayerJoined);
      off('room:player_left', handlePlayerLeft);
      off('room:player_disconnected', handlePlayerDisconnected);
      off('room:player_reconnected', handlePlayerReconnected);
      off('game:started', handleGameStarted);
    };
  }, [on, off, room]);

  // ========================================
  // 房间操作
  // ========================================

  // 加入房间
  const handleJoinRoom = () => {
    emit(
      'room:join',
      {
        room_id: roomId,
        character_type: 'cat',
        character_name: '天一',
      },
      (response: any) => {
        if (response.success) {
          console.log('加入房间成功:', response.data);
          setRoom(response.data.room);
        } else {
          console.error('加入房间失败:', response.error);
          alert('加入房间失败: ' + response.error.message);
        }
      }
    );
  };

  // 离开房间
  const handleLeaveRoom = () => {
    emit('room:leave', { room_id: roomId }, (response: any) => {
      if (response.success) {
        console.log('离开房间成功');
        setRoom(null);
      } else {
        console.error('离开房间失败:', response.error);
      }
    });
  };

  // 开始游戏（仅房主）
  const handleStartGame = () => {
    emit('room:start_game', { room_id: roomId }, (response: any) => {
      if (response.success) {
        console.log('游戏已开始');
      } else {
        console.error('开始游戏失败:', response.error);
        alert('开始游戏失败: ' + response.error.message);
      }
    });
  };

  // ========================================
  // 渲染
  // ========================================
  return (
    <div style={{ padding: 20 }}>
      <h2>房间: {roomId}</h2>

      {/* 连接状态 */}
      <div style={{ marginBottom: 20 }}>
        <p>
          连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}
          {socketId && ` (ID: ${socketId})`}
        </p>
      </div>

      {/* 房间操作按钮 */}
      <div style={{ marginBottom: 20 }}>
        {!room ? (
          <button onClick={handleJoinRoom} disabled={!isConnected}>
            加入房间
          </button>
        ) : (
          <>
            <button onClick={handleLeaveRoom}>离开房间</button>
            <button onClick={handleStartGame} style={{ marginLeft: 10 }}>
              开始游戏（房主）
            </button>
          </>
        )}
      </div>

      {/* 房间信息 */}
      {room && (
        <div>
          <h3>房间信息</h3>
          <p>房间名称: {room.name}</p>
          <p>房间状态: {room.status}</p>
          <p>玩家数量: {room.players.length}</p>

          <h4>玩家列表</h4>
          <ul>
            {room.players.map((player) => (
              <li key={player.user_id}>
                <strong>{player.character_name}</strong> ({player.character_type}) - {player.username}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ========================================
// 示例 6: 断线重连处理
// ========================================

/**
 * 处理断线重连的组件
 */
export function Example6_ReconnectionHandling() {
  const { isConnected, reconnect, error } = useSocket({
    autoConnect: true,
    onDisconnect: (reason) => {
      console.log('断开连接:', reason);
      // 如果是网络问题，Socket.IO 会自动重连
      // 如果是服务器主动断开，可能需要手动重连
    },
  });

  const [showReconnectDialog, setShowReconnectDialog] = useState(false);

  useEffect(() => {
    if (!isConnected && error) {
      setShowReconnectDialog(true);
    } else {
      setShowReconnectDialog(false);
    }
  }, [isConnected, error]);

  const handleReconnect = () => {
    reconnect();
    setShowReconnectDialog(false);
  };

  return (
    <div>
      <h2>连接管理</h2>
      <p>连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</p>

      {showReconnectDialog && (
        <div
          style={{
            padding: 20,
            border: '2px solid red',
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <h3>⚠️ 连接已断开</h3>
          <p>错误: {error?.message}</p>
          <button onClick={handleReconnect}>重新连接</button>
        </div>
      )}
    </div>
  );
}

// ========================================
// 示例 7: 不自动连接
// ========================================

/**
 * 手动控制连接的组件
 */
export function Example7_ManualConnection() {
  const socketRef = React.useRef<any>(null);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }

    // 手动连接（不推荐这种方式，推荐使用 autoConnect: true）
    import('../services/socket').then((module) => {
      socketRef.current = module.default;
      socketRef.current.connect(token).then(() => {
        alert('连接成功！');
      });
    });
  };

  const handleDisconnect = () => {
    socketRef.current?.disconnect();
    alert('已断开连接');
  };

  return (
    <div>
      <h2>手动连接控制</h2>
      <button onClick={handleConnect}>连接</button>
      <button onClick={handleDisconnect}>断开</button>
    </div>
  );
}
