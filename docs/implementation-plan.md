# ECHO游戏实现计划

> 基于文字交互式多人协作解谜游戏的完整技术实现方案

---

## 1. 技术选型

### 1.1 前端技术栈

#### 核心框架
- **React 18.3+** - UI框架
  - 理由：组件化开发，状态管理成熟，生态丰富
  - Hooks：`useState`, `useEffect`, `useReducer`, `useContext`
- **TypeScript 5.0+** - 类型安全
  - 理由：复杂状态管理需要强类型约束，减少bug

#### 状态管理
- **Zustand** - 轻量级状态管理
  - 理由：比Redux简单，比Context性能好，适合中型项目
  - 替代方案：Jotai（如果需要更原子化的状态）

#### 实时通信
- **Socket.IO Client 4.7+**
  - 理由：自动重连、房间管理、事件系统完善
  - 备用：原生WebSocket（如需更轻量）

#### UI组件库
- **Tailwind CSS 3.4+** - 样式方案
  - 理由：快速开发，文件小，配合主题切换方便
- **Framer Motion** - 动画库
  - 理由：流畅的文本出现动画、状态转换动画

#### 工具链
- **Vite 5.0+** - 构建工具
  - 理由：快速热更新，开发体验好
- **ESLint + Prettier** - 代码规范

---

### 1.2 后端技术栈

#### 核心框架
- **Node.js 20 LTS + Express 4.18+**
  - 理由：JavaScript全栈统一，生态成熟
- **TypeScript 5.0+** - 类型安全

#### 实时通信
- **Socket.IO Server 4.7+**
  - 理由：与前端配套，支持房间/命名空间

#### 数据库
**主数据库：PostgreSQL 16+**
- 理由：支持JSONB类型（灵活存储游戏状态），事务ACID保证
- 用途：用户数据、房间信息、存档

**缓存层：Redis 7+**
- 理由：高性能读写，支持Pub/Sub（房间状态同步）
- 用途：在线房间状态、玩家会话、分布式锁

**（可选）日志库：MongoDB**
- 用途：事件日志、玩家行为分析

#### ORM/查询构建器
- **Prisma 5+**
  - 理由：类型安全、自动迁移、查询性能好
  - Schema优先设计

#### 认证
- **JWT (jsonwebtoken)** - 无状态认证
- **bcrypt** - 密码加密

#### 开发工具
- **tsx** - TypeScript直接运行
- **Nodemon** - 开发热重载
- **Jest + Supertest** - 测试框架

---

### 1.3 部署方案

**开发阶段**
- 前端：Vite Dev Server (localhost:5173)
- 后端：Node.js (localhost:3000)
- 数据库：Docker Compose（PostgreSQL + Redis）

**生产环境**
- 服务器：云服务器（阿里云/腾讯云）
- 容器化：Docker + Docker Compose
- 反向代理：Nginx
- HTTPS：Let's Encrypt
- 进程管理：PM2

---

## 2. 项目文件结构

```
three_game_new/
├── docs/                           # 文档
│   ├── game-design.md             # 游戏设计文档
│   ├── level-01.md                # 第一关详细设计
│   ├── sever.md                   # 服务器设计文档
│   └── implementation-plan.md     # 本文件
│
├── packages/                       # Monorepo结构
│   ├── client/                    # 前端应用
│   │   ├── public/
│   │   │   └── favicon.ico
│   │   ├── src/
│   │   │   ├── assets/           # 静态资源
│   │   │   │   ├── images/
│   │   │   │   └── sounds/
│   │   │   ├── components/       # React组件
│   │   │   │   ├── common/       # 通用组件
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   └── TextDisplay.tsx
│   │   │   │   ├── game/         # 游戏组件
│   │   │   │   │   ├── GameBoard.tsx          # 游戏主面板
│   │   │   │   │   ├── InputPanel.tsx         # 输入面板
│   │   │   │   │   ├── InventoryPanel.tsx     # 背包面板
│   │   │   │   │   ├── PlayerPanel.tsx        # 玩家信息面板
│   │   │   │   │   ├── EventLog.tsx           # 事件日志
│   │   │   │   │   ├── PasswordModal.tsx      # 密码输入弹窗
│   │   │   │   │   └── CharacterSelector.tsx  # 角色选择
│   │   │   │   └── room/         # 房间相关
│   │   │   │       ├── RoomList.tsx
│   │   │   │       ├── RoomCreate.tsx
│   │   │   │       └── WaitingRoom.tsx
│   │   │   ├── hooks/            # 自定义Hooks
│   │   │   │   ├── useSocket.ts           # WebSocket连接
│   │   │   │   ├── useGameState.ts        # 游戏状态
│   │   │   │   ├── useInputHandler.ts     # 输入处理
│   │   │   │   └── useEventLog.ts         # 事件日志
│   │   │   ├── stores/           # Zustand状态管理
│   │   │   │   ├── gameStore.ts           # 游戏状态
│   │   │   │   ├── roomStore.ts           # 房间状态
│   │   │   │   └── userStore.ts           # 用户状态
│   │   │   ├── services/         # 服务层
│   │   │   │   ├── api.ts                 # HTTP API
│   │   │   │   ├── socket.ts              # Socket.IO封装
│   │   │   │   └── storage.ts             # 本地存储
│   │   │   ├── types/            # TypeScript类型定义
│   │   │   │   ├── game.ts
│   │   │   │   ├── events.ts
│   │   │   │   └── api.ts
│   │   │   ├── utils/            # 工具函数
│   │   │   │   ├── inputParser.ts         # 输入解析
│   │   │   │   ├── textFormatter.ts       # 文本格式化
│   │   │   │   └── constants.ts           # 常量定义
│   │   │   ├── App.tsx           # 根组件
│   │   │   ├── main.tsx          # 入口文件
│   │   │   └── vite-env.d.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   └── server/                    # 后端应用
│       ├── prisma/
│       │   ├── schema.prisma      # 数据库Schema
│       │   └── migrations/        # 数据库迁移
│       ├── src/
│       │   ├── config/           # 配置
│       │   │   ├── database.ts
│       │   │   ├── redis.ts
│       │   │   └── env.ts
│       │   ├── controllers/      # 控制器
│       │   │   ├── authController.ts
│       │   │   ├── roomController.ts
│       │   │   └── gameController.ts
│       │   ├── services/         # 业务逻辑
│       │   │   ├── auth/
│       │   │   │   ├── AuthService.ts
│       │   │   │   └── JWTService.ts
│       │   │   ├── game/
│       │   │   │   ├── GameEngine.ts          # 游戏引擎核心
│       │   │   │   ├── EventProcessor.ts      # 事件处理器
│       │   │   │   ├── StateManager.ts        # 状态管理器
│       │   │   │   ├── InputParser.ts         # 输入解析器
│       │   │   │   ├── ConditionValidator.ts  # 条件验证器
│       │   │   │   └── EffectExecutor.ts      # 效果执行器
│       │   │   ├── room/
│       │   │   │   ├── RoomManager.ts         # 房间管理器
│       │   │   │   └── RoomState.ts           # 房间状态
│       │   │   └── level/
│       │   │       ├── LevelBase.ts           # 关卡基类
│       │   │       ├── Level01.ts             # 第一关
│       │   │       ├── Level02.ts             # 第二关
│       │   │       └── LevelFactory.ts        # 关卡工厂
│       │   ├── socket/           # Socket.IO处理
│       │   │   ├── socketServer.ts
│       │   │   ├── handlers/
│       │   │   │   ├── connectionHandler.ts
│       │   │   │   ├── roomHandler.ts
│       │   │   │   └── gameHandler.ts
│       │   │   └── middleware/
│       │   │       └── authMiddleware.ts
│       │   ├── routes/           # Express路由
│       │   │   ├── authRoutes.ts
│       │   │   ├── roomRoutes.ts
│       │   │   └── gameRoutes.ts
│       │   ├── middleware/       # 中间件
│       │   │   ├── errorHandler.ts
│       │   │   ├── logger.ts
│       │   │   └── validator.ts
│       │   ├── models/           # 数据模型
│       │   │   └── (Prisma自动生成)
│       │   ├── types/            # TypeScript类型
│       │   │   ├── game.ts
│       │   │   ├── room.ts
│       │   │   └── socket.ts
│       │   ├── utils/            # 工具函数
│       │   │   ├── logger.ts
│       │   │   ├── redis.ts
│       │   │   └── errors.ts
│       │   ├── data/             # 游戏数据配置
│       │   │   ├── events/
│       │   │   │   ├── level01-events.json    # 第一关事件配置
│       │   │   │   ├── level02-events.json
│       │   │   │   └── common-events.json
│       │   │   ├── items/
│       │   │   │   └── items.json             # 道具配置
│       │   │   ├── characters/
│       │   │   │   └── characters.json        # 角色配置
│       │   │   ├── dialogues/
│       │   │   │   └── level01-dialogues.json # 对话文本
│       │   │   └── synonyms/
│       │   │       └── synonyms.json          # 同义词映射
│       │   ├── app.ts            # Express应用
│       │   └── server.ts         # 服务器入口
│       ├── tests/                # 测试文件
│       │   ├── unit/
│       │   │   ├── InputParser.test.ts
│       │   │   ├── StateManager.test.ts
│       │   │   └── EventProcessor.test.ts
│       │   ├── integration/
│       │   │   ├── gameFlow.test.ts
│       │   │   └── socket.test.ts
│       │   └── fixtures/         # 测试数据
│       │       └── testData.json
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
│
├── shared/                        # 前后端共享代码
│   ├── types/                    # 共享类型定义
│   │   ├── game.ts
│   │   ├── events.ts
│   │   └── api.ts
│   ├── constants/                # 共享常量
│   │   └── gameConstants.ts
│   └── utils/                    # 共享工具函数
│       └── validation.ts
│
├── docker/                        # Docker配置
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── docker-compose.yml
│
├── scripts/                       # 脚本
│   ├── setup.sh                  # 初始化脚本
│   └── seed.sh                   # 数据库种子脚本
│
├── .gitignore
├── package.json                   # 根package.json（workspaces）
├── pnpm-workspace.yaml           # PNPM工作区配置
└── README.md
```

---

## 3. 核心模块设计

### 3.1 前端核心模块

#### 3.1.1 输入解析器 (InputParser)

```typescript
// packages/client/src/utils/inputParser.ts

/**
 * 输入解析器 - 将用户输入标准化为游戏事件
 */
export class InputParser {
  private synonymMap: Map<string, string>;

  constructor(synonyms: SynonymConfig) {
    this.synonymMap = this.buildSynonymMap(synonyms);
  }

  /**
   * 解析用户输入
   * @example "猫+行李箱" -> { type: 'combination', items: ['cat', 'luggage'] }
   * @example "000" -> { type: 'password', value: '000' }
   */
  parse(input: string): ParsedInput {
    const normalized = this.normalize(input);

    // 检测输入类型
    if (this.isPasswordInput(normalized)) {
      return { type: 'password', value: normalized };
    }

    if (this.isCombination(normalized)) {
      return this.parseCombination(normalized);
    }

    return { type: 'text', value: input };
  }

  /**
   * 标准化输入
   * - 去除空格、特殊符号
   * - 统一分隔符为+
   * - 应用同义词映射
   */
  private normalize(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[、，,\s]+/g, '+')
      .split('+')
      .map(part => this.synonymMap.get(part) || part)
      .sort() // 确保"A+B"="B+A"
      .join('+');
  }

  private parseCombination(input: string): CombinationInput {
    const parts = input.split('+');
    return {
      type: 'combination',
      items: parts,
      key: parts.join('+') // 用于查询事件配置
    };
  }
}

// 类型定义
interface ParsedInput {
  type: 'combination' | 'password' | 'text';
  value?: string;
  items?: string[];
  key?: string;
}
```

---

#### 3.1.2 游戏状态管理 (Zustand Store)

```typescript
// packages/client/src/stores/gameStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GameState {
  // 基础信息
  roomId: string | null;
  levelId: number;
  phase: 'waiting' | 'playing' | 'paused' | 'finished';

  // 玩家信息
  players: Player[];
  currentPlayer: Player | null;

  // 游戏数据
  inventory: Item[];
  eventLog: EventLogEntry[];
  unlockedAreas: string[];
  gameFlags: Record<string, boolean>; // 状态标志

  // UI状态
  isPasswordModalOpen: boolean;
  passwordTarget: string | null;

  // 动作
  updateGameState: (state: Partial<GameState>) => void;
  addEventLog: (event: EventLogEntry) => void;
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  setFlag: (flag: string, value: boolean) => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    (set) => ({
      // 初始状态
      roomId: null,
      levelId: 1,
      phase: 'waiting',
      players: [],
      currentPlayer: null,
      inventory: [],
      eventLog: [],
      unlockedAreas: [],
      gameFlags: {},
      isPasswordModalOpen: false,
      passwordTarget: null,

      // 实现
      updateGameState: (newState) => set((state) => ({ ...state, ...newState })),

      addEventLog: (event) => set((state) => ({
        eventLog: [...state.eventLog, { ...event, timestamp: Date.now() }]
      })),

      addItem: (item) => set((state) => ({
        inventory: [...state.inventory, item]
      })),

      removeItem: (itemId) => set((state) => ({
        inventory: state.inventory.filter(i => i.id !== itemId)
      })),

      setFlag: (flag, value) => set((state) => ({
        gameFlags: { ...state.gameFlags, [flag]: value }
      }))
    }),
    { name: 'GameStore' }
  )
);
```

---

#### 3.1.3 Socket通信Hook

```typescript
// packages/client/src/hooks/useSocket.ts

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';

export function useSocket(url: string) {
  const socketRef = useRef<Socket | null>(null);
  const updateGameState = useGameStore(state => state.updateGameState);
  const addEventLog = useGameStore(state => state.addEventLog);

  useEffect(() => {
    // 连接Socket.IO
    const socket = io(url, {
      auth: {
        token: localStorage.getItem('token')
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // 事件监听
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('game:state_update', (state: GameStateUpdate) => {
      updateGameState(state);
    });

    socket.on('game:event', (event: GameEvent) => {
      addEventLog({
        type: event.type,
        text: event.text,
        character: event.character
      });
    });

    socket.on('error', (error: { message: string }) => {
      addEventLog({
        type: 'error',
        text: error.message
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [url]);

  // 返回发送方法
  return {
    emit: (event: string, data: any) => {
      socketRef.current?.emit(event, data);
    },

    sendAction: (action: GameAction) => {
      socketRef.current?.emit('game:action', action);
    }
  };
}
```

---

### 3.2 后端核心模块

#### 3.2.1 游戏引擎核心 (GameEngine)

```typescript
// packages/server/src/services/game/GameEngine.ts

import { EventProcessor } from './EventProcessor';
import { StateManager } from './StateManager';
import { InputParser } from './InputParser';

/**
 * 游戏引擎 - 协调所有游戏逻辑
 */
export class GameEngine {
  private stateManager: StateManager;
  private eventProcessor: EventProcessor;
  private inputParser: InputParser;

  constructor(
    private roomId: string,
    private levelConfig: LevelConfig
  ) {
    this.stateManager = new StateManager();
    this.eventProcessor = new EventProcessor(levelConfig.events);
    this.inputParser = new InputParser(levelConfig.synonyms);
  }

  /**
   * 处理玩家动作
   */
  async processAction(action: GameAction): Promise<GameResult> {
    try {
      // 1. 解析输入
      const parsed = this.inputParser.parse(action.input);

      // 2. 查找匹配的事件
      const event = this.eventProcessor.findEvent(parsed);
      if (!event) {
        return {
          success: false,
          message: '没有什么特别的反应...'
        };
      }

      // 3. 验证前置条件
      const validation = await this.validateConditions(
        event.preconditions,
        action.playerId
      );

      if (!validation.valid) {
        return {
          success: false,
          message: validation.reason || '当前无法执行此操作'
        };
      }

      // 4. 执行效果
      const effects = await this.executeEffects(event.effects, action.playerId);

      // 5. 更新状态
      await this.stateManager.applyEffects(effects);

      // 6. 返回结果
      return {
        success: true,
        message: event.text,
        effects: effects,
        newState: this.stateManager.getState()
      };

    } catch (error) {
      console.error('GameEngine error:', error);
      return {
        success: false,
        message: '发生了未知错误'
      };
    }
  }

  /**
   * 验证条件
   */
  private async validateConditions(
    conditions: Condition[],
    playerId: string
  ): Promise<ValidationResult> {
    for (const condition of conditions) {
      const result = await this.checkCondition(condition, playerId);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  private async checkCondition(
    condition: Condition,
    playerId: string
  ): Promise<ValidationResult> {
    const state = this.stateManager.getState();

    switch (condition.type) {
      case 'has_item':
        const hasItem = state.inventory.some(i => i.id === condition.itemId);
        return {
          valid: hasItem,
          reason: hasItem ? undefined : `需要先获得${condition.itemId}`
        };

      case 'flag_set':
        const flagValue = state.flags[condition.flag];
        return {
          valid: flagValue === condition.value,
          reason: flagValue === condition.value ? undefined : condition.errorMessage
        };

      case 'character_status':
        const character = state.characters.find(c => c.id === condition.characterId);
        return {
          valid: character?.status === condition.status,
          reason: character?.status === condition.status ? undefined : condition.errorMessage
        };

      default:
        return { valid: true };
    }
  }

  /**
   * 执行效果
   */
  private async executeEffects(
    effects: Effect[],
    playerId: string
  ): Promise<ExecutedEffect[]> {
    const executed: ExecutedEffect[] = [];

    for (const effect of effects) {
      const result = await this.executeEffect(effect, playerId);
      executed.push(result);
    }

    return executed;
  }

  private async executeEffect(
    effect: Effect,
    playerId: string
  ): Promise<ExecutedEffect> {
    switch (effect.type) {
      case 'obtain_item':
        return {
          type: 'obtain_item',
          itemId: effect.itemId,
          playerId
        };

      case 'modify_hp':
        return {
          type: 'modify_hp',
          playerId,
          delta: effect.delta
        };

      case 'set_flag':
        return {
          type: 'set_flag',
          flag: effect.flag,
          value: effect.value
        };

      case 'unlock_area':
        return {
          type: 'unlock_area',
          areaId: effect.areaId
        };

      case 'show_password_prompt':
        return {
          type: 'show_password_prompt',
          target: effect.target,
          correctPassword: effect.password
        };

      default:
        return { type: 'unknown' };
    }
  }

  /**
   * 获取当前游戏状态
   */
  getState(): GameState {
    return this.stateManager.getState();
  }

  /**
   * 恢复游戏状态（用于断线重连）
   */
  async restoreState(savedState: GameState): Promise<void> {
    await this.stateManager.setState(savedState);
  }
}
```

---

#### 3.2.2 事件处理器 (EventProcessor)

```typescript
// packages/server/src/services/game/EventProcessor.ts

/**
 * 事件处理器 - 管理和匹配游戏事件
 */
export class EventProcessor {
  private events: Map<string, GameEvent>;
  private triggeredOnceEvents: Set<string>; // 记录已触发的一次性事件

  constructor(eventConfigs: EventConfig[]) {
    this.events = new Map();
    this.triggeredOnceEvents = new Set();

    // 构建事件索引
    eventConfigs.forEach(config => {
      config.triggers.forEach(trigger => {
        this.events.set(trigger, config);
      });
    });
  }

  /**
   * 查找匹配的事件
   */
  findEvent(parsed: ParsedInput): GameEvent | null {
    if (parsed.type === 'combination') {
      const event = this.events.get(parsed.key!);

      // 检查一次性事件是否已触发
      if (event && event.repeatable === false) {
        if (this.triggeredOnceEvents.has(event.id)) {
          return null; // 已触发过，返回null
        }
      }

      return event || null;
    }

    return null;
  }

  /**
   * 标记事件已触发
   */
  markTriggered(eventId: string): void {
    this.triggeredOnceEvents.add(eventId);
  }

  /**
   * 获取所有可用的组合提示
   */
  getAvailableCombinations(state: GameState): string[] {
    const available: string[] = [];

    this.events.forEach((event, trigger) => {
      // 检查条件是否满足
      const conditionsMet = event.preconditions.every(condition => {
        return this.checkCondition(condition, state);
      });

      if (conditionsMet && !this.triggeredOnceEvents.has(event.id)) {
        available.push(trigger);
      }
    });

    return available;
  }

  private checkCondition(condition: Condition, state: GameState): boolean {
    // 简化的条件检查逻辑
    switch (condition.type) {
      case 'has_item':
        return state.inventory.some(i => i.id === condition.itemId);
      case 'flag_set':
        return state.flags[condition.flag] === condition.value;
      default:
        return true;
    }
  }
}
```

---

#### 3.2.3 房间管理器 (RoomManager)

```typescript
// packages/server/src/services/room/RoomManager.ts

import { GameEngine } from '../game/GameEngine';
import { RedisClient } from '../../config/redis';
import { PrismaClient } from '@prisma/client';

/**
 * 房间管理器 - 管理所有游戏房间
 */
export class RoomManager {
  private rooms: Map<string, RoomInstance> = new Map();

  constructor(
    private redis: RedisClient,
    private prisma: PrismaClient
  ) {}

  /**
   * 创建房间
   */
  async createRoom(options: CreateRoomOptions): Promise<Room> {
    const roomId = this.generateRoomId();

    // 创建数据库记录
    const room = await this.prisma.room.create({
      data: {
        id: roomId,
        name: options.name,
        maxPlayers: 3,
        creatorId: options.creatorId,
        status: 'waiting'
      }
    });

    // 创建内存实例
    const instance: RoomInstance = {
      id: roomId,
      players: [],
      gameEngine: null,
      status: 'waiting',
      createdAt: Date.now()
    };

    this.rooms.set(roomId, instance);

    // 存储到Redis
    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(instance),
      'EX',
      3600 // 1小时过期
    );

    return room;
  }

  /**
   * 玩家加入房间
   */
  async joinRoom(roomId: string, player: Player): Promise<JoinResult> {
    const instance = await this.getRoomInstance(roomId);

    if (!instance) {
      return { success: false, error: '房间不存在' };
    }

    if (instance.status !== 'waiting') {
      return { success: false, error: '游戏已开始' };
    }

    if (instance.players.length >= 3) {
      return { success: false, error: '房间已满' };
    }

    // 检查角色是否已被选择
    const characterTaken = instance.players.some(
      p => p.character === player.character
    );

    if (characterTaken) {
      return { success: false, error: '该角色已被选择' };
    }

    // 添加玩家
    instance.players.push(player);
    await this.updateRoomInstance(roomId, instance);

    return { success: true };
  }

  /**
   * 开始游戏
   */
  async startGame(roomId: string): Promise<void> {
    const instance = await this.getRoomInstance(roomId);

    if (!instance) {
      throw new Error('房间不存在');
    }

    if (instance.players.length !== 3) {
      throw new Error('需要3名玩家才能开始');
    }

    // 初始化游戏引擎
    const levelConfig = await this.loadLevelConfig(1);
    instance.gameEngine = new GameEngine(roomId, levelConfig);
    instance.status = 'playing';

    await this.updateRoomInstance(roomId, instance);

    // 更新数据库
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'playing', startedAt: new Date() }
    });
  }

  /**
   * 处理玩家动作
   */
  async handleAction(
    roomId: string,
    playerId: string,
    action: GameAction
  ): Promise<GameResult> {
    const instance = await this.getRoomInstance(roomId);

    if (!instance?.gameEngine) {
      throw new Error('游戏未开始');
    }

    // 执行动作
    const result = await instance.gameEngine.processAction({
      ...action,
      playerId
    });

    // 保存状态到Redis
    if (result.success) {
      await this.saveGameState(roomId, instance.gameEngine.getState());
    }

    return result;
  }

  /**
   * 获取房间实例
   */
  private async getRoomInstance(roomId: string): Promise<RoomInstance | null> {
    // 先从内存查找
    let instance = this.rooms.get(roomId);

    if (!instance) {
      // 从Redis恢复
      const cached = await this.redis.get(`room:${roomId}`);
      if (cached) {
        instance = JSON.parse(cached);
        this.rooms.set(roomId, instance);
      }
    }

    return instance || null;
  }

  /**
   * 更新房间实例
   */
  private async updateRoomInstance(
    roomId: string,
    instance: RoomInstance
  ): Promise<void> {
    this.rooms.set(roomId, instance);
    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(instance),
      'EX',
      3600
    );
  }

  /**
   * 保存游戏状态
   */
  private async saveGameState(roomId: string, state: GameState): Promise<void> {
    await this.redis.set(
      `game_state:${roomId}`,
      JSON.stringify(state),
      'EX',
      3600
    );

    // 定期持久化到PostgreSQL（每5分钟或关键节点）
    // 这里可以使用队列异步处理
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadLevelConfig(levelId: number): Promise<LevelConfig> {
    const events = require(`../../data/events/level0${levelId}-events.json`);
    const synonyms = require('../../data/synonyms/synonyms.json');
    const items = require('../../data/items/items.json');

    return { events, synonyms, items };
  }
}
```

---

#### 3.2.4 Socket.IO处理器

```typescript
// packages/server/src/socket/handlers/gameHandler.ts

import { Socket } from 'socket.io';
import { RoomManager } from '../../services/room/RoomManager';

export function setupGameHandlers(
  socket: Socket,
  roomManager: RoomManager
) {
  /**
   * 玩家执行动作
   */
  socket.on('game:action', async (action: GameAction) => {
    try {
      const roomId = socket.data.roomId;
      const playerId = socket.data.userId;

      if (!roomId) {
        socket.emit('error', { message: '未加入房间' });
        return;
      }

      // 处理动作
      const result = await roomManager.handleAction(roomId, playerId, action);

      if (result.success) {
        // 广播给房间所有玩家
        socket.to(roomId).emit('game:event', {
          type: 'action_result',
          playerId,
          text: result.message,
          effects: result.effects
        });

        // 更新游戏状态
        socket.to(roomId).emit('game:state_update', result.newState);
      } else {
        // 只发给当前玩家
        socket.emit('game:event', {
          type: 'error',
          text: result.message
        });
      }

    } catch (error) {
      console.error('Action handler error:', error);
      socket.emit('error', { message: '处理动作时发生错误' });
    }
  });

  /**
   * 请求当前状态（用于断线重连）
   */
  socket.on('game:request_state', async () => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const instance = await roomManager.getRoomInstance(roomId);
      if (instance?.gameEngine) {
        const state = instance.gameEngine.getState();
        socket.emit('game:state_update', state);
      }

    } catch (error) {
      console.error('Request state error:', error);
    }
  });
}
```

---

### 3.3 数据库Schema设计

```prisma
// packages/server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  email         String?   @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关系
  createdRooms  Room[]    @relation("RoomCreator")
  gameSessions  GameSession[]

  @@map("users")
}

// 房间表
model Room {
  id          String      @id
  name        String
  maxPlayers  Int         @default(3)
  status      RoomStatus  @default(WAITING)
  creatorId   String
  createdAt   DateTime    @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?

  // 关系
  creator     User        @relation("RoomCreator", fields: [creatorId], references: [id])
  sessions    GameSession[]
  saveStates  SaveState[]

  @@map("rooms")
}

enum RoomStatus {
  WAITING
  PLAYING
  PAUSED
  FINISHED
}

// 游戏会话（玩家参与记录）
model GameSession {
  id          String    @id @default(uuid())
  roomId      String
  userId      String
  character   Character
  joinedAt    DateTime  @default(now())
  leftAt      DateTime?

  // 关系
  room        Room      @relation(fields: [roomId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([roomId, character])
  @@map("game_sessions")
}

enum Character {
  CAT
  DOG
  TURTLE
}

// 存档表
model SaveState {
  id          String    @id @default(uuid())
  roomId      String
  levelId     Int
  gameState   Json      // JSONB存储完整游戏状态
  createdAt   DateTime  @default(now())

  // 关系
  room        Room      @relation(fields: [roomId], references: [id])

  @@index([roomId, createdAt])
  @@map("save_states")
}

// 事件日志（可选，用于数据分析）
model EventLog {
  id          String    @id @default(uuid())
  roomId      String
  playerId    String
  eventType   String
  eventData   Json
  timestamp   DateTime  @default(now())

  @@index([roomId, timestamp])
  @@map("event_logs")
}
```

---

## 4. 开发步骤（优先级排序）

### Phase 1: 项目初始化与基础架构 (Week 1)

**优先级：P0 (必须完成)**

#### 任务清单
- [ ] **1.1 环境搭建**
  - 初始化Monorepo（pnpm workspaces）
  - 配置TypeScript、ESLint、Prettier
  - 搭建Docker开发环境（PostgreSQL + Redis）

- [ ] **1.2 后端基础**
  - 创建Express服务器框架
  - 配置Prisma，设计数据库Schema
  - 执行数据库迁移
  - 实现JWT认证系统（注册/登录）

- [ ] **1.3 前端基础**
  - 创建Vite + React项目
  - 配置Tailwind CSS
  - 创建基础Layout和路由
  - 实现登录/注册页面

**验收标准**：
- ✅ 用户可以注册、登录
- ✅ 前后端能正常通信（HTTP API）
- ✅ 数据库能正常读写

---

### Phase 2: 核心游戏引擎开发 (Week 2-3)

**优先级：P0 (必须完成)**

#### 任务清单
- [ ] **2.1 输入解析系统**
  - 实现InputParser类（前后端共享）
  - 配置同义词映射表（synonyms.json）
  - 单元测试（覆盖率>80%）

- [ ] **2.2 事件配置系统**
  - 设计事件配置JSON格式
  - 创建level01-events.json（包含60+组合）
  - 实现EventProcessor类

- [ ] **2.3 状态管理系统**
  - 实现StateManager类
  - 实现ConditionValidator（条件验证）
  - 实现EffectExecutor（效果执行）

- [ ] **2.4 游戏引擎核心**
  - 实现GameEngine类
  - 整合InputParser、EventProcessor、StateManager
  - 集成测试（模拟完整游戏流程）

**验收标准**：
- ✅ 能正确解析输入："猫+行李箱" = "行李箱+猫" = "天一+luggage"
- ✅ 能验证复杂条件链（如：救狗需要先救猫）
- ✅ 能执行各种效果（获得道具、修改生命值、解锁区域）
- ✅ 通过第一关关键流程测试

---

### Phase 3: WebSocket实时通信 (Week 3-4)

**优先级：P0 (必须完成)**

#### 任务清单
- [ ] **3.1 Socket.IO服务器**
  - 配置Socket.IO服务器
  - 实现房间管理（创建、加入、离开）
  - 实现认证中间件

- [ ] **3.2 Socket.IO客户端**
  - 创建useSocket Hook
  - 实现自动重连逻辑
  - 实现状态同步

- [ ] **3.3 房间管理系统**
  - 实现RoomManager类
  - Redis集成（房间状态缓存）
  - 分布式锁（防止并发冲突）

- [ ] **3.4 断线重连**
  - 实现状态快照机制
  - 重连后状态恢复
  - 超时踢出机制

**验收标准**：
- ✅ 3个玩家能同时加入房间
- ✅ 动作能实时广播给所有玩家
- ✅ 断线后重连能恢复完整状态
- ✅ 一个玩家的操作不会被另一个玩家的并发操作覆盖

---

### Phase 4: 第一关完整实现 (Week 4-5)

**优先级：P0 (必须完成)**

#### 任务清单
- [ ] **4.1 UI组件开发**
  - GameBoard（游戏主面板）
  - InputPanel（输入框+提交）
  - InventoryPanel（背包系统）
  - PlayerPanel（角色信息、生命值）
  - EventLog（事件日志滚动显示）

- [ ] **4.2 特殊交互**
  - PasswordModal（密码输入弹窗）
  - CharacterSelector（角色选择界面）
  - WaitingRoom（等待房间界面）

- [ ] **4.3 游戏逻辑**
  - 配置完整60+组合
  - 实现字母收集系统（L, O, V, E）
  - 实现密码验证（行李箱000、大门LOVE）
  - 实现生命值锁定机制

- [ ] **4.4 视觉和动画**
  - 文本逐字显示动画
  - 获得道具动画
  - 生命值变化动画
  - 页面过渡动画

**验收标准**：
- ✅ 能完整通关第一关（从开始到输入LOVE开门）
- ✅ 所有60+组合都能正常触发
- ✅ UI流畅，动画自然
- ✅ 多人协作测试通过

---

### Phase 5: 存档系统与优化 (Week 5-6)

**优先级：P1 (重要)**

#### 任务清单
- [ ] **5.1 存档系统**
  - 实现手动存档（保存到PostgreSQL）
  - 实现自动存档（每5分钟或关键节点）
  - 实现读档功能
  - 存档列表界面

- [ ] **5.2 性能优化**
  - Redis缓存优化（减少数据库查询）
  - 前端状态更新优化（防止不必要的re-render）
  - Socket.IO消息压缩

- [ ] **5.3 错误处理**
  - 全局错误捕获
  - 友好的错误提示
  - 日志系统（Winston）

- [ ] **5.4 用户体验**
  - 加载状态提示
  - 网络延迟提示
  - 操作确认（防止误操作）

**验收标准**：
- ✅ 存档/读档功能正常
- ✅ 系统能稳定运行1小时无崩溃
- ✅ 网络延迟<200ms时体验流畅

---

### Phase 6: 后续关卡开发 (Week 7-10)

**优先级：P1 (重要)**

#### 任务清单
- [ ] **6.1 第二关：藏匿**
  - 实现8区域随机机制
  - 实现5次攻击限制
  - 配置第二关事件

- [ ] **6.2 第三关：回忆**
  - 实现3条角色线路
  - 实现回忆收集系统
  - 配置分支剧情

- [ ] **6.3 第四关：修炼**
  - 实现属性提升系统
  - 配置修炼事件

- [ ] **6.4 第五关：BOSS战**
  - 实现3种BOSS机制
  - 实现战斗系统
  - 配置结局触发

**验收标准**：
- ✅ 所有关卡可完整通关
- ✅ 分支剧情正常工作
- ✅ BOSS战机制正确

---

### Phase 7: 测试与部署 (Week 11-12)

**优先级：P0 (必须完成)**

#### 任务清单
- [ ] **7.1 全面测试**
  - 单元测试（覆盖率>80%）
  - 集成测试
  - E2E测试（Playwright）
  - 压力测试（模拟100个并发房间）

- [ ] **7.2 Docker部署**
  - 编写Dockerfile
  - 配置docker-compose
  - 环境变量管理

- [ ] **7.3 服务器部署**
  - 云服务器配置
  - Nginx反向代理
  - HTTPS证书
  - PM2进程管理

- [ ] **7.4 监控与日志**
  - 日志聚合（ELK或云日志服务）
  - 性能监控（APM）
  - 错误追踪（Sentry）

**验收标准**：
- ✅ 所有测试通过
- ✅ 能在生产环境稳定运行
- ✅ 监控系统正常工作

---

### Phase 8: 运营与迭代 (Week 13+)

**优先级：P2 (可选)**

#### 任务清单
- [ ] **8.1 数据分析**
  - 玩家行为分析
  - 通关率统计
  - 难点识别

- [ ] **8.2 功能增强**
  - 排行榜系统
  - 成就系统
  - 社交功能（好友、聊天）

- [ ] **8.3 内容更新**
  - 新关卡
  - 新道具组合
  - 季节性活动

---

## 5. 测试策略

### 5.1 单元测试

**覆盖目标：>80%**

#### 核心模块测试

```typescript
// packages/server/tests/unit/InputParser.test.ts

import { InputParser } from '../../src/services/game/InputParser';

describe('InputParser', () => {
  let parser: InputParser;

  beforeEach(() => {
    const synonyms = {
      '猫': 'cat',
      '天一': 'cat',
      '行李箱': 'luggage',
      'luggage': 'luggage'
    };
    parser = new InputParser(synonyms);
  });

  describe('组合输入解析', () => {
    test('应该正确解析标准组合', () => {
      const result = parser.parse('猫+行李箱');
      expect(result).toEqual({
        type: 'combination',
        items: ['cat', 'luggage'],
        key: 'cat+luggage'
      });
    });

    test('应该处理顺序无关性', () => {
      const result1 = parser.parse('猫+行李箱');
      const result2 = parser.parse('行李箱+猫');
      expect(result1.key).toBe(result2.key);
    });

    test('应该应用同义词映射', () => {
      const result1 = parser.parse('猫+行李箱');
      const result2 = parser.parse('天一+luggage');
      expect(result1.key).toBe(result2.key);
    });

    test('应该处理多种分隔符', () => {
      expect(parser.parse('猫+行李箱').key).toBe('cat+luggage');
      expect(parser.parse('猫 行李箱').key).toBe('cat+luggage');
      expect(parser.parse('猫、行李箱').key).toBe('cat+luggage');
    });
  });

  describe('密码输入解析', () => {
    test('应该识别数字密码', () => {
      const result = parser.parse('000');
      expect(result).toEqual({
        type: 'password',
        value: '000'
      });
    });

    test('应该识别字母密码', () => {
      const result = parser.parse('LOVE');
      expect(result).toEqual({
        type: 'password',
        value: 'LOVE'
      });
    });
  });
});
```

```typescript
// packages/server/tests/unit/StateManager.test.ts

import { StateManager } from '../../src/services/game/StateManager';

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();
  });

  test('应该能添加道具', async () => {
    await manager.applyEffects([
      { type: 'obtain_item', itemId: 'wooden_box', playerId: 'player1' }
    ]);

    const state = manager.getState();
    expect(state.inventory).toContainEqual(
      expect.objectContaining({ id: 'wooden_box' })
    );
  });

  test('应该能设置标志', async () => {
    await manager.applyEffects([
      { type: 'set_flag', flag: 'cat_rescued', value: true }
    ]);

    const state = manager.getState();
    expect(state.flags.cat_rescued).toBe(true);
  });

  test('应该能修改生命值', async () => {
    await manager.applyEffects([
      { type: 'modify_hp', playerId: 'player1', delta: -2 }
    ]);

    const state = manager.getState();
    const player = state.players.find(p => p.id === 'player1');
    expect(player?.hp).toBe(8); // 假设初始10点
  });
});
```

---

### 5.2 集成测试

**测试完整游戏流程**

```typescript
// packages/server/tests/integration/gameFlow.test.ts

import { GameEngine } from '../../src/services/game/GameEngine';

describe('第一关游戏流程', () => {
  let engine: GameEngine;

  beforeEach(() => {
    const levelConfig = loadTestLevelConfig();
    engine = new GameEngine('test-room', levelConfig);
  });

  test('应该能完整通关第一关', async () => {
    // 1. 输入密码救出猫
    let result = await engine.processAction({
      playerId: 'player1',
      input: '000'
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('行李箱打开');

    // 2. 猫+行李箱获得钥匙
    result = await engine.processAction({
      playerId: 'player1',
      input: '猫+行李箱'
    });
    expect(result.success).toBe(true);
    expect(engine.getState().inventory).toContainEqual(
      expect.objectContaining({ id: 'key' })
    );

    // 3. 钥匙+囚笼救出狗
    result = await engine.processAction({
      playerId: 'player2',
      input: '钥匙+囚笼'
    });
    expect(result.success).toBe(true);

    // 4. 收集字母L, O, V, E
    await engine.processAction({ playerId: 'player1', input: '龟+水潭' });
    await engine.processAction({ playerId: 'player2', input: '木盒+狗' });
    // ... 收集其他字母

    // 5. 输入密码LOVE通关
    result = await engine.processAction({
      playerId: 'player3',
      input: 'LOVE'
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('大门打开');
  });

  test('应该拒绝不满足条件的操作', async () => {
    // 尝试在救出猫之前获得钥匙
    const result = await engine.processAction({
      playerId: 'player1',
      input: '猫+行李箱'
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('需要先');
  });
});
```

---

### 5.3 E2E测试

**使用Playwright测试完整用户流程**

```typescript
// packages/client/tests/e2e/game.spec.ts

import { test, expect } from '@playwright/test';

test.describe('完整游戏流程', () => {
  test('3个玩家协作通关第一关', async ({ browser }) => {
    // 创建3个浏览器上下文（模拟3个玩家）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();
    const player3 = await context3.newPage();

    // 玩家1创建房间
    await player1.goto('http://localhost:5173');
    await player1.click('text=创建房间');
    await player1.fill('[name=roomName]', '测试房间');
    await player1.click('[data-character=cat]');
    await player1.click('text=创建');

    // 获取房间ID
    const roomId = await player1.locator('[data-room-id]').getAttribute('data-room-id');

    // 玩家2和3加入房间
    await player2.goto(`http://localhost:5173/room/${roomId}`);
    await player2.click('[data-character=dog]');
    await player2.click('text=加入');

    await player3.goto(`http://localhost:5173/room/${roomId}`);
    await player3.click('[data-character=turtle]');
    await player3.click('text=加入');

    // 开始游戏
    await player1.click('text=开始游戏');

    // 玩家1输入密码救猫
    await player1.fill('[data-input]', '000');
    await player1.press('[data-input]', 'Enter');

    // 验证所有玩家都能看到事件
    await expect(player1.locator('.event-log')).toContainText('行李箱打开');
    await expect(player2.locator('.event-log')).toContainText('行李箱打开');
    await expect(player3.locator('.event-log')).toContainText('行李箱打开');

    // ... 继续后续流程
  });
});
```

---

### 5.4 性能测试

**压力测试：模拟100个并发房间**

```typescript
// packages/server/tests/performance/load.test.ts

import { io } from 'socket.io-client';

describe('性能测试', () => {
  test('应该能处理100个并发房间', async () => {
    const rooms = 100;
    const playersPerRoom = 3;

    const sockets: any[] = [];
    const startTime = Date.now();

    // 创建100个房间，每个房间3个玩家
    for (let i = 0; i < rooms; i++) {
      for (let j = 0; j < playersPerRoom; j++) {
        const socket = io('http://localhost:3000', {
          auth: { token: `test-token-${i}-${j}` }
        });

        sockets.push(socket);

        await new Promise<void>((resolve) => {
          socket.on('connect', () => resolve());
        });
      }
    }

    const connectionTime = Date.now() - startTime;
    console.log(`连接时间: ${connectionTime}ms`);

    // 每个房间执行10个动作
    const actionPromises = sockets.map((socket, index) => {
      return new Promise<void>((resolve) => {
        let actionCount = 0;

        const sendAction = () => {
          if (actionCount >= 10) {
            resolve();
            return;
          }

          socket.emit('game:action', {
            input: '猫+行李箱'
          });

          actionCount++;
          setTimeout(sendAction, 100); // 每100ms发送一个动作
        };

        sendAction();
      });
    });

    await Promise.all(actionPromises);

    const totalTime = Date.now() - startTime;
    console.log(`总时间: ${totalTime}ms`);

    // 断言：总时间应小于30秒
    expect(totalTime).toBeLessThan(30000);

    // 清理
    sockets.forEach(socket => socket.disconnect());
  }, 60000); // 60秒超时
});
```

---

### 5.5 测试数据管理

**创建测试Fixtures**

```typescript
// packages/server/tests/fixtures/testData.ts

export const testUsers = {
  player1: {
    id: 'user-1',
    username: 'test_player1',
    email: 'player1@test.com',
    passwordHash: 'hashed_password'
  },
  player2: {
    id: 'user-2',
    username: 'test_player2',
    email: 'player2@test.com',
    passwordHash: 'hashed_password'
  },
  player3: {
    id: 'user-3',
    username: 'test_player3',
    email: 'player3@test.com',
    passwordHash: 'hashed_password'
  }
};

export const testRoom = {
  id: 'test-room-1',
  name: '测试房间',
  maxPlayers: 3,
  status: 'waiting',
  creatorId: 'user-1'
};

export const testGameState = {
  levelId: 1,
  inventory: [],
  eventLog: [],
  flags: {},
  players: [
    { id: 'user-1', character: 'cat', hp: 10, maxHp: 10 },
    { id: 'user-2', character: 'dog', hp: 10, maxHp: 10 },
    { id: 'user-3', character: 'turtle', hp: 10, maxHp: 10 }
  ]
};
```

---

## 6. 关键配置文件示例

### 6.1 事件配置示例

```json
// packages/server/src/data/events/level01-events.json

[
  {
    "id": "event_001",
    "triggers": ["cat+luggage", "luggage+cat"],
    "preconditions": [
      {
        "type": "flag_set",
        "flag": "cat_rescued",
        "value": true,
        "errorMessage": "猫还被困在行李箱里"
      },
      {
        "type": "item_not_damaged",
        "itemId": "luggage",
        "errorMessage": "行李箱已经损坏了"
      }
    ],
    "effects": [
      {
        "type": "obtain_item",
        "itemId": "key"
      },
      {
        "type": "show_text",
        "text": "天一在行李箱的夹层中找到了一把钥匙"
      },
      {
        "type": "unlock_combinations",
        "combinations": ["key+cage", "key+luggage"]
      }
    ],
    "repeatable": false
  },
  {
    "id": "event_password_luggage",
    "triggers": ["password_luggage"],
    "preconditions": [],
    "effects": [
      {
        "type": "show_password_prompt",
        "target": "luggage",
        "correctPassword": "000",
        "successEvent": "event_luggage_opened",
        "failureText": "密码错误，行李箱没有打开"
      }
    ],
    "repeatable": true
  },
  {
    "id": "event_luggage_opened",
    "triggers": ["_internal"],
    "preconditions": [],
    "effects": [
      {
        "type": "set_flag",
        "flag": "cat_rescued",
        "value": true
      },
      {
        "type": "show_text",
        "text": "行李箱打开了！一只小猫跳了出来，它似乎就是天一"
      },
      {
        "type": "unlock_combinations",
        "combinations": ["cat+luggage", "cat+player"]
      }
    ],
    "repeatable": false
  }
]
```

---

### 6.2 同义词配置示例

```json
// packages/server/src/data/synonyms/synonyms.json

{
  "characters": {
    "cat": ["猫", "天一", "小猫", "cat"],
    "dog": ["狗", "小狗", "旺财", "dog"],
    "turtle": ["龟", "乌龟", "包子", "turtle"]
  },
  "items": {
    "luggage": ["行李箱", "箱子", "luggage", "suitcase"],
    "cage": ["囚笼", "笼子", "cage"],
    "key": ["钥匙", "key"],
    "pool": ["水潭", "水塘", "pond", "pool"],
    "wardrobe": ["衣柜", "柜子", "wardrobe"],
    "wooden_box": ["木盒", "盒子", "box"]
  },
  "areas": {
    "small_room": ["小房间", "房间", "room"],
    "main_hall": ["大厅", "hall"]
  }
}
```

---

## 7. 开发规范

### 7.1 Git工作流

```bash
# 分支命名
feature/xxx   # 新功能
bugfix/xxx    # Bug修复
hotfix/xxx    # 紧急修复
refactor/xxx  # 重构

# Commit消息格式
feat: 添加第一关事件配置
fix: 修复输入解析大小写问题
refactor: 重构状态管理逻辑
test: 添加InputParser单元测试
docs: 更新API文档
```

### 7.2 代码审查清单

- [ ] 代码符合TypeScript规范
- [ ] 有足够的注释（特别是复杂逻辑）
- [ ] 通过所有单元测试
- [ ] 没有console.log（改用logger）
- [ ] 错误处理完善
- [ ] 性能优化（避免不必要的循环、查询）

---

## 8. 部署清单

### 8.1 生产环境配置

```bash
# 环境变量 (.env.production)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/echo_game
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_change_in_production
PORT=3000
CLIENT_URL=https://yourdomain.com
```

### 8.2 Nginx配置

```nginx
# /etc/nginx/sites-available/echo-game

upstream backend {
  server localhost:3000;
}

server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # 前端静态文件
  location / {
    root /var/www/echo-game/client/dist;
    try_files $uri $uri/ /index.html;
  }

  # API请求
  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # WebSocket
  location /socket.io {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## 9. 风险与挑战

### 9.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| WebSocket连接不稳定 | 高 | 中 | 实现健壮的重连机制+心跳检测 |
| 并发状态冲突 | 高 | 高 | 使用Redis分布式锁 |
| 数据库性能瓶颈 | 中 | 中 | Redis缓存+查询优化 |
| 前端状态管理复杂 | 中 | 高 | 使用Zustand+严格的状态设计 |

### 9.2 开发风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 事件配置错误 | 高 | 高 | 完善的测试+配置验证工具 |
| 条件依赖复杂度高 | 中 | 高 | 可视化配置工具+充分文档 |
| 开发周期延误 | 中 | 中 | 分阶段交付+MVP优先 |

---

## 10. 后续优化方向

1. **AI辅助**：接入LLM，理解自然语言输入（"让猫去看看行李箱"）
2. **移动端适配**：响应式设计或独立App
3. **语音交互**：语音输入/输出
4. **实时翻译**：支持多语言
5. **观战模式**：允许其他玩家观看游戏
6. **回放系统**：录制并回放游戏过程
7. **编辑器**：可视化关卡编辑器（降低内容创作门槛）

---

## 附录

### A. 技术栈对比

| 对比项 | 当前方案 | 替代方案 | 选择理由 |
|--------|----------|----------|----------|
| 前端框架 | React | Vue/Svelte | 生态成熟，团队熟悉 |
| 状态管理 | Zustand | Redux/Jotai | 轻量、简单、够用 |
| 后端框架 | Express | Fastify/Nest.js | 成熟稳定，插件多 |
| 数据库 | PostgreSQL | MongoDB | 需要ACID事务保证 |
| 缓存 | Redis | Memcached | 功能更丰富（Pub/Sub） |
| 实时通信 | Socket.IO | 原生WebSocket | 自动重连、房间管理 |

### B. 参考资源

- [Socket.IO文档](https://socket.io/docs/v4/)
- [Prisma文档](https://www.prisma.io/docs)
- [Zustand文档](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**文档版本**: v1.0
**创建日期**: 2025-10-27
**最后更新**: 2025-10-27
**维护者**: Claude AI Assistant
