# 前端房间状态管理

## 概述

使用 Zustand 实现的房间状态管理系统，提供房间创建、加入、离开和查询等功能。

## 文件结构

```
frontend/src/
├── services/
│   └── roomApi.ts              # 房间 API 服务层
├── store/
│   ├── roomStore.ts            # 房间状态管理
│   └── roomStore.example.tsx   # 使用示例
└── types/
    └── room.types.ts           # 类型定义
```

## 安装依赖

项目已包含所需依赖：
- `zustand`: ^5.0.8
- `axios`: ^1.12.2

## 类型定义

### CharacterType（角色类型）

```typescript
const CharacterType = {
  CAT: 'cat',
  DOG: 'dog',
  TURTLE: 'turtle',
} as const;

type CharacterType = typeof CharacterType[keyof typeof CharacterType];
```

### RoomStatus（房间状态）

```typescript
const RoomStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];
```

### 主要接口

- `GameRoom`: 完整的游戏房间信息
- `RoomListItem`: 房间列表项
- `CreateRoomRequest`: 创建房间请求
- `JoinRoomRequest`: 加入房间请求

## API 服务层

### roomApi

提供与后端 API 交互的方法：

```typescript
import { roomApi } from './services/roomApi';

// 获取房间列表
const { rooms, pagination } = await roomApi.getRoomList(
  RoomStatus.WAITING,
  1,
  20
);

// 创建房间
const room = await roomApi.createRoom({
  name: '我的房间',
  maxPlayers: 3,
  character: CharacterType.CAT,
  username: '玩家1',
});

// 加入房间
const room = await roomApi.joinRoom({
  roomId: 'room-id',
  character: CharacterType.DOG,
  username: '玩家2',
});

// 离开房间
await roomApi.leaveRoom('room-id');

// 获取房间详情
const room = await roomApi.getRoomDetails('room-id');

// 获取当前房间
const room = await roomApi.getCurrentRoom();
```

## 状态管理

### 状态结构

```typescript
interface RoomState {
  // 状态数据
  rooms: RoomListItem[];              // 房间列表
  currentRoom: GameRoom | null;       // 当前房间
  isLoading: boolean;                 // 加载状态
  error: string | null;               // 错误信息
  pagination: PaginationInfo | null;  // 分页信息

  // 动作方法
  fetchRooms: (status?, page?, pageSize?) => Promise<void>;
  createRoom: (data) => Promise<GameRoom>;
  joinRoom: (data) => Promise<GameRoom>;
  leaveRoom: (roomId) => Promise<void>;
  fetchRoomDetails: (roomId) => Promise<void>;
  fetchCurrentRoom: () => Promise<void>;
  setCurrentRoom: (room) => void;
  clearError: () => void;
  reset: () => void;
}
```

### 基本使用

#### 1. 获取完整状态

```typescript
import { useRoomStore } from './store/roomStore';

function MyComponent() {
  const { rooms, currentRoom, isLoading, error, fetchRooms } = useRoomStore();

  // 使用状态...
}
```

#### 2. 使用选择器 Hooks

```typescript
import {
  useRooms,
  useCurrentRoom,
  useRoomLoading,
  useRoomError,
  useIsInRoom,
} from './store/roomStore';

function MyComponent() {
  const rooms = useRooms();
  const currentRoom = useCurrentRoom();
  const isLoading = useRoomLoading();
  const error = useRoomError();
  const isInRoom = useIsInRoom();

  // 使用状态...
}
```

#### 3. 使用选择器函数

```typescript
import { useRoomStore } from './store/roomStore';

function MyComponent() {
  // 只订阅需要的状态
  const rooms = useRoomStore((state) => state.rooms);
  const fetchRooms = useRoomStore((state) => state.fetchRooms);

  // 使用状态...
}
```

## 常见用例

### 1. 获取房间列表

```typescript
function RoomList() {
  const rooms = useRooms();
  const isLoading = useRoomLoading();
  const fetchRooms = useRoomStore((state) => state.fetchRooms);

  useEffect(() => {
    // 获取所有等待中的房间
    fetchRooms(RoomStatus.WAITING, 1, 20);
  }, [fetchRooms]);

  if (isLoading) return <div>加载中...</div>;

  return (
    <ul>
      {rooms.map((room) => (
        <li key={room.id}>
          {room.name} - {room.currentPlayers}/{room.maxPlayers}
        </li>
      ))}
    </ul>
  );
}
```

### 2. 创建房间

```typescript
function CreateRoom() {
  const createRoom = useRoomStore((state) => state.createRoom);
  const error = useRoomError();

  const handleCreate = async () => {
    try {
      const room = await createRoom({
        name: '我的房间',
        maxPlayers: 3,
        character: CharacterType.CAT,
        username: '玩家1',
      });

      console.log('房间创建成功:', room);
      // 导航到房间页面
    } catch (err) {
      console.error('创建失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>创建房间</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### 3. 加入房间

```typescript
function JoinRoom({ roomId }: { roomId: string }) {
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const isLoading = useRoomLoading();

  const handleJoin = async () => {
    try {
      const room = await joinRoom({
        roomId,
        character: CharacterType.DOG,
        username: '玩家2',
      });

      console.log('加入成功:', room);
      // 导航到房间页面
    } catch (err) {
      console.error('加入失败:', err);
    }
  };

  return (
    <button onClick={handleJoin} disabled={isLoading}>
      {isLoading ? '加入中...' : '加入房间'}
    </button>
  );
}
```

### 4. 显示当前房间

```typescript
function CurrentRoom() {
  const currentRoom = useCurrentRoom();
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const fetchCurrentRoom = useRoomStore((state) => state.fetchCurrentRoom);

  useEffect(() => {
    fetchCurrentRoom();
  }, [fetchCurrentRoom]);

  if (!currentRoom) {
    return <div>您不在任何房间中</div>;
  }

  const handleLeave = async () => {
    try {
      await leaveRoom(currentRoom.id);
      // 导航回房间列表
    } catch (err) {
      console.error('离开失败:', err);
    }
  };

  return (
    <div>
      <h2>{currentRoom.name}</h2>
      <p>玩家: {currentRoom.currentPlayers}/{currentRoom.maxPlayers}</p>
      <p>状态: {currentRoom.status}</p>

      <h3>房间成员:</h3>
      <ul>
        {currentRoom.players.map((player) => (
          <li key={player.id}>
            {player.username} ({player.character})
            {player.isRoomCreator && ' - 房主'}
          </li>
        ))}
      </ul>

      <button onClick={handleLeave}>离开房间</button>
    </div>
  );
}
```

### 5. 分页加载

```typescript
function PaginatedRoomList() {
  const { rooms, pagination, fetchRooms } = useRoomStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchRooms(RoomStatus.WAITING, page, 10);
  }, [page, fetchRooms]);

  return (
    <div>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>{room.name}</li>
        ))}
      </ul>

      {pagination && (
        <div>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            上一页
          </button>
          <span>第 {page} 页，共 {pagination.totalPages} 页</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
```

### 6. 错误处理

```typescript
function RoomWithErrorHandling() {
  const createRoom = useRoomStore((state) => state.createRoom);
  const error = useRoomError();
  const clearError = useRoomStore((state) => state.clearError);

  const handleCreate = async () => {
    clearError(); // 清除之前的错误

    try {
      await createRoom({
        name: '新房间',
        maxPlayers: 3,
        character: CharacterType.CAT,
        username: '玩家',
      });
    } catch (err) {
      // 错误已被 store 处理并存储在 error 状态中
      console.error('创建失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>创建房间</button>

      {error && (
        <div style={{ color: 'red' }}>
          <p>{error}</p>
          <button onClick={clearError}>关闭</button>
        </div>
      )}
    </div>
  );
}
```

### 7. 自动刷新

```typescript
function AutoRefreshRoomList() {
  const fetchRooms = useRoomStore((state) => state.fetchRooms);
  const rooms = useRooms();

  useEffect(() => {
    // 首次加载
    fetchRooms(RoomStatus.WAITING);

    // 每 5 秒刷新一次
    const interval = setInterval(() => {
      fetchRooms(RoomStatus.WAITING);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRooms]);

  return (
    <div>
      <h2>实时房间列表</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>{room.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 8. 状态重置

```typescript
function LogoutButton() {
  const reset = useRoomStore((state) => state.reset);

  const handleLogout = () => {
    // 用户登出时重置房间状态
    reset();
    // 跳转到登录页
  };

  return <button onClick={handleLogout}>登出</button>;
}
```

## 高级用法

### 与 Socket.IO 集成

```typescript
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRoomStore } from './store/roomStore';

function RoomWithSocket() {
  const currentRoom = useCurrentRoom();
  const setCurrentRoom = useRoomStore((state) => state.setCurrentRoom);

  useEffect(() => {
    if (!currentRoom) return;

    const socket = io('http://localhost:3000');

    // 加入房间
    socket.emit('join-room', currentRoom.id);

    // 监听房间更新
    socket.on('room-updated', (updatedRoom) => {
      setCurrentRoom(updatedRoom);
    });

    // 监听玩家加入
    socket.on('player-joined', (data) => {
      console.log('玩家加入:', data.player);
      // 可以选择重新获取房间信息或直接更新
      setCurrentRoom(data.room);
    });

    // 监听玩家离开
    socket.on('player-left', (data) => {
      console.log('玩家离开:', data.player);
      setCurrentRoom(data.room);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentRoom, setCurrentRoom]);

  // 渲染组件...
}
```

### 性能优化

```typescript
// ❌ 不推荐：每次 store 更新都会重新渲染
function BadComponent() {
  const store = useRoomStore();
  return <div>{store.rooms.length}</div>;
}

// ✅ 推荐：只订阅需要的状态
function GoodComponent() {
  const roomCount = useRoomStore((state) => state.rooms.length);
  return <div>{roomCount}</div>;
}

// ✅ 或使用提供的选择器 Hooks
function BetterComponent() {
  const rooms = useRooms();
  return <div>{rooms.length}</div>;
}
```

## API 参考

### Store Actions

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `fetchRooms` | `status?, page?, pageSize?` | `Promise<void>` | 获取房间列表 |
| `createRoom` | `CreateRoomRequest` | `Promise<GameRoom>` | 创建房间 |
| `joinRoom` | `JoinRoomRequest` | `Promise<GameRoom>` | 加入房间 |
| `leaveRoom` | `roomId: string` | `Promise<void>` | 离开房间 |
| `fetchRoomDetails` | `roomId: string` | `Promise<void>` | 获取房间详情 |
| `fetchCurrentRoom` | 无 | `Promise<void>` | 获取当前房间 |
| `setCurrentRoom` | `room: GameRoom \| null` | `void` | 设置当前房间 |
| `clearError` | 无 | `void` | 清除错误 |
| `reset` | 无 | `void` | 重置状态 |

### Selector Hooks

| Hook | 返回值 | 说明 |
|------|--------|------|
| `useRooms()` | `RoomListItem[]` | 房间列表 |
| `useCurrentRoom()` | `GameRoom \| null` | 当前房间 |
| `useRoomLoading()` | `boolean` | 加载状态 |
| `useRoomError()` | `string \| null` | 错误信息 |
| `useRoomPagination()` | `Pagination \| null` | 分页信息 |
| `useIsInRoom()` | `boolean` | 是否在房间中 |

## 错误处理

所有异步操作都会捕获错误并存储在 `error` 状态中：

```typescript
try {
  await createRoom(data);
} catch (err) {
  // error 状态已更新，可以通过 useRoomError() 获取
  console.error('操作失败:', err);
}
```

错误格式：
```typescript
error: string | null
// 示例: "房间已满" 或 "网络错误，请重试"
```

## 注意事项

1. **认证**: 所有 API 调用都需要有效的 JWT Token（自动从 localStorage 读取）
2. **状态同步**: 使用 Socket.IO 实现实时状态同步
3. **错误处理**: 始终处理异步操作的错误
4. **性能优化**: 使用选择器 Hooks 避免不必要的重新渲染
5. **状态重置**: 用户登出时调用 `reset()` 清空房间状态

## 示例代码

完整的使用示例请查看：
- [roomStore.example.tsx](./src/store/roomStore.example.tsx)

## 更新日志

### v1.0.0 (2025-10-28)
- ✨ 初始版本
- ✅ 房间列表查询
- ✅ 创建房间
- ✅ 加入房间
- ✅ 离开房间
- ✅ 房间详情查询
- ✅ 当前房间查询
- ✅ 错误处理
- ✅ 分页支持
- ✅ 状态重置

## 许可证

MIT
