/**
 * 房间页面（等待游戏开始）- 集成 WebSocket 实时功能
 *
 * 功能：
 * - 显示房间信息和房间码
 * - 显示玩家列表和槽位
 * - 角色选择（显示为问号角色）
 * - 准备/开始游戏
 * - 离开房间
 * - 实时更新玩家列表
 * - WebSocket 事件监听
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExitToApp as ExitIcon,
  PlayArrow as StartIcon,
  Check as ReadyIcon,
  Person as PersonIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import useSocket from '../hooks/useSocket';
import type { CharacterType, GameRoom, RoomPlayer } from '../types/room.types';
import { CharacterType as CharacterTypeConst } from '../types/room.types';

/**
 * 角色信息（显示为问号，因为玩家不知道真实身份）
 */
const CharacterInfo: Record<CharacterType, { label: string; emoji: string; color: string }> = {
  [CharacterTypeConst.CAT]: { label: '神秘角色 A', emoji: '❓', color: '#ff6b6b' },
  [CharacterTypeConst.DOG]: { label: '神秘角色 B', emoji: '❓', color: '#4ecdc4' },
  [CharacterTypeConst.TURTLE]: { label: '神秘角色 C', emoji: '❓', color: '#95e1d3' },
};

/**
 * 房间页面组件
 */
const RoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  // Store 状态
  const { user } = useAuthStore();
  const {
    currentRoom,
    isLoading,
    error,
    fetchRoomDetails,
    leaveRoom,
    clearError,
    setCurrentRoom,
  } = useRoomStore();

  // WebSocket
  const { emit, on, off, isConnected } = useSocket({
    autoConnect: true,
    onConnect: () => {
      console.log('[RoomPage] WebSocket 已连接');
      showSnackbar('已连接到服务器', 'success');
    },
    onDisconnect: (reason) => {
      console.log('[RoomPage] WebSocket 已断开:', reason);
      showSnackbar('与服务器断开连接', 'warning');
    },
  });

  // 本地状态
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  /**
   * 显示提示消息
   */
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  /**
   * 关闭 Snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // ========================================
  // WebSocket 事件处理器
  // ========================================

  /**
   * 处理玩家加入事件
   */
  const handlePlayerJoined = useCallback((data: any) => {
    console.log('[RoomPage] 玩家加入:', data);

    if (currentRoom) {
      // 检查玩家是否已在列表中
      const playerExists = currentRoom.players.some(p => p.id === data.user_id);

      if (!playerExists) {
        const newPlayer: RoomPlayer = {
          id: data.user_id,
          username: data.username,
          character: data.character_type,
          isReady: false,
          isRoomCreator: false,
          socketId: '',
          joinedAt: new Date(),
        };

        const updatedRoom: GameRoom = {
          ...currentRoom,
          players: [...currentRoom.players, newPlayer],
          currentPlayers: currentRoom.currentPlayers + 1,
        };

        setCurrentRoom(updatedRoom);
        showSnackbar(`${data.username} 加入了房间`, 'info');
      }
    }
  }, [currentRoom, setCurrentRoom, showSnackbar]);

  /**
   * 处理玩家离开事件
   */
  const handlePlayerLeft = useCallback((data: any) => {
    console.log('[RoomPage] 玩家离开:', data);

    if (currentRoom) {
      const updatedRoom: GameRoom = {
        ...currentRoom,
        players: currentRoom.players.filter(p => p.id !== data.user_id),
        currentPlayers: Math.max(0, currentRoom.currentPlayers - 1),
      };

      setCurrentRoom(updatedRoom);
      showSnackbar(`${data.username} 离开了房间`, 'info');
    }
  }, [currentRoom, setCurrentRoom, showSnackbar]);

  /**
   * 处理玩家断线事件
   */
  const handlePlayerDisconnected = useCallback((data: any) => {
    console.log('[RoomPage] 玩家断线:', data);
    showSnackbar(`${data.username} 断线了`, 'warning');
  }, [showSnackbar]);

  /**
   * 处理玩家重连事件
   */
  const handlePlayerReconnected = useCallback((data: any) => {
    console.log('[RoomPage] 玩家重连:', data);
    showSnackbar(`${data.username} 重新连接了`, 'success');
  }, [showSnackbar]);

  /**
   * 处理玩家准备状态变化事件
   */
  const handlePlayerReadyChanged = useCallback((data: any) => {
    console.log('[RoomPage] 玩家准备状态变化:', data);

    if (currentRoom) {
      const updatedPlayers = currentRoom.players.map(player => {
        if (player.id === data.user_id) {
          return { ...player, isReady: data.is_ready };
        }
        return player;
      });

      setCurrentRoom({
        ...currentRoom,
        players: updatedPlayers,
      });

      // 如果是其他玩家，显示提示
      if (data.user_id !== user?.id) {
        showSnackbar(
          `${data.username} ${data.is_ready ? '已准备' : '取消准备'}`,
          data.is_ready ? 'success' : 'info'
        );
      }
    }
  }, [currentRoom, setCurrentRoom, user, showSnackbar]);

  /**
   * 处理角色选择事件
   */
  const handleCharacterSelected = useCallback((data: any) => {
    console.log('[RoomPage] 玩家选择角色:', data);

    if (data.room) {
      // 更新整个房间状态（包含所有玩家信息）
      setCurrentRoom(data.room);

      // 如果是其他玩家，显示提示
      if (data.user_id !== user?.id) {
        const characterLabel = CharacterInfo[data.character_type as CharacterType]?.label || '角色';
        showSnackbar(`${data.username} 选择了 ${characterLabel}`, 'info');
      }
    }
  }, [setCurrentRoom, user, showSnackbar]);

  /**
   * 处理游戏开始事件
   */
  const handleGameStarted = useCallback((data: any) => {
    console.log('[RoomPage] 游戏开始:', data);
    showSnackbar('游戏即将开始...', 'success');

    // 延迟跳转到游戏页面
    setTimeout(() => {
      navigate('/game', { state: { roomId: data.room_id, initialState: data.initial_state } });
    }, 1500);
  }, [navigate, showSnackbar]);

  // ========================================
  // WebSocket 事件监听设置
  // ========================================
  useEffect(() => {
    if (!isConnected) return;

    console.log('[RoomPage] 设置 WebSocket 事件监听器');

    // 注册事件监听器
    on('room:player_joined', handlePlayerJoined);
    on('room:player_left', handlePlayerLeft);
    on('room:player_disconnected', handlePlayerDisconnected);
    on('room:player_reconnected', handlePlayerReconnected);
    on('room:player_ready_changed', handlePlayerReadyChanged);
    on('room:character_selected', handleCharacterSelected);
    on('game:started', handleGameStarted);

    // 清理监听器
    return () => {
      console.log('[RoomPage] 清理 WebSocket 事件监听器');
      off('room:player_joined', handlePlayerJoined);
      off('room:player_left', handlePlayerLeft);
      off('room:player_disconnected', handlePlayerDisconnected);
      off('room:player_reconnected', handlePlayerReconnected);
      off('room:player_ready_changed', handlePlayerReadyChanged);
      off('room:character_selected', handleCharacterSelected);
      off('game:started', handleGameStarted);
    };
  }, [
    isConnected,
    on,
    off,
    handlePlayerJoined,
    handlePlayerLeft,
    handlePlayerDisconnected,
    handlePlayerReconnected,
    handlePlayerReadyChanged,
    handleCharacterSelected,
    handleGameStarted,
  ]);

  // ========================================
  // 组件挂载时加载房间详情并加入房间
  // ========================================
  useEffect(() => {
    if (!roomId || !user) return;

    const initRoom = async () => {
      try {
        // 1. 加载房间详情
        await fetchRoomDetails(roomId);

        // 2. 发送 room:join 事件（通过 WebSocket）
        // 注：角色选择现在是可选的，玩家可以在房间内选择角色
        if (isConnected && !hasJoinedRoom) {
          console.log('[RoomPage] 发送 room:join 事件');

          emit(
            'room:join',
            {
              room_id: roomId,
              character_name: user.username,
              // character_type 不再必需，玩家进入房间后再选择
            },
            (response: any) => {
              if (response.success) {
                console.log('[RoomPage] 成功加入房间:', response.data);
                setHasJoinedRoom(true);

                // 更新本地房间状态
                if (response.data.room) {
                  setCurrentRoom(response.data.room);
                }
              } else {
                console.error('[RoomPage] 加入房间失败:', response.error);
                showSnackbar(response.error.message, 'error');
              }
            }
          );
        }
      } catch (err) {
        console.error('[RoomPage] 初始化房间失败:', err);
        showSnackbar('加载房间失败', 'error');
        setTimeout(() => navigate('/lobby'), 2000);
      }
    };

    initRoom();
  }, [roomId, user, isConnected, hasJoinedRoom, emit, fetchRoomDetails, setCurrentRoom, showSnackbar, navigate]);

  // ========================================
  // 组件卸载时离开房间
  // ========================================
  useEffect(() => {
    return () => {
      // 组件卸载时发送 room:leave 事件
      if (roomId && isConnected && hasJoinedRoom) {
        console.log('[RoomPage] 组件卸载，发送 room:leave 事件');

        emit('room:leave', { room_id: roomId }, (response: any) => {
          if (response.success) {
            console.log('[RoomPage] 成功离开房间');
          } else {
            console.error('[RoomPage] 离开房间失败:', response.error);
          }
        });
      }
    };
  }, [roomId, isConnected, hasJoinedRoom, emit]);

  /**
   * 错误处理
   */
  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
      clearError();
    }
  }, [error, clearError, showSnackbar]);

  /**
   * 设置当前玩家选择的角色
   */
  useEffect(() => {
    if (currentRoom && user) {
      const currentPlayer = currentRoom.players.find((p) => p.id === user.id);
      if (currentPlayer) {
        setSelectedCharacter(currentPlayer.character);
        setIsReady(currentPlayer.isReady);
      }
    }
  }, [currentRoom, user]);

  // ========================================
  // 用户操作处理函数
  // ========================================

  /**
   * 复制房间码
   */
  const handleCopyRoomCode = () => {
    const codeToCopy = currentRoom?.roomCode || roomId || '';
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      showSnackbar('房间码已复制到剪贴板！', 'success');
    }
  };

  /**
   * 选择角色
   */
  const handleSelectCharacter = (character: CharacterType) => {
    // 检查角色是否已被其他玩家选择
    const isCharacterTaken = currentRoom?.players.some(
      (p) => p.character === character && p.id !== user?.id
    );

    if (isCharacterTaken) {
      showSnackbar('该角色已被选择', 'error');
      return;
    }

    if (!roomId || !isConnected) {
      showSnackbar('未连接到服务器', 'error');
      return;
    }

    // 通过 WebSocket 更新角色
    emit(
      'room:select_character',
      {
        room_id: roomId,
        character_type: character,
      },
      (response: any) => {
        if (response.success) {
          setSelectedCharacter(character);
          showSnackbar(`已选择 ${CharacterInfo[character].label}`, 'success');

          // 更新本地房间状态
          if (response.data.room) {
            setCurrentRoom(response.data.room);
          }
        } else {
          showSnackbar(response.error?.message || '选择角色失败', 'error');
        }
      }
    );
  };

  /**
   * 切换准备状态
   */
  const handleToggleReady = useCallback(() => {
    if (!selectedCharacter) {
      showSnackbar('请先选择角色', 'error');
      return;
    }

    if (!roomId || !isConnected) {
      showSnackbar('未连接到服务器', 'error');
      return;
    }

    const newReadyState = !isReady;

    emit('room:toggle_ready', { room_id: roomId, is_ready: newReadyState }, (response: any) => {
      if (response.success) {
        setIsReady(newReadyState);
        showSnackbar(response.message || (newReadyState ? '已准备' : '已取消准备'), 'success');
      } else {
        showSnackbar(response.error?.message || '准备状态更新失败', 'error');
      }
    });
  }, [selectedCharacter, roomId, isConnected, isReady, emit, showSnackbar]);

  /**
   * 开始游戏（仅房主）
   */
  const handleStartGame = () => {
    if (!currentRoom || !roomId) return;

    // 检查是否人数已满
    if (currentRoom.currentPlayers < currentRoom.maxPlayers) {
      showSnackbar('房间未满员，无法开始游戏', 'error');
      return;
    }

    console.log('[RoomPage] 发送 room:start_game 事件');

    // 通过 WebSocket 发送开始游戏事件
    emit('room:start_game', { room_id: roomId }, (response: any) => {
      if (response.success) {
        console.log('[RoomPage] 游戏开始成功');
        showSnackbar('游戏即将开始...', 'success');
      } else {
        console.error('[RoomPage] 开始游戏失败:', response.error);
        showSnackbar(response.error.message, 'error');
      }
    });
  };

  /**
   * 打开离开房间确认对话框
   */
  const handleOpenLeaveDialog = () => {
    setLeaveDialogOpen(true);
  };

  /**
   * 关闭离开房间对话框
   */
  const handleCloseLeaveDialog = () => {
    setLeaveDialogOpen(false);
  };

  /**
   * 离开房间
   */
  const handleLeaveRoom = async () => {
    if (!currentRoom || !roomId) return;

    try {
      // 通过 WebSocket 发送离开房间事件
      emit('room:leave', { room_id: roomId }, async (response: any) => {
        if (response.success) {
          console.log('[RoomPage] 成功离开房间');

          // 同时调用 API 清理本地状态
          await leaveRoom(currentRoom.id);

          showSnackbar('已离开房间', 'success');
          handleCloseLeaveDialog();

          // 返回大厅
          navigate('/lobby');
        } else {
          console.error('[RoomPage] 离开房间失败:', response.error);
          showSnackbar(response.error.message, 'error');
        }
      });
    } catch (err) {
      console.error('[RoomPage] 离开房间失败:', err);
      showSnackbar('离开房间失败', 'error');
    }
  };

  /**
   * 检查是否是房主
   */
  const isRoomCreator = user && currentRoom && currentRoom.creatorId === user.id;

  /**
   * 获取空槽位数量
   */
  const getEmptySlots = (): number => {
    if (!currentRoom) return 0;
    return currentRoom.maxPlayers - currentRoom.currentPlayers;
  };

  /**
   * 渲染玩家槽位（横向卡片布局）
   */
  const renderPlayerSlots = () => {
    if (!currentRoom) return null;

    const slots = [];

    // 已有玩家 - 横向卡片
    currentRoom.players.forEach((player) => {
      slots.push(
        <Card
          key={player.id}
          elevation={3}
          sx={{
            border: player.id === user?.id ? 3 : 1,
            borderColor: player.id === user?.id ? 'primary.main' : 'divider',
            bgcolor: player.isReady ? 'rgba(76, 175, 80, 0.08)' : 'background.paper',
            transition: 'all 0.3s',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              {/* 角色头像 */}
              <Avatar
                sx={{
                  width: 70,
                  height: 70,
                  fontSize: 35,
                  bgcolor: CharacterInfo[player.character].color,
                }}
              >
                {CharacterInfo[player.character].emoji}
              </Avatar>

              {/* 玩家信息 */}
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {player.username}
                  </Typography>
                  {player.id === user?.id && (
                    <Chip label="你" color="primary" size="small" />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {CharacterInfo[player.character].label}
                </Typography>

                {/* 状态标签 */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  {player.isRoomCreator && (
                    <Chip
                      icon={<StarIcon />}
                      label="房主"
                      color="warning"
                      size="small"
                    />
                  )}
                  {player.isReady && (
                    <Chip
                      icon={<ReadyIcon />}
                      label="已准备"
                      color="success"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      );
    });

    // 空槽位 - 横向卡片
    for (let i = 0; i < getEmptySlots(); i++) {
      slots.push(
        <Card
          key={`empty-${i}`}
          elevation={1}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
            bgcolor: 'action.hover',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: 'action.disabled',
                }}
              >
                <PersonIcon sx={{ fontSize: 35 }} />
              </Avatar>

              <Box>
                <Typography variant="h6" color="text.secondary">
                  等待玩家加入...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  空位
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return slots;
  };

  // 加载中
  if (isLoading || !currentRoom) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* 顶部房间信息栏 */}
      <Paper elevation={2} sx={{ borderRadius: 0 }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* 左侧：房间名称 */}
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {currentRoom.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  房间ID: {currentRoom.id}
                </Typography>
                {/* WebSocket 连接状态指示 */}
                <Chip
                  label={isConnected ? '已连接' : '未连接'}
                  color={isConnected ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>

            {/* 中间：房间码展示 */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                房间码（分享给好友）
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    letterSpacing: 6,
                    color: 'primary.main',
                  }}
                >
                  {currentRoom.roomCode || roomId?.substring(0, 6).toUpperCase()}
                </Typography>
                <Tooltip title="复制房间码">
                  <IconButton onClick={handleCopyRoomCode} color="primary" size="large">
                    <CopyIcon fontSize="large" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* 右侧：房间状态 */}
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label={`${currentRoom.currentPlayers}/${currentRoom.maxPlayers} 玩家`}
                color="primary"
                sx={{ mb: 1, fontSize: '1rem', px: 2, py: 2.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                {currentRoom.currentPlayers === currentRoom.maxPlayers ? '房间已满' : '等待玩家加入'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 主内容区 - 左右分栏 */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* 左侧区域 - 玩家列表 */}
        <Box sx={{ width: '45%', p: 4, overflow: 'auto' }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              玩家列表 ({currentRoom.currentPlayers}/{currentRoom.maxPlayers})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {renderPlayerSlots()}
            </Box>
          </Paper>
        </Box>

        {/* 右侧区域 - 角色选择 + 操作按钮 */}
        <Box sx={{ width: '55%', p: 4, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
          {/* 角色选择区域 */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              选择你的神秘角色
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              选择一个角色开始游戏。你的真实身份将在游戏开始后揭晓！
            </Alert>

            <Grid container spacing={2.5} columns={12}>
              {Object.entries(CharacterInfo).map(([charType, info]) => {
                const character = charType as CharacterType;
                const isSelected = selectedCharacter === character;
                const isTaken = currentRoom.players.some(
                  (p) => p.character === character && p.id !== user?.id
                );

                return (
                  <Grid size={4} key={character}>
                    <Card
                      elevation={isSelected ? 6 : 2}
                      sx={{
                        cursor: isTaken ? 'not-allowed' : 'pointer',
                        opacity: isTaken ? 0.5 : 1,
                        border: isSelected ? 3 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: isTaken ? 'none' : 'scale(1.05)',
                          boxShadow: isTaken ? 2 : 8,
                        },
                      }}
                      onClick={() => !isTaken && handleSelectCharacter(character)}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar
                          sx={{
                            width: 80,
                            height: 80,
                            fontSize: 40,
                            bgcolor: info.color,
                            mx: 'auto',
                            mb: 1.5,
                          }}
                        >
                          {info.emoji}
                        </Avatar>

                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {info.label}
                        </Typography>

                        {isTaken && (
                          <Chip label="已被选" color="default" size="small" sx={{ mt: 1 }} />
                        )}

                        {isSelected && (
                          <Chip
                            icon={<ReadyIcon />}
                            label="已选择"
                            color="primary"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* 操作按钮区域 */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              游戏操作
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 房主：开始游戏 */}
              {isRoomCreator && (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  startIcon={<StartIcon />}
                  onClick={handleStartGame}
                  disabled={!isConnected || currentRoom.currentPlayers < currentRoom.maxPlayers}
                  sx={{ py: 1.5, fontSize: '1.1rem' }}
                >
                  开始游戏 {currentRoom.currentPlayers < currentRoom.maxPlayers && `(需要 ${currentRoom.maxPlayers} 人)`}
                </Button>
              )}

              {/* 其他玩家：准备 */}
              {!isRoomCreator && (
                <Button
                  variant="contained"
                  color={isReady ? 'success' : 'primary'}
                  size="large"
                  fullWidth
                  startIcon={<ReadyIcon />}
                  onClick={handleToggleReady}
                  disabled={!selectedCharacter || !isConnected}
                  sx={{ py: 1.5, fontSize: '1.1rem' }}
                >
                  {isReady ? '取消准备' : '准备就绪'}
                </Button>
              )}

              {/* 离开房间 */}
              <Button
                variant="outlined"
                color="error"
                size="large"
                fullWidth
                startIcon={<ExitIcon />}
                onClick={handleOpenLeaveDialog}
                sx={{ py: 1.5, fontSize: '1.1rem' }}
              >
                离开房间
              </Button>

              <Divider sx={{ my: 1 }} />

              {/* 提示信息 */}
              <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                {isRoomCreator
                  ? '你是房主，只有人数满员时才能开始游戏。'
                  : '请选择角色并点击准备，等待房主开始游戏。'}
              </Alert>

              {/* WebSocket 连接状态提示 */}
              {!isConnected && (
                <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
                  与服务器断开连接，部分功能可能不可用
                </Alert>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* 离开房间确认对话框 */}
      <Dialog open={leaveDialogOpen} onClose={handleCloseLeaveDialog}>
        <DialogTitle>确认离开房间？</DialogTitle>
        <DialogContent>
          <Typography>
            你确定要离开房间吗？
            {isRoomCreator && ' 如果你是房主，其他玩家可能会接替房主位置。'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLeaveDialog}>取消</Button>
          <Button onClick={handleLeaveRoom} color="error" variant="contained">
            确认离开
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RoomPage;
