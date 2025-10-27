# 《三兄弟的冒险2》后端架构设计文档

## 文档信息
- **版本**: v1.0
- **创建日期**: 2025-10-27
- **文档类型**: 后端技术架构设计
- **目标**: 支持在线多人实时协作游戏

---

## 一、技术栈选择

### 1.1 后端核心技术

#### **主服务器**
- **语言**: Node.js (v18+) / TypeScript
- **框架**: Express.js / NestJS
- **理由**: 
  - 事件驱动,适合实时游戏
  - 与前端技术栈统一,降低学习成本
  - 丰富的实时通信库支持

#### **数据库**
**主数据库**: PostgreSQL 14+
- 用户账号数据
- 游戏存档数据
- 关卡进度记录

**缓存数据库**: Redis 7+
- 会话管理(Session)
- 实时游戏房间状态
- 玩家在线状态
- 聊天消息缓存

**文档数据库**: MongoDB(可选)
- 游戏日志
- 玩家行为分析数据

#### **实时通信**
- **WebSocket**: Socket.io
- **理由**:
  - 自动降级到轮询(兼容性好)
  - 内置房间(Room)管理
  - 支持事件广播和点对点通信

#### **云服务**
- **部署平台**: AWS / Google Cloud / 阿里云
- **对象存储**: AWS S3 / 阿里云OSS (存储游戏资源)
- **CDN**: CloudFlare (加速静态资源)

---

## 二、系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 玩家1浏览器│  │ 玩家2浏览器│  │ 玩家3浏览器│                   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                   │
└────────┼─────────────┼─────────────┼─────────────────────────┘
         │             │             │
         │    HTTPS    │    HTTPS    │    HTTPS
         │  WebSocket  │  WebSocket  │  WebSocket
         ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                      负载均衡层 (Nginx)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  API Server  │ │  API Server  │ │  API Server  │
│   实例 1     │ │   实例 2     │ │   实例 3     │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │   MongoDB    │
│  (主数据库)   │  │   (缓存)     │  │   (日志)     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 服务模块划分

#### **模块列表**
```
后端系统
├── 用户认证模块 (Auth Service)
│   ├── 注册/登录
│   ├── JWT Token管理
│   └── 会话管理
│
├── 游戏房间模块 (Room Service)
│   ├── 创建房间
│   ├── 加入/离开房间
│   ├── 房间状态管理
│   └── 玩家匹配
│
├── 游戏逻辑模块 (Game Logic Service)
│   ├── 关卡数据管理
│   ├── 道具组合判定
│   ├── 生命值计算
│   └── 游戏进度追踪
│
├── 实时同步模块 (Sync Service)
│   ├── 玩家操作广播
│   ├── 游戏状态同步
│   └── 冲突解决
│
├── 聊天模块 (Chat Service)
│   ├── 实时消息传递
│   ├── 消息历史记录
│   └── 敏感词过滤
│
├── 存档模块 (Save Service)
│   ├── 云端存档
│   ├── 自动保存
│   └── 存档读取/恢复
│
└── 监控模块 (Monitor Service)
    ├── 性能监控
    ├── 错误日志
    └── 用户行为分析
```

---

## 三、数据库设计

### 3.1 PostgreSQL 数据表设计

#### **3.1.1 用户表 (users)**
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### **3.1.2 游戏房间表 (game_rooms)**
```sql
CREATE TABLE game_rooms (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) UNIQUE NOT NULL, -- 6位房间码
    host_user_id UUID REFERENCES users(user_id),
    room_name VARCHAR(100),
    max_players INTEGER DEFAULT 3,
    current_players INTEGER DEFAULT 0,
    room_status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
    current_chapter INTEGER DEFAULT 1,
    current_checkpoint VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (room_status IN ('waiting', 'playing', 'paused', 'finished'))
);

CREATE INDEX idx_rooms_status ON game_rooms(room_status);
CREATE INDEX idx_rooms_code ON game_rooms(room_code);
```

#### **3.1.3 房间玩家表 (room_players)**
```sql
CREATE TABLE room_players (
    id SERIAL PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    character_type VARCHAR(20) NOT NULL, -- 'cat', 'dog', 'turtle'
    character_name VARCHAR(50),
    current_hp INTEGER DEFAULT 8,
    max_hp INTEGER DEFAULT 8,
    player_status VARCHAR(20) DEFAULT 'active', -- active, disconnected, dead
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, character_type),
    CONSTRAINT valid_character CHECK (character_type IN ('cat', 'dog', 'turtle'))
);

CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_user ON room_players(user_id);
```

#### **3.1.4 游戏存档表 (game_saves)**
```sql
CREATE TABLE game_saves (
    save_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,
    save_name VARCHAR(100),
    chapter INTEGER NOT NULL,
    checkpoint VARCHAR(50) NOT NULL,
    game_state JSONB NOT NULL, -- 完整游戏状态(JSON格式)
    players_data JSONB NOT NULL, -- 玩家数据(生命值、技能等)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_auto_save BOOLEAN DEFAULT false,
    
    CONSTRAINT valid_chapter CHECK (chapter >= 1 AND chapter <= 4)
);

CREATE INDEX idx_saves_room ON game_saves(room_id);
CREATE INDEX idx_saves_created ON game_saves(created_at DESC);
```

#### **3.1.5 游戏事件日志表 (game_events)**
```sql
CREATE TABLE game_events (
    event_id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    event_type VARCHAR(50) NOT NULL, -- action, damage, item_get, dialogue, etc.
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_room ON game_events(room_id);
CREATE INDEX idx_events_type ON game_events(event_type);
CREATE INDEX idx_events_time ON game_events(created_at DESC);
```

#### **3.1.6 聊天消息表 (chat_messages)**
```sql
CREATE TABLE chat_messages (
    message_id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(room_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    message_type VARCHAR(20) DEFAULT 'text', -- text, system, emote
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    
    CONSTRAINT message_length CHECK (char_length(content) <= 500)
);

CREATE INDEX idx_chat_room ON chat_messages(room_id);
CREATE INDEX idx_chat_time ON chat_messages(created_at DESC);
```

### 3.2 Redis 数据结构设计

#### **3.2.1 用户会话**
```javascript
// Key格式: session:{user_id}
// 类型: Hash
// 过期时间: 24小时
{
  "user_id": "uuid",
  "username": "string",
  "room_id": "uuid",  // 当前所在房间
  "character_type": "cat|dog|turtle",
  "last_active": "timestamp",
  "socket_id": "string"
}
```

#### **3.2.2 房间实时状态**
```javascript
// Key格式: room:{room_id}:state
// 类型: Hash
// 过期时间: 12小时
{
  "room_code": "string",
  "status": "waiting|playing|paused|finished",
  "chapter": "integer",
  "checkpoint": "string",
  "current_turn": "user_id",
  "game_state": "json_string",  // 序列化的游戏状态
  "updated_at": "timestamp"
}
```

#### **3.2.3 房间玩家列表**
```javascript
// Key格式: room:{room_id}:players
// 类型: Hash
{
  "{user_id}": "{
    character_type: 'cat',
    character_name: '天一',
    hp: 8,
    status: 'active',
    socket_id: 'xxx'
  }"
}
```

#### **3.2.4 聊天消息缓存**
```javascript
// Key格式: room:{room_id}:chat
// 类型: List (LPUSH, LTRIM保留最近100条)
// 过期时间: 6小时
[
  {
    "message_id": "bigint",
    "user_id": "uuid",
    "username": "string",
    "content": "string",
    "timestamp": "timestamp"
  }
]
```

#### **3.2.5 在线用户集合**
```javascript
// Key格式: online_users
// 类型: Set
// 包含所有在线用户的user_id
```

---

## 四、API 设计

### 4.1 RESTful API 端点

#### **4.1.1 用户认证 API**

**注册**
```http
POST /api/v1/auth/register
Content-Type: application/json

Request Body:
{
  "username": "player123",
  "email": "player@example.com",
  "password": "securePassword123",
  "display_name": "玩家123"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "player123",
    "email": "player@example.com",
    "display_name": "玩家123",
    "token": "jwt_token_here"
  }
}
```

**登录**
```http
POST /api/v1/auth/login
Content-Type: application/json

Request Body:
{
  "username": "player123",  // 或 email
  "password": "securePassword123"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "player123",
    "display_name": "玩家123",
    "avatar_url": "https://...",
    "token": "jwt_token_here"
  }
}
```

**验证Token**
```http
GET /api/v1/auth/verify
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "player123",
    "is_valid": true
  }
}
```

**登出**
```http
POST /api/v1/auth/logout
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "message": "登出成功"
}
```

#### **4.1.2 游戏房间 API**

**创建房间**
```http
POST /api/v1/rooms/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "room_name": "玩家123的房间",
  "max_players": 3
}

Response (201 Created):
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "room_code": "ABC123",  // 6位房间码
    "room_name": "玩家123的房间",
    "host_user_id": "uuid",
    "max_players": 3,
    "current_players": 1,
    "status": "waiting"
  }
}
```

**加入房间**
```http
POST /api/v1/rooms/join
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "room_code": "ABC123",  // 或 room_id
  "character_type": "cat",  // 'cat', 'dog', 'turtle'
  "character_name": "天一"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "room_code": "ABC123",
    "your_character": {
      "character_type": "cat",
      "character_name": "天一",
      "hp": 8
    },
    "players": [
      {
        "user_id": "uuid",
        "username": "player1",
        "character_type": "turtle",
        "character_name": "包子"
      },
      {
        "user_id": "uuid",
        "username": "player2",
        "character_type": "cat",
        "character_name": "天一"
      }
    ]
  }
}
```

**离开房间**
```http
POST /api/v1/rooms/leave
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "room_id": "uuid"
}

Response (200 OK):
{
  "success": true,
  "message": "已离开房间"
}
```

**获取房间列表**
```http
GET /api/v1/rooms?status=waiting&page=1&limit=20
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "data": {
    "rooms": [
      {
        "room_id": "uuid",
        "room_code": "ABC123",
        "room_name": "玩家123的房间",
        "current_players": 2,
        "max_players": 3,
        "status": "waiting",
        "host_username": "player123"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

**获取房间详情**
```http
GET /api/v1/rooms/{room_id}
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "room_code": "ABC123",
    "room_name": "玩家123的房间",
    "host_user_id": "uuid",
    "status": "playing",
    "chapter": 1,
    "checkpoint": "密室",
    "players": [
      {
        "user_id": "uuid",
        "username": "player1",
        "display_name": "玩家1",
        "character_type": "cat",
        "character_name": "天一",
        "hp": 7,
        "max_hp": 8,
        "status": "active"
      },
      {
        "user_id": "uuid",
        "username": "player2",
        "display_name": "玩家2",
        "character_type": "dog",
        "character_name": "二水",
        "hp": 8,
        "max_hp": 8,
        "status": "active"
      },
      {
        "user_id": "uuid",
        "username": "player3",
        "display_name": "玩家3",
        "character_type": "turtle",
        "character_name": "包子",
        "hp": 8,
        "max_hp": 8,
        "status": "active"
      }
    ],
    "created_at": "2025-10-27T10:00:00Z",
    "started_at": "2025-10-27T10:05:00Z"
  }
}
```

#### **4.1.3 游戏存档 API**

**保存游戏**
```http
POST /api/v1/saves/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "room_id": "uuid",
  "save_name": "第一关完成",
  "is_auto_save": false
}

Response (201 Created):
{
  "success": true,
  "data": {
    "save_id": "uuid",
    "save_name": "第一关完成",
    "chapter": 1,
    "checkpoint": "密室",
    "created_at": "2025-10-27T10:30:00Z"
  }
}
```

**获取存档列表**
```http
GET /api/v1/saves?room_id={room_id}
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "data": {
    "saves": [
      {
        "save_id": "uuid",
        "save_name": "第一关完成",
        "chapter": 1,
        "checkpoint": "密室",
        "is_auto_save": false,
        "created_at": "2025-10-27T10:30:00Z"
      },
      {
        "save_id": "uuid",
        "save_name": "自动存档",
        "chapter": 1,
        "checkpoint": "藏匿",
        "is_auto_save": true,
        "created_at": "2025-10-27T10:45:00Z"
      }
    ]
  }
}
```

**加载存档**
```http
POST /api/v1/saves/load
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request Body:
{
  "save_id": "uuid",
  "room_id": "uuid"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "chapter": 1,
    "checkpoint": "密室",
    "game_state": { /* 完整游戏状态 */ },
    "players_data": [ /* 玩家数据 */ ]
  }
}
```

**删除存档**
```http
DELETE /api/v1/saves/{save_id}
Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "success": true,
  "message": "存档已删除"
}
```

### 4.2 错误响应格式

所有API错误使用统一格式:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息",
    "details": { /* 可选的详细信息 */ }
  }
}
```

**常见错误代码**:
- `UNAUTHORIZED`: 未授权(401)
- `FORBIDDEN`: 无权限(403)
- `NOT_FOUND`: 资源不存在(404)
- `VALIDATION_ERROR`: 参数验证失败(400)
- `ROOM_FULL`: 房间已满(400)
- `CHARACTER_TAKEN`: 角色已被选择(400)
- `GAME_ALREADY_STARTED`: 游戏已开始(400)
- `INTERNAL_ERROR`: 服务器内部错误(500)

---

## 五、WebSocket 实时通信设计

### 5.1 连接建立流程

```javascript
// 客户端连接示例
const socket = io('https://game-server.example.com', {
  auth: {
    token: 'jwt_token_here'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('已连接到服务器');
  // 加入房间
  socket.emit('room:join', { 
    room_id: 'uuid', 
    character_type: 'cat' 
  });
});
```

### 5.2 WebSocket 事件定义

#### **5.2.1 房间管理事件**

**加入房间**
```javascript
// 客户端 → 服务器
socket.emit('room:join', {
  room_id: 'uuid',
  character_type: 'cat',
  character_name: '天一'
});

// 服务器 → 客户端(成功)
socket.on('room:joined', {
  room_id: 'uuid',
  your_data: {
    user_id: 'uuid',
    character_type: 'cat',
    character_name: '天一',
    hp: 8
  },
  players: [/* 所有玩家数据 */]
});

// 服务器 → 房间内所有其他玩家(广播)
socket.on('room:player_joined', {
  user_id: 'uuid',
  username: 'player2',
  character_type: 'cat',
  character_name: '天一'
});
```

**离开房间**
```javascript
// 客户端 → 服务器
socket.emit('room:leave', {
  room_id: 'uuid'
});

// 服务器 → 房间内所有其他玩家(广播)
socket.on('room:player_left', {
  user_id: 'uuid',
  username: 'player2',
  character_type: 'cat'
});
```

**开始游戏**
```javascript
// 客户端(房主) → 服务器
socket.emit('room:start_game', {
  room_id: 'uuid'
});

// 服务器 → 房间内所有玩家(广播)
socket.on('game:started', {
  room_id: 'uuid',
  chapter: 1,
  checkpoint: '密室',
  initial_state: {/* 初始游戏状态 */}
});
```

#### **5.2.2 游戏操作事件**

**玩家操作**
```javascript
// 客户端 → 服务器
socket.emit('game:action', {
  room_id: 'uuid',
  action_type: 'use_item',  // use_item, move, interact, etc.
  action_data: {
    item1: 'water_pool',
    item2: 'turtle'
  }
});

// 服务器 → 房间内所有玩家(广播,包括发送者)
socket.on('game:action_result', {
  user_id: 'uuid',
  character_type: 'turtle',
  action_type: 'use_item',
  action_data: {
    item1: 'water_pool',
    item2: 'turtle'
  },
  result: {
    success: true,
    description: '包子潜入水中获得木盒',
    effects: [
      {
        type: 'item_obtained',
        item: 'wooden_box'
      }
    ],
    game_state_changes: {
      inventory: ['wooden_box'],
      // 其他状态变化
    }
  },
  timestamp: 1698400000000
});
```

**回合切换**
```javascript
// 服务器 → 房间内所有玩家
socket.on('game:turn_changed', {
  current_turn: 'user_id',
  character_type: 'dog',
  turn_number: 5,
  timeout_at: 1698400060000  // 30秒后自动跳过
});
```

**游戏状态更新**
```javascript
// 服务器 → 房间内所有玩家(定期同步)
socket.on('game:state_sync', {
  room_id: 'uuid',
  chapter: 1,
  checkpoint: '密室',
  players: [
    {
      user_id: 'uuid',
      character_type: 'cat',
      hp: 7,
      max_hp: 8,
      status: 'active',
      inventory: ['key']
    },
    // 其他玩家...
  ],
  game_state: {
    // 当前游戏状态(关卡进度、解锁内容等)
  },
  timestamp: 1698400000000
});
```

#### **5.2.3 聊天事件**

**发送消息**
```javascript
// 客户端 → 服务器
socket.emit('chat:send_message', {
  room_id: 'uuid',
  content: '我们试试水潭+乌龟',
  message_type: 'text'  // text, emote, system
});

// 服务器 → 房间内所有玩家(广播)
socket.on('chat:new_message', {
  message_id: 123456,
  user_id: 'uuid',
  username: 'player1',
  display_name: '玩家1',
  character_type: 'turtle',
  content: '我们试试水潭+乌龟',
  message_type: 'text',
  timestamp: 1698400000000
});
```

**系统消息**
```javascript
// 服务器 → 房间内所有玩家
socket.on('chat:system_message', {
  content: '天一获得了钥匙',
  message_type: 'system',
  timestamp: 1698400000000
});
```

#### **5.2.4 连接状态事件**

**玩家断线**
```javascript
// 服务器 → 房间内所有其他玩家
socket.on('room:player_disconnected', {
  user_id: 'uuid',
  username: 'player2',
  character_type: 'cat',
  disconnected_at: 1698400000000
});
```

**玩家重连**
```javascript
// 服务器 → 房间内所有其他玩家
socket.on('room:player_reconnected', {
  user_id: 'uuid',
  username: 'player2',
  character_type: 'cat',
  reconnected_at: 1698400000000
});

// 服务器 → 重连的玩家(发送完整状态)
socket.on('game:state_restore', {
  room_id: 'uuid',
  chapter: 1,
  checkpoint: '密室',
  players: [/* 所有玩家数据 */],
  game_state: {/* 完整游戏状态 */},
  chat_history: [/* 最近50条消息 */]
});
```

### 5.3 事件命名规范

```
格式: {模块}:{动作}

模块:
- room: 房间管理
- game: 游戏逻辑
- chat: 聊天
- player: 玩家状态

动作:
- 客户端→服务器: 动词原形 (join, leave, send, use)
- 服务器→客户端: 过去式 (joined, left, sent, used) 或 进行时 (starting, updating)
```

---

## 六、实时同步机制

### 6.1 状态同步策略

#### **方案选择: 服务器权威模式**

```
客户端A          服务器          客户端B          客户端C
   │               │               │               │
   │─操作请求────→│               │               │
   │               │               │               │
   │               │←─验证&处理    │               │
   │               │               │               │
   │←─操作结果────│────────────→│────────────→│
   │               │               │               │
   │               │←─状态同步────│───────────→│
```

**优点**:
- 防作弊(服务器验证所有操作)
- 一致性强(服务器是唯一真实状态源)
- 易于回滚和恢复

**缺点**:
- 有网络延迟
- 服务器负载较高

#### **优化方案: 客户端预测 + 服务器校验**

```javascript
// 客户端代码示例
function handlePlayerAction(action) {
  // 1. 立即在本地执行(乐观更新)
  const predictedState = applyActionLocally(action);
  updateLocalUI(predictedState);
  
  // 2. 发送到服务器验证
  socket.emit('game:action', action);
  
  // 3. 接收服务器权威结果
  socket.on('game:action_result', (result) => {
    if (result.success) {
      // 如果预测正确,保持当前状态
      if (isStateDifferent(predictedState, result.game_state)) {
        // 预测错误,回滚到服务器状态
        updateLocalUI(result.game_state);
      }
    } else {
      // 操作失败,回滚到服务器状态
      revertLocalState();
      showError(result.error);
    }
  });
}
```

### 6.2 冲突解决机制

#### **场景1: 同时操作同一物品**

```javascript
// 服务器端逻辑
class GameRoom {
  handleAction(userId, action) {
    // 使用锁机制确保操作串行化
    return this.actionMutex.runExclusive(async () => {
      // 1. 检查是否轮到该玩家
      if (this.currentTurn !== userId) {
        return {
          success: false,
          error: '现在不是你的回合'
        };
      }
      
      // 2. 检查资源是否可用
      if (this.isItemLocked(action.item1) || this.isItemLocked(action.item2)) {
        return {
          success: false,
          error: '该物品正在被其他玩家使用'
        };
      }
      
      // 3. 锁定资源
      this.lockItem(action.item1);
      this.lockItem(action.item2);
      
      // 4. 执行游戏逻辑
      const result = await this.gameLogic.processAction(action);
      
      // 5. 释放资源
      this.unlockItem(action.item1);
      this.unlockItem(action.item2);
      
      // 6. 广播结果
      this.broadcastToRoom('game:action_result', result);
      
      return result;
    });
  }
}
```

#### **场景2: 玩家断线后重连**

```javascript
// 服务器端断线重连逻辑
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // 1. 标记玩家为断线状态
    redis.hset(`room:${roomId}:players`, userId, JSON.stringify({
      ...playerData,
      status: 'disconnected',
      disconnected_at: Date.now()
    }));
    
    // 2. 启动60秒倒计时
    setTimeout(() => {
      checkPlayerReconnection(roomId, userId);
    }, 60000);
  });
  
  socket.on('reconnect', ({ roomId, userId }) => {
    // 1. 验证玩家身份
    const player = await getPlayer(roomId, userId);
    if (!player) return;
    
    // 2. 恢复玩家状态
    redis.hset(`room:${roomId}:players`, userId, JSON.stringify({
      ...player,
      status: 'active',
      socket_id: socket.id
    }));
    
    // 3. 发送完整游戏状态
    const fullState = await getCompleteGameState(roomId);
    socket.emit('game:state_restore', fullState);
    
    // 4. 通知其他玩家
    socket.to(roomId).emit('room:player_reconnected', {
      user_id: userId,
      username: player.username
    });
  });
});
```

### 6.3 状态同步频率

```javascript
// 不同类型数据的同步策略

// 1. 即时同步(WebSocket)
// - 玩家操作
// - 聊天消息
// - 生命值变化
// - 关键游戏事件

// 2. 定期同步(每5秒)
// - 完整游戏状态(防止漂移)
// - 玩家在线状态

// 3. 按需同步
// - 存档/读档
// - 玩家加入/离开

class SyncManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.lastFullSync = Date.now();
    
    // 每5秒进行一次完整状态同步
    this.syncInterval = setInterval(() => {
      this.syncFullState();
    }, 5000);
  }
  
  async syncFullState() {
    const state = await this.getCompleteState();
    io.to(this.roomId).emit('game:state_sync', {
      ...state,
      timestamp: Date.now()
    });
    this.lastFullSync = Date.now();
  }
  
  destroy() {
    clearInterval(this.syncInterval);
  }
}
```

---

## 七、用户认证系统

### 7.1 JWT Token 设计

#### **Token 结构**
```javascript
// JWT Payload
{
  "user_id": "uuid",
  "username": "player123",
  "iat": 1698400000,  // 签发时间
  "exp": 1698486400,  // 过期时间(24小时后)
  "type": "access"    // access 或 refresh
}

// 签名算法: HS256
// 密钥: 环境变量 JWT_SECRET
```

#### **Token 生成**
```javascript
import jwt from 'jsonwebtoken';

function generateTokens(userId, username) {
  // Access Token (24小时)
  const accessToken = jwt.sign(
    {
      user_id: userId,
      username: username,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Refresh Token (7天)
  const refreshToken = jwt.sign(
    {
      user_id: userId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}
```

#### **Token 验证中间件**
```javascript
function authMiddleware(req, res, next) {
  // 1. 从Header获取Token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证Token'
      }
    });
  }
  
  const token = authHeader.substring(7);
  
  // 2. 验证Token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. 检查Token类型
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token类型错误'
        }
      });
    }
    
    // 4. 将用户信息附加到请求
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token已过期'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token无效'
      }
    });
  }
}
```

### 7.2 密码安全

#### **密码哈希**
```javascript
import bcrypt from 'bcrypt';

// 注册时哈希密码
async function hashPassword(plainPassword) {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
}

// 登录时验证密码
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
```

#### **密码强度要求**
```javascript
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

### 7.3 会话管理

#### **Redis 会话存储**
```javascript
// 登录时创建会话
async function createSession(userId, username, socketId) {
  const sessionData = {
    user_id: userId,
    username: username,
    socket_id: socketId,
    created_at: Date.now(),
    last_active: Date.now()
  };
  
  await redis.hset(
    `session:${userId}`,
    sessionData
  );
  
  await redis.expire(`session:${userId}`, 86400); // 24小时过期
  
  // 添加到在线用户集合
  await redis.sadd('online_users', userId);
}

// 更新最后活跃时间
async function updateSessionActivity(userId) {
  await redis.hset(`session:${userId}`, 'last_active', Date.now());
}

// 登出时销毁会话
async function destroySession(userId) {
  await redis.del(`session:${userId}`);
  await redis.srem('online_users', userId);
}
```

---

## 八、性能优化方案

### 8.1 数据库优化

#### **连接池配置**
```javascript
// PostgreSQL连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                    // 最大连接数
  min: 5,                     // 最小连接数
  idleTimeoutMillis: 30000,   // 空闲连接超时
  connectionTimeoutMillis: 2000
});
```

#### **查询优化**
```javascript
// 使用预编译语句
const getUser = await pool.query(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);

// 批量查询(减少数据库往返)
const players = await pool.query(`
  SELECT rp.*, u.username, u.display_name
  FROM room_players rp
  JOIN users u ON rp.user_id = u.user_id
  WHERE rp.room_id = $1
`, [roomId]);

// 使用索引优化查询
// 已在表设计中添加必要索引
```

### 8.2 Redis 缓存策略

#### **缓存常用数据**
```javascript
// 缓存房间列表(减少数据库查询)
async function getRoomList(status, page = 1, limit = 20) {
  const cacheKey = `room_list:${status}:${page}:${limit}`;
  
  // 1. 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. 缓存未命中,查询数据库
  const rooms = await db.query(`
    SELECT * FROM game_rooms
    WHERE room_status = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [status, limit, (page - 1) * limit]);
  
  // 3. 写入缓存(60秒过期)
  await redis.setex(cacheKey, 60, JSON.stringify(rooms));
  
  return rooms;
}

// 缓存失效策略
async function invalidateRoomListCache() {
  const keys = await redis.keys('room_list:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 8.3 WebSocket 性能优化

#### **房间隔离**
```javascript
// 使用Socket.io的Room功能隔离广播
io.on('connection', (socket) => {
  socket.on('room:join', async ({ room_id }) => {
    // 加入特定房间
    await socket.join(room_id);
    
    // 只向该房间广播
    io.to(room_id).emit('room:player_joined', playerData);
  });
});
```

#### **消息批处理**
```javascript
// 合并频繁的状态更新
class UpdateBatcher {
  constructor(roomId, interval = 100) {
    this.roomId = roomId;
    this.updates = [];
    this.timer = null;
    this.interval = interval;
  }
  
  addUpdate(update) {
    this.updates.push(update);
    
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.interval);
    }
  }
  
  flush() {
    if (this.updates.length > 0) {
      io.to(this.roomId).emit('game:batch_updates', {
        updates: this.updates,
        timestamp: Date.now()
      });
      
      this.updates = [];
    }
    this.timer = null;
  }
}
```

### 8.4 负载均衡

#### **水平扩展架构**
```
         ┌─── API Server 1 (房间 1-100)
         │
Nginx ───┼─── API Server 2 (房间 101-200)
         │
         └─── API Server 3 (房间 201-300)
```

#### **Sticky Session 配置**
```nginx
# Nginx 配置
upstream game_servers {
    ip_hash;  # 确保同一用户总是连接到同一服务器
    server 10.0.0.1:3000;
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
}

server {
    listen 443 ssl;
    server_name game-server.example.com;
    
    location / {
        proxy_pass http://game_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 九、安全措施

### 9.1 API 安全

#### **限流(Rate Limiting)**
```javascript
import rateLimit from 'express-rate-limit';

// 全局限流
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁,请稍后再试'
    }
  }
});

// 登录接口限流(更严格)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 最多5次登录尝试
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: '登录尝试次数过多,请15分钟后再试'
    }
  }
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth/login', loginLimiter);
```

#### **输入验证**
```javascript
import Joi from 'joi';

// 注册请求验证
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required(),
  display_name: Joi.string()
    .max(100)
    .optional()
});

app.post('/api/v1/auth/register', async (req, res) => {
  // 验证输入
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  // 继续处理...
});
```

#### **SQL 注入防护**
```javascript
// ✅ 正确:使用参数化查询
const user = await pool.query(
  'SELECT * FROM users WHERE username = $1',
  [username]
);

// ❌ 错误:字符串拼接(容易SQL注入)
const user = await pool.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

### 9.2 WebSocket 安全

#### **连接认证**
```javascript
io.use((socket, next) => {
  // 验证JWT Token
  const token = socket.handshake.auth.token;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user_id;
    socket.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

#### **消息验证**
```javascript
socket.on('game:action', async (data) => {
  // 1. 验证用户权限
  const player = await getPlayer(data.room_id, socket.userId);
  if (!player) {
    socket.emit('error', { message: '你不在该房间中' });
    return;
  }
  
  // 2. 验证数据格式
  if (!data.action_type || !data.action_data) {
    socket.emit('error', { message: '无效的操作数据' });
    return;
  }
  
  // 3. 验证游戏规则
  if (!isValidAction(player, data)) {
    socket.emit('error', { message: '无效的游戏操作' });
    return;
  }
  
  // 4. 执行操作
  await handleGameAction(data);
});
```

### 9.3 敏感信息保护

#### **环境变量管理**
```javascript
// .env 文件(不提交到Git)
DB_HOST=localhost
DB_USER=gameserver
DB_PASSWORD=super_secret_password
DB_NAME=game_db

JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here
```

#### **HTTPS/WSS 加密**
```javascript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('ssl/private-key.pem'),
  cert: fs.readFileSync('ssl/certificate.pem')
};

const server = https.createServer(options, app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});
```

---

## 十、监控与日志

### 10.1 性能监控

#### **APM 工具集成**
```javascript
// 使用 New Relic / DataDog
import newrelic from 'newrelic';

// 自定义性能指标
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // 记录API响应时间
    newrelic.recordMetric('API/ResponseTime', duration);
    
    // 记录慢查询(>500ms)
    if (duration > 500) {
      console.warn(`Slow API: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});
```

#### **数据库性能监控**
```javascript
// 监控慢查询
pool.on('query', (query) => {
  const start = Date.now();
  
  query.on('end', () => {
    const duration = Date.now() - start;
    
    if (duration > 100) {
      console.warn('Slow query:', {
        sql: query.text,
        duration: duration,
        timestamp: new Date()
      });
    }
  });
});
```

### 10.2 日志系统

#### **结构化日志**
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // 错误日志单独存储
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // 所有日志
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    // 控制台输出(开发环境)
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 使用示例
logger.info('User logged in', {
  user_id: userId,
  username: username,
  ip: req.ip
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack
});
```

#### **游戏事件日志**
```javascript
async function logGameEvent(roomId, userId, eventType, eventData) {
  // 写入数据库(长期存储)
  await pool.query(`
    INSERT INTO game_events (room_id, user_id, event_type, event_data)
    VALUES ($1, $2, $3, $4)
  `, [roomId, userId, eventType, JSON.stringify(eventData)]);
  
  // 写入MongoDB(用于分析)
  await mongodb.collection('game_events').insertOne({
    room_id: roomId,
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
    timestamp: new Date()
  });
}
```

### 10.3 错误追踪

#### **全局错误处理**
```javascript
// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason,
    promise: promise
  });
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // 优雅关闭
  gracefulShutdown();
});

// Express错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Express Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user_id: req.user?.user_id
  });
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  });
});
```

---

## 十一、部署方案

### 11.1 Docker 容器化

#### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建TypeScript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

#### **docker-compose.yml**
```yaml
version: '3.8'

services:
  # API服务器
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
  
  # PostgreSQL数据库
  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=gameserver
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=game_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
  
  # Redis缓存
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 11.2 生产环境配置

#### **环境变量(生产)**
```bash
# 数据库
DB_HOST=your-db-host.com
DB_PORT=5432
DB_USER=gameserver
DB_PASSWORD=strong_production_password
DB_NAME=game_production

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=strong_redis_password

# JWT
JWT_SECRET=your_256_bit_jwt_secret_key
JWT_REFRESH_SECRET=your_256_bit_refresh_secret_key

# CORS
CLIENT_URL=https://yourgame.com

# 监控
NEW_RELIC_LICENSE_KEY=your_license_key
```

### 11.3 CI/CD 流程

#### **GitHub Actions 示例**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t game-server:latest .
      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push game-server:latest
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/game-server
            docker-compose pull
            docker-compose up -d
```

---

## 十二、扩展性考虑

### 12.1 微服务架构(未来)

如果游戏规模扩大,可以将服务拆分为:

```
├── Auth Service (用户认证)
├── Room Service (房间管理)
├── Game Service (游戏逻辑)
├── Chat Service (聊天)
├── Save Service (存档)
└── Analytics Service (数据分析)
```

### 12.2 数据库分片

```javascript
// 按房间ID分片
function getShardId(roomId) {
  const hash = crypto.createHash('md5').update(roomId).digest('hex');
  const shardNumber = parseInt(hash.substring(0, 8), 16) % NUM_SHARDS;
  return shardNumber;
}

// 路由到对应的数据库分片
function getDbConnection(roomId) {
  const shardId = getShardId(roomId);
  return dbConnections[shardId];
}
```

### 12.3 CDN 集成

```javascript
// 静态资源使用CDN
const CDN_BASE_URL = 'https://cdn.yourgame.com';

function getAssetUrl(assetPath) {
  return `${CDN_BASE_URL}/${assetPath}`;
}

// 在客户端配置中使用
const config = {
  assets: {
    images: getAssetUrl('images/'),
    sounds: getAssetUrl('sounds/'),
    scripts: getAssetUrl('scripts/')
  }
};
```

---

## 十三、开发检查清单

### 13.1 后端核心功能

**用户系统**
- [ ] 用户注册API
- [ ] 用户登录API
- [ ] JWT Token生成和验证
- [ ] 会话管理(Redis)
- [ ] 密码哈希和验证

**房间系统**
- [ ] 创建房间API
- [ ] 加入房间API
- [ ] 离开房间API
- [ ] 房间列表API
- [ ] 房间详情API
- [ ] 房间码生成

**游戏逻辑**
- [ ] 游戏状态管理
- [ ] 道具组合判定
- [ ] 生命值计算
- [ ] 关卡进度追踪
- [ ] 游戏事件日志

**实时通信**
- [ ] WebSocket连接管理
- [ ] 房间加入/离开事件
- [ ] 游戏操作广播
- [ ] 状态同步机制
- [ ] 断线重连处理

**聊天系统**
- [ ] 实时消息传递
- [ ] 消息历史记录
- [ ] 系统消息推送
- [ ] 敏感词过滤

**存档系统**
- [ ] 云端存档API
- [ ] 自动保存机制
- [ ] 存档读取API
- [ ] 存档删除API

### 13.2 安全与性能

**安全措施**
- [ ] API限流
- [ ] 输入验证
- [ ] SQL注入防护
- [ ] XSS防护
- [ ] CSRF防护
- [ ] HTTPS/WSS加密

**性能优化**
- [ ] 数据库连接池
- [ ] Redis缓存
- [ ] 查询优化
- [ ] WebSocket优化
- [ ] 负载均衡

**监控与日志**
- [ ] 性能监控
- [ ] 错误日志
- [ ] 游戏事件日志
- [ ] 慢查询监控

### 13.3 部署与运维

**部署**
- [ ] Docker容器化
- [ ] docker-compose配置
- [ ] 生产环境配置
- [ ] CI/CD流程

**运维**
- [ ] 数据库备份
- [ ] 日志轮转
- [ ] 监控告警
- [ ] 灾难恢复方案

---

## 十四、技术文档参考

### 14.1 技术栈文档
- Node.js: https://nodejs.org/docs/
- Express.js: https://expressjs.com/
- Socket.io: https://socket.io/docs/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/

### 14.2 安全最佳实践
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725

---

## 文档版本信息

**版本**: v1.0  
**创建日期**: 2025-10-27  
**最后更新**: 2025-10-27  
**适用对象**: 后端开发团队  
**文档状态**: 初始版本

---

## 附录

### A. 数据库初始化脚本

详见单独的SQL文件: `database/init.sql`

### B. API测试用例

详见单独的测试文档: `tests/api-tests.md`

### C. 性能基准测试

详见单独的性能测试文档: `docs/performance-benchmarks.md`