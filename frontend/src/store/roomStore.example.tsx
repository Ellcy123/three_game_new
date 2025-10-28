/**
 * 房间 Store 使用示例
 *
 * 演示如何在 React 组件中使用房间状态管理
 */

import React, { useEffect } from 'react';
import {
  useRoomStore,
  useRooms,
  useCurrentRoom,
  useRoomLoading,
  useRoomError,
  useIsInRoom,
} from './roomStore';
import { CharacterType, RoomStatus } from '../types/room.types';

/**
 * 示例 1: 房间列表组件
 */
export const RoomListExample: React.FC = () => {
  const rooms = useRooms();
  const isLoading = useRoomLoading();
  const error = useRoomError();
  const fetchRooms = useRoomStore((state) => state.fetchRooms);

  useEffect(() => {
    // 组件挂载时获取房间列表
    fetchRooms(RoomStatus.WAITING, 1, 20);
  }, [fetchRooms]);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div>
      <h2>房间列表</h2>
      {rooms.length === 0 ? (
        <p>暂无房间</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              {room.name} - {room.currentPlayers}/{room.maxPlayers}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * 示例 2: 创建房间组件
 */
export const CreateRoomExample: React.FC = () => {
  const createRoom = useRoomStore((state) => state.createRoom);
  const isLoading = useRoomLoading();
  const error = useRoomError();

  const handleCreateRoom = async () => {
    try {
      const room = await createRoom({
        name: '我的游戏房间',
        maxPlayers: 3,
        character: CharacterType.CAT,
        username: '玩家1',
      });

      console.log('房间创建成功:', room);
      alert('房间创建成功！');
    } catch (err) {
      console.error('创建房间失败:', err);
    }
  };

  return (
    <div>
      <h2>创建房间</h2>
      <button onClick={handleCreateRoom} disabled={isLoading}>
        {isLoading ? '创建中...' : '创建房间'}
      </button>
      {error && <p style={{ color: 'red' }}>错误: {error}</p>}
    </div>
  );
};

/**
 * 示例 3: 加入房间组件
 */
export const JoinRoomExample: React.FC<{ roomId: string }> = ({ roomId }) => {
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const isLoading = useRoomLoading();
  const error = useRoomError();

  const handleJoinRoom = async () => {
    try {
      const room = await joinRoom({
        roomId,
        character: CharacterType.DOG,
        username: '玩家2',
      });

      console.log('加入房间成功:', room);
      alert('加入房间成功！');
    } catch (err) {
      console.error('加入房间失败:', err);
    }
  };

  return (
    <div>
      <h2>加入房间</h2>
      <button onClick={handleJoinRoom} disabled={isLoading}>
        {isLoading ? '加入中...' : '加入房间'}
      </button>
      {error && <p style={{ color: 'red' }}>错误: {error}</p>}
    </div>
  );
};

/**
 * 示例 4: 当前房间信息组件
 */
export const CurrentRoomExample: React.FC = () => {
  const currentRoom = useCurrentRoom();
  const isInRoom = useIsInRoom();
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const fetchCurrentRoom = useRoomStore((state) => state.fetchCurrentRoom);

  useEffect(() => {
    // 组件挂载时获取当前房间
    fetchCurrentRoom();
  }, [fetchCurrentRoom]);

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;

    try {
      await leaveRoom(currentRoom.id);
      alert('已离开房间');
    } catch (err) {
      console.error('离开房间失败:', err);
    }
  };

  if (!isInRoom) {
    return <div>您不在任何房间中</div>;
  }

  return (
    <div>
      <h2>当前房间: {currentRoom?.name}</h2>
      <p>玩家: {currentRoom?.currentPlayers}/{currentRoom?.maxPlayers}</p>
      <p>状态: {currentRoom?.status}</p>

      <h3>房间玩家:</h3>
      <ul>
        {currentRoom?.players.map((player) => (
          <li key={player.id}>
            {player.username} - {player.character}
            {player.isRoomCreator && ' (房主)'}
          </li>
        ))}
      </ul>

      <button onClick={handleLeaveRoom}>离开房间</button>
    </div>
  );
};

/**
 * 示例 5: 使用多个选择器
 */
export const RoomDashboardExample: React.FC = () => {
  const {
    rooms,
    currentRoom,
    isLoading,
    error,
    fetchRooms,
    fetchCurrentRoom,
  } = useRoomStore();

  useEffect(() => {
    fetchRooms();
    fetchCurrentRoom();
  }, [fetchRooms, fetchCurrentRoom]);

  return (
    <div>
      <h1>房间仪表盘</h1>

      {isLoading && <div>加载中...</div>}
      {error && <div style={{ color: 'red' }}>错误: {error}</div>}

      <section>
        <h2>当前房间</h2>
        {currentRoom ? (
          <div>
            <p>{currentRoom.name}</p>
            <p>玩家: {currentRoom.currentPlayers}/{currentRoom.maxPlayers}</p>
          </div>
        ) : (
          <p>您不在任何房间中</p>
        )}
      </section>

      <section>
        <h2>可用房间 ({rooms.length})</h2>
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>{room.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

/**
 * 示例 6: 错误处理
 */
export const RoomWithErrorHandlingExample: React.FC = () => {
  const createRoom = useRoomStore((state) => state.createRoom);
  const error = useRoomError();
  const clearError = useRoomStore((state) => state.clearError);

  const handleCreateRoom = async () => {
    // 清除之前的错误
    clearError();

    try {
      await createRoom({
        name: '测试房间',
        maxPlayers: 3,
        character: CharacterType.TURTLE,
        username: '测试玩家',
      });
    } catch (err) {
      // 错误已经被 store 处理，这里可以做额外的处理
      console.error('创建失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCreateRoom}>创建房间</button>
      {error && (
        <div>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={clearError}>清除错误</button>
        </div>
      )}
    </div>
  );
};

/**
 * 示例 7: 自动刷新房间列表
 */
export const AutoRefreshRoomsExample: React.FC = () => {
  const fetchRooms = useRoomStore((state) => state.fetchRooms);
  const rooms = useRooms();

  useEffect(() => {
    // 首次加载
    fetchRooms(RoomStatus.WAITING);

    // 每 5 秒刷新一次
    const interval = setInterval(() => {
      fetchRooms(RoomStatus.WAITING);
    }, 5000);

    // 清理定时器
    return () => clearInterval(interval);
  }, [fetchRooms]);

  return (
    <div>
      <h2>实时房间列表 (每5秒刷新)</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            {room.name} - {room.currentPlayers}/{room.maxPlayers}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * 示例 8: 分页加载
 */
export const PaginatedRoomsExample: React.FC = () => {
  const { rooms, pagination, fetchRooms, isLoading } = useRoomStore();
  const [currentPage, setCurrentPage] = React.useState(1);

  useEffect(() => {
    fetchRooms(undefined, currentPage, 10);
  }, [currentPage, fetchRooms]);

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div>
      <h2>房间列表（分页）</h2>

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <>
          <ul>
            {rooms.map((room) => (
              <li key={room.id}>{room.name}</li>
            ))}
          </ul>

          {pagination && (
            <div>
              <button onClick={handlePrevPage} disabled={currentPage === 1}>
                上一页
              </button>
              <span>
                第 {pagination.page} 页，共 {pagination.totalPages} 页
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === pagination.totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * 示例 9: 状态重置
 */
export const RoomResetExample: React.FC = () => {
  const reset = useRoomStore((state) => state.reset);
  const currentRoom = useCurrentRoom();

  const handleLogout = () => {
    // 用户登出时重置房间状态
    reset();
    alert('房间状态已重置');
  };

  return (
    <div>
      <h2>状态管理</h2>
      <p>当前房间: {currentRoom?.name || '无'}</p>
      <button onClick={handleLogout}>登出并重置</button>
    </div>
  );
};

/**
 * 示例 10: 组合使用
 */
export const CompleteRoomFlowExample: React.FC = () => {
  const {
    rooms,
    currentRoom,
    isLoading,
    error,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
  } = useRoomStore();

  const [selectedRoomId, setSelectedRoomId] = React.useState<string>('');

  useEffect(() => {
    fetchRooms(RoomStatus.WAITING);
  }, [fetchRooms]);

  const handleCreateRoom = async () => {
    clearError();
    try {
      await createRoom({
        name: '新房间',
        maxPlayers: 3,
        character: CharacterType.CAT,
        username: '房主',
      });
      // 重新获取房间列表
      await fetchRooms(RoomStatus.WAITING);
    } catch (err) {
      // 错误已被处理
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoomId) return;

    clearError();
    try {
      await joinRoom({
        roomId: selectedRoomId,
        character: CharacterType.DOG,
        username: '玩家',
      });
    } catch (err) {
      // 错误已被处理
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;

    clearError();
    try {
      await leaveRoom(currentRoom.id);
      // 重新获取房间列表
      await fetchRooms(RoomStatus.WAITING);
    } catch (err) {
      // 错误已被处理
    }
  };

  return (
    <div>
      <h1>完整房间流程示例</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          错误: {error}
          <button onClick={clearError}>x</button>
        </div>
      )}

      {isLoading && <div>加载中...</div>}

      {currentRoom ? (
        <div>
          <h2>当前房间: {currentRoom.name}</h2>
          <p>状态: {currentRoom.status}</p>
          <button onClick={handleLeaveRoom}>离开房间</button>
        </div>
      ) : (
        <div>
          <h2>加入或创建房间</h2>

          <div>
            <h3>可用房间</h3>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              <option value="">选择房间</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.currentPlayers}/{room.maxPlayers})
                </option>
              ))}
            </select>
            <button onClick={handleJoinRoom} disabled={!selectedRoomId}>
              加入
            </button>
          </div>

          <div>
            <h3>或</h3>
            <button onClick={handleCreateRoom}>创建新房间</button>
          </div>
        </div>
      )}
    </div>
  );
};
