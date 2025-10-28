# 房间 API 文档

## 概述

房间 API 提供游戏房间管理功能，包括创建、加入、离开房间以及查询房间信息。

**基础路径**: `/api/v1/rooms`

**认证要求**: 所有房间 API 都需要认证，请在请求头中包含有效的 JWT Token。

## 认证

所有请求都需要在 HTTP 头中包含 `Authorization` 字段：

```
Authorization: Bearer <your_jwt_token>
```

## 端点列表

### 1. 创建房间

**端点**: `POST /api/v1/rooms/create`

**描述**: 创建一个新的游戏房间

**请求体**:
```json
{
  "name": "我的游戏房间",
  "maxPlayers": 3,
  "password": "optional_password",
  "character": "cat",
  "username": "玩家1"
}
```

**参数说明**:
- `name` (必填, string): 房间名称，1-50 个字符
- `maxPlayers` (必填, number): 最大玩家数，1-10
- `password` (可选, string): 房间密码
- `character` (必填, string): 角色类型，可选值: `cat`, `dog`, `turtle`
- `username` (必填, string): 显示名称，1-20 个字符

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "uuid-here",
      "name": "我的游戏房间",
      "creatorId": "user-uuid",
      "maxPlayers": 3,
      "currentPlayers": 1,
      "status": "waiting",
      "players": [
        {
          "id": "user-uuid",
          "username": "玩家1",
          "character": "cat",
          "isReady": false,
          "isRoomCreator": true,
          "socketId": "",
          "joinedAt": "2025-10-28T10:00:00.000Z"
        }
      ],
      "createdAt": "2025-10-28T10:00:00.000Z"
    },
    "message": "房间创建成功"
  }
}
```

**错误响应**:
- `400 Bad Request`: 参数错误
- `401 Unauthorized`: 未认证或 Token 无效
- `409 Conflict`: 用户已在另一个房间中

---

### 2. 加入房间

**端点**: `POST /api/v1/rooms/join`

**描述**: 加入一个已存在的游戏房间

**请求体**:
```json
{
  "roomId": "room-uuid-here",
  "character": "dog",
  "username": "玩家2",
  "password": "optional_password"
}
```

**参数说明**:
- `roomId` (必填, string): 房间 ID
- `character` (必填, string): 角色类型，可选值: `cat`, `dog`, `turtle`
- `username` (必填, string): 显示名称，1-20 个字符
- `password` (可选, string): 房间密码（如果房间有密码则必填）

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "room-uuid-here",
      "name": "我的游戏房间",
      "creatorId": "creator-uuid",
      "maxPlayers": 3,
      "currentPlayers": 2,
      "status": "waiting",
      "players": [
        {
          "id": "creator-uuid",
          "username": "玩家1",
          "character": "cat",
          "isReady": false,
          "isRoomCreator": true,
          "socketId": "",
          "joinedAt": "2025-10-28T10:00:00.000Z"
        },
        {
          "id": "user-uuid",
          "username": "玩家2",
          "character": "dog",
          "isReady": false,
          "isRoomCreator": false,
          "socketId": "",
          "joinedAt": "2025-10-28T10:01:00.000Z"
        }
      ],
      "createdAt": "2025-10-28T10:00:00.000Z"
    },
    "message": "成功加入房间"
  }
}
```

**错误响应**:
- `400 Bad Request`: 参数错误、房间已满、角色已被选择
- `401 Unauthorized`: 未认证或 Token 无效
- `404 Not Found`: 房间不存在
- `409 Conflict`: 用户已在另一个房间中

---

### 3. 离开房间

**端点**: `POST /api/v1/rooms/leave`

**描述**: 离开当前所在的游戏房间

**请求体**:
```json
{
  "roomId": "room-uuid-here"
}
```

**参数说明**:
- `roomId` (必填, string): 房间 ID

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "成功离开房间"
  }
}
```

**特殊行为**:
- 如果是房主离开且房间还有其他玩家，房主权限会转移给最早加入的玩家
- 如果是房主离开且房间为空，房间会被自动关闭

**错误响应**:
- `400 Bad Request`: 参数错误、不在此房间中
- `401 Unauthorized`: 未认证或 Token 无效
- `404 Not Found`: 房间不存在

---

### 4. 获取房间列表

**端点**: `GET /api/v1/rooms`

**描述**: 获取游戏房间列表（支持筛选和分页）

**查询参数**:
- `status` (可选, string): 房间状态筛选，可选值: `waiting`, `playing`, `paused`, `finished`
- `page` (可选, number): 页码，默认 1
- `pageSize` (可选, number): 每页数量，默认 20，最大 100

**请求示例**:
```
GET /api/v1/rooms?status=waiting&page=1&pageSize=20
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room-uuid-1",
        "name": "房间1",
        "currentPlayers": 2,
        "maxPlayers": 3,
        "status": "waiting",
        "hasPassword": false,
        "createdAt": "2025-10-28T10:00:00.000Z"
      },
      {
        "id": "room-uuid-2",
        "name": "房间2",
        "currentPlayers": 1,
        "maxPlayers": 3,
        "status": "waiting",
        "hasPassword": true,
        "createdAt": "2025-10-28T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**错误响应**:
- `400 Bad Request`: 参数错误
- `401 Unauthorized`: 未认证或 Token 无效

---

### 5. 获取房间详情

**端点**: `GET /api/v1/rooms/:roomId`

**描述**: 获取指定房间的详细信息

**路径参数**:
- `roomId` (必填, string): 房间 ID

**请求示例**:
```
GET /api/v1/rooms/abc123-def456-ghi789
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "abc123-def456-ghi789",
      "name": "我的游戏房间",
      "creatorId": "creator-uuid",
      "maxPlayers": 3,
      "currentPlayers": 2,
      "status": "waiting",
      "players": [
        {
          "id": "creator-uuid",
          "username": "玩家1",
          "character": "cat",
          "isReady": false,
          "isRoomCreator": true,
          "socketId": "socket-id-1",
          "joinedAt": "2025-10-28T10:00:00.000Z"
        },
        {
          "id": "player-uuid",
          "username": "玩家2",
          "character": "dog",
          "isReady": true,
          "isRoomCreator": false,
          "socketId": "socket-id-2",
          "joinedAt": "2025-10-28T10:01:00.000Z"
        }
      ],
      "createdAt": "2025-10-28T10:00:00.000Z",
      "startedAt": null
    }
  }
}
```

**错误响应**:
- `400 Bad Request`: 房间 ID 无效
- `401 Unauthorized`: 未认证或 Token 无效
- `404 Not Found`: 房间不存在

---

### 6. 获取当前用户所在房间

**端点**: `GET /api/v1/rooms/current`

**描述**: 获取当前用户所在的游戏房间

**成功响应** (200 OK):

**用户在房间中**:
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "room-uuid",
      "name": "我的游戏房间",
      "creatorId": "creator-uuid",
      "maxPlayers": 3,
      "currentPlayers": 2,
      "status": "waiting",
      "players": [...],
      "createdAt": "2025-10-28T10:00:00.000Z"
    },
    "inRoom": true
  }
}
```

**用户不在任何房间**:
```json
{
  "success": true,
  "data": {
    "room": null,
    "inRoom": false
  }
}
```

**错误响应**:
- `401 Unauthorized`: 未认证或 Token 无效

---

## 数据模型

### GameRoom

```typescript
interface GameRoom {
  id: string;                    // 房间 ID (UUID)
  name: string;                  // 房间名称
  creatorId: string;             // 创建者用户 ID
  maxPlayers: number;            // 最大玩家数
  currentPlayers: number;        // 当前玩家数
  status: RoomStatus;            // 房间状态
  players: RoomPlayer[];         // 玩家列表
  createdAt: Date;               // 创建时间
  startedAt?: Date;              // 开始时间（可选）
  password?: string;             // 房间密码（可选）
}
```

### RoomPlayer

```typescript
interface RoomPlayer {
  id: string;                    // 玩家用户 ID
  username: string;              // 显示名称
  character: CharacterType;      // 角色类型
  isReady: boolean;              // 是否准备
  isRoomCreator: boolean;        // 是否是房主
  socketId: string;              // Socket 连接 ID
  joinedAt: Date;                // 加入时间
}
```

### RoomStatus

```typescript
enum RoomStatus {
  WAITING = 'waiting',     // 等待中（可加入）
  PLAYING = 'playing',     // 游戏中
  PAUSED = 'paused',       // 已暂停
  FINISHED = 'finished'    // 已结束
}
```

### CharacterType

```typescript
enum CharacterType {
  CAT = 'cat',         // 猫
  DOG = 'dog',         // 狗
  TURTLE = 'turtle'    // 龟
}
```

---

## 错误代码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 用户未认证 |
| `NO_TOKEN` | 401 | 未提供认证令牌 |
| `INVALID_TOKEN` | 401 | 认证令牌无效 |
| `TOKEN_EXPIRED` | 401 | 认证令牌已过期 |
| `INVALID_ROOM_NAME` | 400 | 房间名称无效 |
| `INVALID_MAX_PLAYERS` | 400 | 最大玩家数无效 |
| `INVALID_CHARACTER_TYPE` | 400 | 角色类型无效 |
| `INVALID_USERNAME` | 400 | 用户名无效 |
| `ALREADY_IN_ROOM` | 400 | 用户已在另一个房间中 |
| `ROOM_FULL` | 400 | 房间已满 |
| `CHARACTER_TAKEN` | 400 | 角色已被选择 |
| `NOT_IN_ROOM` | 400 | 不在此房间中 |
| `ROOM_NOT_FOUND` | 404 | 房间不存在 |
| `INVALID_ROOM_STATUS` | 400 | 无效的房间状态 |

---

## 使用示例

### 示例 1: 创建房间并加入

```javascript
// 1. 创建房间
const createResponse = await fetch('http://localhost:3000/api/v1/rooms/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token'
  },
  body: JSON.stringify({
    name: '我的游戏房间',
    maxPlayers: 3,
    character: 'cat',
    username: '玩家1'
  })
});

const createData = await createResponse.json();
console.log('房间已创建:', createData.data.room.id);

// 2. 其他玩家加入房间
const joinResponse = await fetch('http://localhost:3000/api/v1/rooms/join', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer another_jwt_token'
  },
  body: JSON.stringify({
    roomId: createData.data.room.id,
    character: 'dog',
    username: '玩家2'
  })
});

const joinData = await joinResponse.json();
console.log('已加入房间:', joinData.data.room);
```

### 示例 2: 获取并筛选房间列表

```javascript
// 获取等待中的房间
const response = await fetch(
  'http://localhost:3000/api/v1/rooms?status=waiting&page=1&pageSize=10',
  {
    headers: {
      'Authorization': 'Bearer your_jwt_token'
    }
  }
);

const data = await response.json();
console.log(`找到 ${data.data.rooms.length} 个等待中的房间`);

data.data.rooms.forEach(room => {
  console.log(`${room.name}: ${room.currentPlayers}/${room.maxPlayers} 玩家`);
});
```

### 示例 3: 检查当前房间状态

```javascript
// 检查用户是否在房间中
const response = await fetch('http://localhost:3000/api/v1/rooms/current', {
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});

const data = await response.json();

if (data.data.inRoom) {
  console.log('您在房间:', data.data.room.name);
} else {
  console.log('您不在任何房间中');
}
```

---

## 注意事项

1. **认证**: 所有端点都需要有效的 JWT Token
2. **房间码**: 房间创建时会自动生成 6 位唯一房间码（用于 Socket 连接）
3. **角色唯一性**: 同一房间中，每个角色只能被选择一次
4. **房主转移**: 房主离开时，权限会自动转移给最早加入的玩家
5. **自动清理**: 当所有玩家离开时，房间会被自动删除
6. **缓存**: 房间信息会在 Redis 中缓存 5 分钟，提高查询性能
7. **并发**: 使用数据库事务确保并发操作的数据一致性

---

## 更新日志

### v1.0.0 (2025-10-28)
- ✨ 初始版本
- ✅ 创建房间
- ✅ 加入房间
- ✅ 离开房间
- ✅ 获取房间列表
- ✅ 获取房间详情
- ✅ 获取当前房间
- ✅ 认证中间件集成
- ✅ Redis 缓存支持

---

## 许可证

MIT

## 支持

如有问题，请联系开发团队或查看项目文档。
