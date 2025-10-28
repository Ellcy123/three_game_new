/**
 * 房间相关的 WebSocket 事件处理器
 *
 * 负责处理房间管理的实时通信：
 * - 加入房间
 * - 离开房间
 * - 开始游戏
 * - 断线重连
 *
 * 参考：后端架构文档第 5.2 节
 */

import { Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { roomService } from '../services/roomService';
import { getRedisClient, setCache, getCache } from '../config/redis';
import { RoomStatus, CharacterType } from '../types';

/**
 * 扩展 Socket 接口，添加用户信息
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

/**
 * 房间玩家 Redis 数据结构
 */
interface RoomPlayerRedisData {
  userId: string;
  username: string;
  characterType: CharacterType;
  characterName: string;
  socketId: string;
  status: 'active' | 'disconnected';
  joinedAt: number;
  disconnectedAt?: number;
}

/**
 * 断线玩家超时映射
 * 用于跟踪断线玩家的超时定时器
 */
const disconnectionTimers = new Map<string, NodeJS.Timeout>();

/**
 * 注册房间相关的 WebSocket 事件处理器
 *
 * @param io Socket.IO 服务器实例
 * @param socket 已认证的 Socket 连接
 */
export function registerRoomHandlers(io: any, socket: AuthenticatedSocket): void {
  // ========================================
  // 加入房间事件
  // ========================================
  socket.on(
    'room:join',
    async (
      data: {
        room_id: string;
        character_type: CharacterType;
        character_name: string;
      },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`📥 用户 ${socket.username} (${socket.userId}) 请求加入房间: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id || !data.character_type || !data.character_name) {
          throw new Error('缺少必需参数');
        }

        if (!socket.userId || !socket.username) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 验证角色类型
        // ========================================
        const validCharacters = ['cat', 'dog', 'turtle'];
        if (!validCharacters.includes(data.character_type)) {
          throw new Error('无效的角色类型');
        }

        // ========================================
        // 3. 使用 RoomService 加入房间（验证房间状态、人数、角色）
        // ========================================
        const room = await roomService.joinRoom(
          {
            roomId: data.room_id,
            character: data.character_type,
            username: data.character_name,
          },
          socket.userId
        );

        // ========================================
        // 4. 加入 Socket.IO 房间
        // ========================================
        await socket.join(data.room_id);

        // ========================================
        // 5. 保存玩家数据到 Redis
        // ========================================
        const redisKey = `room:${data.room_id}:players`;
        const playerData: RoomPlayerRedisData = {
          userId: socket.userId,
          username: socket.username,
          characterType: data.character_type,
          characterName: data.character_name,
          socketId: socket.id,
          status: 'active',
          joinedAt: Date.now(),
        };

        // 使用 Redis Hash 存储房间玩家
        const client = await getRedisClient();
        await client.hSet(redisKey, socket.userId, JSON.stringify(playerData));
        await client.expire(redisKey, 43200); // 12 小时过期

        // ========================================
        // 6. 广播给房间内的其他玩家
        // ========================================
        socket.to(data.room_id).emit('room:player_joined', {
          user_id: socket.userId,
          username: socket.username,
          character_type: data.character_type,
          character_name: data.character_name,
          timestamp: Date.now(),
        });

        // ========================================
        // 7. 返回房间完整信息给加入者
        // ========================================
        callback?.({
          success: true,
          message: '成功加入房间',
          data: {
            room,
          },
        });

        logger.info(`✅ 用户 ${socket.username} 成功加入房间: ${data.room_id}`);
      } catch (error) {
        logger.error(`❌ 用户 ${socket.username} 加入房间失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'JOIN_ROOM_ERROR',
            message: error instanceof Error ? error.message : '加入房间失败',
          },
        });
      }
    }
  );

  // ========================================
  // 离开房间事件
  // ========================================
  socket.on(
    'room:leave',
    async (
      data: { room_id: string },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`📤 用户 ${socket.username} (${socket.userId}) 请求离开房间: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        if (!socket.userId) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 从 Socket.IO 房间移除
        // ========================================
        await socket.leave(data.room_id);

        // ========================================
        // 3. 从 Redis 删除玩家数据
        // ========================================
        const redisKey = `room:${data.room_id}:players`;
        const client = await getRedisClient();
        await client.hDel(redisKey, socket.userId);

        // ========================================
        // 4. 使用 RoomService 离开房间（处理数据库逻辑）
        // ========================================
        await roomService.leaveRoom({
          roomId: data.room_id,
          playerId: socket.userId,
        });

        // ========================================
        // 5. 广播给房间内的其他玩家
        // ========================================
        socket.to(data.room_id).emit('room:player_left', {
          user_id: socket.userId,
          username: socket.username,
          timestamp: Date.now(),
        });

        // ========================================
        // 6. 返回成功响应
        // ========================================
        callback?.({
          success: true,
          message: '成功离开房间',
        });

        logger.info(`✅ 用户 ${socket.username} 成功离开房间: ${data.room_id}`);
      } catch (error) {
        logger.error(`❌ 用户 ${socket.username} 离开房间失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'LEAVE_ROOM_ERROR',
            message: error instanceof Error ? error.message : '离开房间失败',
          },
        });
      }
    }
  );

  // ========================================
  // 开始游戏事件
  // ========================================
  socket.on(
    'room:start_game',
    async (
      data: { room_id: string },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`🎮 用户 ${socket.username} (${socket.userId}) 请求开始游戏: ${data.room_id}`);

        // ========================================
        // 1. 验证必需参数
        // ========================================
        if (!data.room_id) {
          throw new Error('缺少房间ID');
        }

        if (!socket.userId) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 2. 获取房间详情
        // ========================================
        const room = await roomService.getRoomDetails(data.room_id);

        // ========================================
        // 3. 验证是否为房主
        // ========================================
        if (room.creatorId !== socket.userId) {
          throw new Error('只有房主可以开始游戏');
        }

        // ========================================
        // 4. 检查房间状态
        // ========================================
        if (room.status !== RoomStatus.WAITING) {
          throw new Error('房间状态不允许开始游戏');
        }

        // ========================================
        // 5. 检查人数（至少需要 1 个玩家，最多 3 个）
        // ========================================
        if (room.currentPlayers < 1) {
          throw new Error('房间人数不足');
        }

        if (room.currentPlayers > 3) {
          throw new Error('房间人数超过限制');
        }

        // ========================================
        // 6. 更新房间状态为 "playing"
        // ========================================
        await roomService.updateRoomStatus(data.room_id, RoomStatus.PLAYING);

        // ========================================
        // 7. 初始化游戏状态（保存到 Redis）
        // ========================================
        const initialGameState = {
          chapter: 1,
          checkpoint: '密室',
          players: room.players.map((player) => ({
            userId: player.id,
            username: player.username,
            character: player.character,
            hp: 8,
            maxHp: 8,
            status: 'active',
            inventory: [],
          })),
          gameState: {
            // TODO: 根据关卡设计初始化游戏状态
            roomDiscovered: false,
            charactersRescued: {
              cat: false,
              dog: false,
              turtle: true, // 乌龟默认自由
            },
            itemsCollected: [],
            lettersCollected: [],
          },
          currentTurn: room.players[0]?.id, // 第一个玩家开始
          turnNumber: 1,
          createdAt: Date.now(),
        };

        // 保存游戏状态到 Redis
        const gameStateKey = `room:${data.room_id}:state`;
        await setCache(gameStateKey, initialGameState, 43200); // 12 小时过期

        // ========================================
        // 8. 广播给房间内所有玩家（包括自己）
        // ========================================
        io.to(data.room_id).emit('game:started', {
          room_id: data.room_id,
          chapter: 1,
          checkpoint: '密室',
          initial_state: initialGameState,
          timestamp: Date.now(),
        });

        // ========================================
        // 9. 返回成功响应
        // ========================================
        callback?.({
          success: true,
          message: '游戏已开始',
          data: {
            initial_state: initialGameState,
          },
        });

        logger.info(`✅ 房间 ${data.room_id} 游戏已开始，玩家数: ${room.currentPlayers}`);
      } catch (error) {
        logger.error(`❌ 开始游戏失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'START_GAME_ERROR',
            message: error instanceof Error ? error.message : '开始游戏失败',
          },
        });
      }
    }
  );

  // ========================================
  // 断线处理
  // ========================================
  socket.on('disconnect', async (reason) => {
    try {
      logger.info(`🔌 用户断开连接: ${socket.username} (${socket.userId}), 原因: ${reason}`);

      if (!socket.userId) {
        return;
      }

      // ========================================
      // 1. 获取用户当前所在的房间
      // ========================================
      const currentRoom = await roomService.getUserCurrentRoom(socket.userId);

      if (!currentRoom) {
        logger.info(`用户 ${socket.username} 不在任何房间中，无需处理断线`);
        return;
      }

      const roomId = currentRoom.id;

      // ========================================
      // 2. 更新 Redis 中的玩家状态为 "disconnected"
      // ========================================
      const redisKey = `room:${roomId}:players`;
      const client = await getRedisClient();
      const playerDataStr = await client.hGet(redisKey, socket.userId);

      if (playerDataStr) {
        const playerData: RoomPlayerRedisData = JSON.parse(playerDataStr);
        playerData.status = 'disconnected';
        playerData.disconnectedAt = Date.now();

        await client.hSet(redisKey, socket.userId, JSON.stringify(playerData));
      }

      // ========================================
      // 3. 通知房间内其他玩家
      // ========================================
      socket.to(roomId).emit('room:player_disconnected', {
        user_id: socket.userId,
        username: socket.username,
        disconnected_at: Date.now(),
      });

      logger.info(`用户 ${socket.username} 已标记为断线，房间: ${roomId}`);

      // ========================================
      // 4. 启动 60 秒倒计时，检查重连
      // ========================================
      // 捕获当前的 userId 和 username，避免闭包问题
      const userId = socket.userId;
      const username = socket.username;

      const timerId = setTimeout(async () => {
        try {
          logger.info(`⏰ 检查用户 ${username} 是否已重连...`);

          // 检查 Redis 中的状态
          const currentPlayerDataStr = await client.hGet(redisKey, userId);

          if (!currentPlayerDataStr) {
            logger.info(`用户 ${username} 已离开房间`);
            return;
          }

          const currentPlayerData: RoomPlayerRedisData = JSON.parse(currentPlayerDataStr);

          // 如果仍然是断线状态，自动移除
          if (currentPlayerData.status === 'disconnected') {
            logger.warn(`❌ 用户 ${username} 未在 60 秒内重连，自动移除`);

            // 从 Redis 移除
            await client.hDel(redisKey, userId);

            // 从数据库移除
            await roomService.leaveRoom({
              roomId: roomId,
              playerId: userId,
            });

            // 通知其他玩家
            io.to(roomId).emit('room:player_left', {
              user_id: userId,
              username: username,
              reason: 'timeout',
              timestamp: Date.now(),
            });

            logger.info(`✅ 用户 ${username} 已因超时被移出房间`);
          } else {
            logger.info(`✅ 用户 ${username} 已重连`);
          }
        } catch (error) {
          logger.error(`处理断线超时时发生错误:`, error);
        } finally {
          // 清除定时器引用
          disconnectionTimers.delete(`${userId}:${roomId}`);
        }
      }, 60000); // 60 秒

      // 保存定时器引用，以便重连时取消
      disconnectionTimers.set(`${userId}:${roomId}`, timerId);

      logger.info(`⏳ 已为用户 ${username} 设置 60 秒断线超时`);
    } catch (error) {
      logger.error(`❌ 处理断线事件时发生错误:`, error);
    }
  });

  // ========================================
  // 重连处理（当用户重新连接时调用）
  // ========================================
  socket.on(
    'room:reconnect',
    async (
      data: { room_id: string },
      callback?: (response: any) => void
    ) => {
      try {
        logger.info(`🔄 用户 ${socket.username} (${socket.userId}) 请求重连房间: ${data.room_id}`);

        if (!socket.userId || !socket.username) {
          throw new Error('用户未认证');
        }

        // ========================================
        // 1. 取消断线超时定时器
        // ========================================
        const timerKey = `${socket.userId}:${data.room_id}`;
        const timer = disconnectionTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          disconnectionTimers.delete(timerKey);
          logger.info(`✅ 已取消用户 ${socket.username} 的断线超时`);
        }

        // ========================================
        // 2. 更新 Redis 中的玩家状态
        // ========================================
        const redisKey = `room:${data.room_id}:players`;
        const client = await getRedisClient();
        const playerDataStr = await client.hGet(redisKey, socket.userId as string);

        if (!playerDataStr) {
          throw new Error('玩家不在此房间中');
        }

        const playerData: RoomPlayerRedisData = JSON.parse(playerDataStr);
        playerData.status = 'active';
        playerData.socketId = socket.id;
        delete playerData.disconnectedAt;

        await client.hSet(redisKey, socket.userId as string, JSON.stringify(playerData));

        // ========================================
        // 3. 重新加入 Socket.IO 房间
        // ========================================
        await socket.join(data.room_id);

        // ========================================
        // 4. 获取完整游戏状态
        // ========================================
        const room = await roomService.getRoomDetails(data.room_id);
        const gameStateKey = `room:${data.room_id}:state`;
        const gameState = await getCache(gameStateKey);

        // ========================================
        // 5. 通知其他玩家
        // ========================================
        socket.to(data.room_id).emit('room:player_reconnected', {
          user_id: socket.userId,
          username: socket.username,
          reconnected_at: Date.now(),
        });

        // ========================================
        // 6. 返回完整状态给重连的玩家
        // ========================================
        callback?.({
          success: true,
          message: '重连成功',
          data: {
            room,
            game_state: gameState,
          },
        });

        logger.info(`✅ 用户 ${socket.username} 成功重连房间: ${data.room_id}`);
      } catch (error) {
        logger.error(`❌ 用户 ${socket.username} 重连失败:`, error);
        callback?.({
          success: false,
          error: {
            code: 'RECONNECT_ERROR',
            message: error instanceof Error ? error.message : '重连失败',
          },
        });
      }
    }
  );
}

/**
 * 清理所有断线定时器
 * 在服务器关闭时调用
 */
export function clearAllDisconnectionTimers(): void {
  logger.info(`清理 ${disconnectionTimers.size} 个断线定时器`);
  disconnectionTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  disconnectionTimers.clear();
}
