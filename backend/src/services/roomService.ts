/**
 * 房间管理服务
 *
 * 负责处理游戏房间的创建、加入、离开等核心业务逻辑
 * 结合 PostgreSQL 数据库和 Redis 缓存提供高性能的房间管理
 */

import { PoolClient } from 'pg';
import { query, getClient, transaction } from '../config/database';
import { setCache, getCache, deleteCache } from '../config/redis';
import {
  GameRoom,
  RoomPlayer,
  CreateRoomRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  RoomListItem,
} from '../types/room.types';
import { RoomStatus, CharacterType } from '../types';
import { generateUniqueRoomCode } from '../utils/roomCodeGenerator';

/**
 * 房间服务类
 */
export class RoomService {
  // Redis 缓存键前缀
  private readonly CACHE_PREFIX = 'room:';
  private readonly ROOM_LIST_CACHE_KEY = 'room:list';
  private readonly CACHE_TTL = 300; // 5分钟缓存

  /**
   * 生成6位房间码
   * 使用工具函数确保唯一性
   *
   * @returns Promise<string> 6位房间码
   */
  private async generateRoomCode(): Promise<string> {
    return generateUniqueRoomCode();
  }

  /**
   * 创建房间
   *
   * 流程：
   * 1. 生成唯一的6位房间码
   * 2. 在数据库中创建房间记录
   * 3. 将创建者作为第一个玩家加入房间
   * 4. 初始化 Redis 缓存
   *
   * @param request 创建房间请求
   * @param userId 创建者用户ID
   * @returns Promise<GameRoom> 创建的房间信息
   */
  async createRoom(request: CreateRoomRequest, userId: string): Promise<GameRoom> {
    return transaction(async (client: PoolClient) => {
      // 1. 生成唯一的房间码（工具函数已确保唯一性）
      const roomCode = await this.generateRoomCode();

      // 2. 创建房间
      const roomResult = await client.query<{
        room_id: string;
        room_code: string;
        host_user_id: string;
        room_name: string;
        max_players: number;
        current_players: number;
        room_status: string;
        created_at: Date;
      }>(
        `INSERT INTO game_rooms (room_code, host_user_id, room_name, max_players, room_status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING room_id, room_code, host_user_id, room_name, max_players,
                   current_players, room_status, created_at`,
        [roomCode, userId, request.name, request.maxPlayers, RoomStatus.WAITING]
      );

      if (!roomResult.rows[0]) {
        throw new Error('创建房间失败');
      }

      const roomData = roomResult.rows[0];

      // 3. 将创建者加入房间
      await client.query(
        `INSERT INTO room_players (room_id, user_id, character_type, player_status)
         VALUES ($1, $2, $3, 'active')`,
        [roomData.room_id, userId, request.character]
      );

      // 4. 获取用户信息用于构建 RoomPlayer
      const userResult = await client.query<{
        username: string;
        display_name: string;
      }>(
        'SELECT username, display_name FROM users WHERE user_id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      const username = request.username || user?.display_name || user?.username || '玩家';

      // 5. 构建房间对象
      const room: GameRoom = {
        id: roomData.room_id,
        name: roomData.room_name,
        roomCode: roomData.room_code, // 添加6位房间码
        creatorId: roomData.host_user_id,
        maxPlayers: roomData.max_players,
        currentPlayers: 1, // 创建者已加入
        status: roomData.room_status as RoomStatus,
        players: [
          {
            id: userId,
            username: username,
            character: request.character,
            isReady: false,
            isRoomCreator: true,
            socketId: '', // 将由 Socket 连接时设置
            joinedAt: new Date(),
          },
        ],
        createdAt: roomData.created_at,
      };

      // 6. 缓存到 Redis
      await this.cacheRoom(room);

      // 7. 清除房间列表缓存
      await deleteCache(this.ROOM_LIST_CACHE_KEY);

      console.log(`✓ 房间创建成功: ${roomCode} (${roomData.room_id})`);
      return room;
    });
  }

  /**
   * 加入房间
   *
   * 验证流程：
   * 1. 验证房间是否存在
   * 2. 检查房间状态是否允许加入
   * 3. 检查房间是否已满
   * 4. 检查角色是否已被选择
   * 5. 将玩家加入房间
   * 6. 更新缓存
   *
   * @param request 加入房间请求
   * @param userId 玩家用户ID
   * @returns Promise<GameRoom> 更新后的房间信息
   */
  async joinRoom(request: JoinRoomRequest, userId: string): Promise<GameRoom> {
    return transaction(async (client: PoolClient) => {
      console.log('🔍 加入房间 - 开始事务:', {
        requestRoomId: request.roomId,
        userId,
        character: request.character,
      });

      // 1. 获取房间信息（支持 room_id 或 room_code）
      let roomResult;

      // 判断是6位房间码还是UUID（或数字ID）
      const isRoomCode = /^[A-Z0-9]{6}$/i.test(request.roomId);

      console.log(`🔍 识别为${isRoomCode ? '房间码' : '房间ID'}: ${request.roomId}`);

      if (isRoomCode) {
        // 通过房间码查询
        roomResult = await client.query<{
          room_id: string;
          room_code: string;
          host_user_id: string;
          room_name: string;
          max_players: number;
          current_players: number;
          room_status: string;
          created_at: Date;
        }>(
          `SELECT room_id, room_code, host_user_id, room_name, max_players,
                  current_players, room_status, created_at
           FROM game_rooms
           WHERE UPPER(room_code) = UPPER($1)`,
          [request.roomId]
        );
      } else {
        // 通过房间ID查询
        roomResult = await client.query<{
          room_id: string;
          room_code: string;
          host_user_id: string;
          room_name: string;
          max_players: number;
          current_players: number;
          room_status: string;
          created_at: Date;
        }>(
          `SELECT room_id, room_code, host_user_id, room_name, max_players,
                  current_players, room_status, created_at
           FROM game_rooms
           WHERE room_id = $1`,
          [request.roomId]
        );
      }

      console.log(`🔍 查询结果: 找到 ${roomResult.rows.length} 个房间`);

      if (roomResult.rows.length === 0 || !roomResult.rows[0]) {
        console.error(`❌ 房间不存在: ${request.roomId}`);
        throw new Error('房间不存在');
      }

      const room = roomResult.rows[0];
      const actualRoomId = room.room_id; // 使用实际的 room_id

      console.log('🔍 找到房间:', {
        actualRoomId,
        roomCode: room.room_code,
        roomName: room.room_name,
        status: room.room_status,
        currentPlayers: room.current_players,
        maxPlayers: room.max_players,
      });

      // 2. 验证房间状态
      if (room.room_status !== RoomStatus.WAITING) {
        throw new Error('房间已开始游戏，无法加入');
      }

      // 3. 检查用户是否已在此房间中（幂等性检查）
      const existingPlayerCheck = await client.query(
        'SELECT id, character_type FROM room_players WHERE room_id = $1 AND user_id = $2',
        [actualRoomId, userId]
      );

      if (existingPlayerCheck.rows.length > 0) {
        console.log('ℹ️  用户已在房间中，返回现有房间信息（幂等操作）');
        // 用户已在房间中，直接返回房间信息
        const updatedRoom = await this.getRoomDetails(actualRoomId, client);
        return updatedRoom;
      }

      // 4. 检查房间是否已满
      if (room.current_players >= room.max_players) {
        throw new Error('房间已满');
      }

      // 5. 检查角色是否已被选择
      const characterCheck = await client.query(
        'SELECT id FROM room_players WHERE room_id = $1 AND character_type = $2',
        [actualRoomId, request.character]
      );

      if (characterCheck.rows.length > 0) {
        throw new Error('该角色已被其他玩家选择');
      }

      // 6. 加入房间
      console.log('🔍 准备插入玩家记录:', {
        actualRoomId,
        userId,
        character: request.character,
        username: request.username,
      });

      try {
        await client.query(
          `INSERT INTO room_players (room_id, user_id, character_type, player_status)
           VALUES ($1, $2, $3, 'active')`,
          [actualRoomId, userId, request.character]
        );

        // 手动更新房间玩家计数（不依赖触发器）
        console.log('🔍 手动更新房间玩家计数...');
        await client.query(
          `UPDATE game_rooms
           SET current_players = (
             SELECT COUNT(*) FROM room_players
             WHERE room_id = $1 AND player_status != 'dead'
           )
           WHERE room_id = $1`,
          [actualRoomId]
        );
        console.log('✓ 已更新房间玩家计数');
      } catch (insertError: any) {
        console.error('❌ 插入玩家记录失败:', insertError.message);
        console.error('详细错误:', insertError);
        throw new Error(`加入房间失败: ${insertError.message}`);
      }

      // 7. 获取更新后的房间信息
      console.log('🔍 获取更新后的房间信息...');
      const updatedRoom = await this.getRoomDetails(actualRoomId, client);

      // 8. 更新缓存
      await this.cacheRoom(updatedRoom);

      // 9. 清除房间列表缓存
      await deleteCache(this.ROOM_LIST_CACHE_KEY);

      console.log(`✓ 玩家 ${userId} 加入房间 ${actualRoomId} (房间码: ${room.room_code})`);
      return updatedRoom;
    });
  }

  /**
   * 离开房间
   *
   * 处理逻辑：
   * 1. 从房间中移除玩家
   * 2. 如果是房主离开：
   *    - 如果房间还有其他玩家，转移房主给下一个玩家
   *    - 如果房间为空，关闭房间
   * 3. 更新缓存
   *
   * @param request 离开房间请求
   * @returns Promise<void>
   */
  async leaveRoom(request: LeaveRoomRequest): Promise<void> {
    return transaction(async (client: PoolClient) => {
      console.log('🔍 离开房间请求:', {
        roomId: request.roomId,
        playerId: request.playerId,
      });

      // 1. 获取房间信息
      const roomResult = await client.query<{
        host_user_id: string;
        current_players: number;
      }>(
        'SELECT host_user_id, current_players FROM game_rooms WHERE room_id = $1',
        [request.roomId]
      );

      if (roomResult.rows.length === 0 || !roomResult.rows[0]) {
        throw new Error('房间不存在');
      }

      const room = roomResult.rows[0];
      // 转换为字符串进行比较，确保类型一致
      const isHost = String(room.host_user_id) === String(request.playerId);

      console.log('🔍 房间信息:', {
        hostUserId: room.host_user_id,
        playerId: request.playerId,
        isHost,
        currentPlayers: room.current_players,
      });

      // 2. 删除玩家记录
      console.log('🔍 准备删除玩家记录...');
      const deleteResult = await client.query(
        'DELETE FROM room_players WHERE room_id = $1 AND user_id = $2',
        [request.roomId, request.playerId]
      );

      console.log(`🔍 删除结果: rowCount = ${deleteResult.rowCount}`);

      if (deleteResult.rowCount === 0) {
        throw new Error('玩家不在此房间中');
      }

      // 3. 手动更新房间玩家计数（不依赖触发器）
      console.log('🔍 手动更新房间玩家计数...');
      await client.query(
        `UPDATE game_rooms
         SET current_players = (
           SELECT COUNT(*) FROM room_players
           WHERE room_id = $1 AND player_status != 'dead'
         )
         WHERE room_id = $1`,
        [request.roomId]
      );

      // 4. 获取剩余玩家数
      const updatedRoom = await client.query<{ current_players: number }>(
        'SELECT current_players FROM game_rooms WHERE room_id = $1',
        [request.roomId]
      );

      const remainingPlayers = updatedRoom.rows[0]?.current_players || 0;
      console.log(`🔍 更新后的玩家数: ${remainingPlayers}`);

      // 5. 处理房主离开的情况
      if (isHost) {
        if (remainingPlayers === 0) {
          // 房间为空，删除房间
          await client.query('DELETE FROM game_rooms WHERE room_id = $1', [request.roomId]);
          await deleteCache(this.getCacheKey(request.roomId));
          console.log(`✓ 房间 ${request.roomId} 已关闭（无剩余玩家）`);
        } else {
          // 转移房主给下一个玩家
          const newHostResult = await client.query<{ user_id: string }>(
            `SELECT user_id FROM room_players
             WHERE room_id = $1
             ORDER BY joined_at ASC
             LIMIT 1`,
            [request.roomId]
          );

          if (newHostResult.rows.length > 0 && newHostResult.rows[0]) {
            const newHostId = newHostResult.rows[0].user_id;
            await client.query(
              'UPDATE game_rooms SET host_user_id = $1 WHERE room_id = $2',
              [newHostId, request.roomId]
            );
            console.log(`✓ 房主已转移至玩家 ${newHostId}`);
          }

          // 更新缓存
          const updatedRoomDetails = await this.getRoomDetails(request.roomId, client);
          await this.cacheRoom(updatedRoomDetails);
        }
      } else {
        // 普通玩家离开，只更新缓存
        const updatedRoomDetails = await this.getRoomDetails(request.roomId, client);
        await this.cacheRoom(updatedRoomDetails);
      }

      // 6. 清除房间列表缓存
      await deleteCache(this.ROOM_LIST_CACHE_KEY);

      console.log(`✓ 玩家 ${request.playerId} 离开房间 ${request.roomId}`);
    });
  }

  /**
   * 获取房间列表
   *
   * 支持：
   * - 状态筛选
   * - 分页
   * - Redis 缓存
   *
   * @param status 房间状态筛选（可选）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns Promise<RoomListItem[]> 房间列表
   */
  async getRoomList(
    status?: RoomStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ rooms: RoomListItem[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const cacheKey = `${this.ROOM_LIST_CACHE_KEY}:${status || 'all'}:${page}:${pageSize}`;

    // 尝试从缓存获取
    const cached = await getCache<{ rooms: RoomListItem[]; total: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    // 构建查询
    let queryText = `
      SELECT room_id, room_code, room_name, current_players, max_players,
             room_status, created_at,
             (SELECT COUNT(*) FROM game_rooms ${status ? 'WHERE room_status = $1' : ''}) as total_count
      FROM game_rooms
      ${status ? 'WHERE room_status = $1' : ''}
      ORDER BY created_at DESC
      LIMIT $${status ? '2' : '1'} OFFSET $${status ? '3' : '2'}
    `;

    const params: any[] = status ? [status, pageSize, offset] : [pageSize, offset];

    const result = await query<{
      room_id: string;
      room_code: string;
      room_name: string;
      current_players: number;
      max_players: number;
      room_status: string;
      created_at: Date;
      total_count: string;
    }>(queryText, params);

    const rooms: RoomListItem[] = (result.rows || []).map((row) => ({
      id: row.room_id,
      name: row.room_name,
      currentPlayers: row.current_players,
      maxPlayers: row.max_players,
      status: row.room_status as RoomStatus,
      hasPassword: false, // 当前版本不支持密码
      createdAt: row.created_at,
    }));

    const total = result.rows.length > 0 && result.rows[0] ? parseInt(result.rows[0].total_count) : 0;

    const response = { rooms, total };

    // 缓存结果
    await setCache(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  /**
   * 获取房间详情
   *
   * 包含所有玩家信息
   *
   * @param roomId 房间ID
   * @param client 可选的数据库客户端（用于事务）
   * @returns Promise<GameRoom> 房间详情
   */
  async getRoomDetails(roomId: string, client?: PoolClient): Promise<GameRoom> {
    // 尝试从缓存获取
    const cacheKey = this.getCacheKey(roomId);
    const cached = await getCache<GameRoom>(cacheKey);
    if (cached && !client) {
      return cached;
    }

    const dbClient = client || (await getClient());

    try {
      // 1. 获取房间基本信息
      const roomResult = await dbClient.query<{
        room_id: string;
        room_code: string;
        host_user_id: string;
        room_name: string;
        max_players: number;
        current_players: number;
        room_status: string;
        created_at: Date;
        started_at: Date | null;
      }>(
        `SELECT room_id, room_code, host_user_id, room_name, max_players,
                current_players, room_status, created_at, started_at
         FROM game_rooms
         WHERE room_id = $1`,
        [roomId]
      );

      if (roomResult.rows.length === 0 || !roomResult.rows[0]) {
        throw new Error('房间不存在');
      }

      const roomData = roomResult.rows[0];

      // 2. 获取房间玩家列表
      console.log('🔍 查询房间玩家列表, roomId:', roomId);

      const playersResult = await dbClient.query<{
        user_id: string;
        character_type: string;
        joined_at: Date;
        username: string;
        display_name: string;
      }>(
        `SELECT rp.user_id, rp.character_type, rp.joined_at,
                u.username, u.display_name
         FROM room_players rp
         JOIN users u ON rp.user_id = u.user_id
         WHERE rp.room_id = $1
         ORDER BY rp.joined_at ASC`,
        [roomId]
      );

      console.log(`🔍 找到 ${playersResult.rows.length} 个玩家`);

      const players: RoomPlayer[] = (playersResult.rows || []).map((player) => ({
        id: player.user_id,
        username: player.display_name || player.username,
        character: player.character_type as CharacterType,
        isReady: false, // 准备状态将由其他机制管理
        isRoomCreator: player.user_id === roomData.host_user_id,
        socketId: '', // 将由 Socket 连接时设置
        joinedAt: player.joined_at,
      }));

      // 3. 构建房间对象
      const room: GameRoom = {
        id: roomData.room_id,
        name: roomData.room_name,
        roomCode: roomData.room_code, // 添加6位房间码
        creatorId: roomData.host_user_id,
        maxPlayers: roomData.max_players,
        currentPlayers: roomData.current_players,
        status: roomData.room_status as RoomStatus,
        players: players,
        createdAt: roomData.created_at,
        startedAt: roomData.started_at || undefined,
      };

      // 4. 缓存房间信息（仅在非事务模式下）
      if (!client) {
        await this.cacheRoom(room);
      }

      return room;
    } finally {
      // 如果是自己创建的客户端，需要释放
      if (!client) {
        dbClient.release();
      }
    }
  }

  /**
   * 更新房间状态
   *
   * @param roomId 房间ID
   * @param status 新状态
   * @returns Promise<void>
   */
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    const result = await query(
      `UPDATE game_rooms
       SET room_status = $1,
           started_at = CASE WHEN $1 = 'playing' AND started_at IS NULL
                             THEN CURRENT_TIMESTAMP ELSE started_at END
       WHERE room_id = $2`,
      [status, roomId]
    );

    if (result.rowCount === 0) {
      throw new Error('房间不存在');
    }

    // 更新缓存
    const room = await this.getRoomDetails(roomId);
    await this.cacheRoom(room);

    // 清除房间列表缓存
    await deleteCache(this.ROOM_LIST_CACHE_KEY);

    console.log(`✓ 房间 ${roomId} 状态更新为 ${status}`);
  }

  /**
   * 获取房间的缓存键
   *
   * @param roomId 房间ID
   * @returns string 缓存键
   */
  private getCacheKey(roomId: string): string {
    return `${this.CACHE_PREFIX}${roomId}`;
  }

  /**
   * 缓存房间信息到 Redis
   *
   * @param room 房间对象
   */
  private async cacheRoom(room: GameRoom): Promise<void> {
    const cacheKey = this.getCacheKey(room.id);
    await setCache(cacheKey, room, this.CACHE_TTL);
  }

  /**
   * 检查用户是否在某个房间中
   *
   * @param userId 用户ID
   * @param roomId 房间ID
   * @returns Promise<boolean>
   */
  async isPlayerInRoom(userId: string, roomId: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM room_players WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );
    return result.rows.length > 0;
  }

  /**
   * 获取用户当前所在的房间
   *
   * @param userId 用户ID
   * @returns Promise<GameRoom | null>
   */
  async getUserCurrentRoom(userId: string): Promise<GameRoom | null> {
    const result = await query<{ room_id: string }>(
      `SELECT room_id FROM room_players
       WHERE user_id = $1
       AND room_id IN (
         SELECT room_id FROM game_rooms
         WHERE room_status IN ('waiting', 'playing')
       )
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return null;
    }

    return this.getRoomDetails(result.rows[0].room_id);
  }
}

// 导出单例实例
export const roomService = new RoomService();
