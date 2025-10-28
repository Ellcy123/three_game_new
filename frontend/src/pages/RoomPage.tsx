/**
 * 房间页面（等待游戏开始）
 *
 * 功能：
 * - 显示房间信息和房间码
 * - 显示玩家列表和槽位
 * - 角色选择（显示为问号角色）
 * - 准备/开始游戏
 * - 离开房间
 */

import React, { useEffect, useState } from 'react';
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
import type { CharacterType } from '../types/room.types';
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
  } = useRoomStore();

  // 本地状态
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  /**
   * 组件挂载时加载房间详情
   */
  useEffect(() => {
    if (roomId) {
      loadRoomDetails();
    }
  }, [roomId]);

  /**
   * 错误处理
   */
  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
      clearError();
    }
  }, [error, clearError]);

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

  /**
   * 加载房间详情
   */
  const loadRoomDetails = async () => {
    if (!roomId) return;

    try {
      await fetchRoomDetails(roomId);
    } catch (err) {
      console.error('加载房间详情失败:', err);
      showSnackbar('加载房间失败', 'error');
      // 加载失败返回大厅
      setTimeout(() => navigate('/lobby'), 2000);
    }
  };

  /**
   * 显示提示消息
   */
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  /**
   * 关闭 Snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  /**
   * 复制房间码
   */
  const handleCopyRoomCode = () => {
    if (currentRoom?.id) {
      navigator.clipboard.writeText(currentRoom.id);
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

    setSelectedCharacter(character);
    showSnackbar(`已选择 ${CharacterInfo[character].label}`, 'success');

    // TODO: 调用 API 更新角色选择
    // 这里需要添加更新角色的 API 调用
  };

  /**
   * 切换准备状态
   */
  const handleToggleReady = () => {
    if (!selectedCharacter) {
      showSnackbar('请先选择角色', 'error');
      return;
    }

    setIsReady(!isReady);
    showSnackbar(isReady ? '已取消准备' : '已准备', 'success');

    // TODO: 调用 API 更新准备状态
    // 这里需要添加更新准备状态的 API 调用
  };

  /**
   * 开始游戏（仅房主）
   */
  const handleStartGame = () => {
    if (!currentRoom) return;

    // 检查是否所有玩家都已准备
    const allReady = currentRoom.players.every((p) => p.isReady || p.isRoomCreator);

    if (!allReady) {
      showSnackbar('还有玩家未准备', 'error');
      return;
    }

    // 检查是否人数已满
    if (currentRoom.currentPlayers < currentRoom.maxPlayers) {
      showSnackbar('房间未满员，无法开始游戏', 'error');
      return;
    }

    showSnackbar('游戏即将开始...', 'success');

    // TODO: 调用 API 开始游戏
    // 然后导航到游戏页面
    // navigate('/game');
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
    if (!currentRoom) return;

    try {
      await leaveRoom(currentRoom.id);
      showSnackbar('已离开房间', 'success');
      handleCloseLeaveDialog();
      // 返回大厅
      navigate('/lobby');
    } catch (err) {
      console.error('离开房间失败:', err);
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
              <Typography variant="body2" color="text.secondary">
                房间ID: {currentRoom.id}
              </Typography>
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
                  {currentRoom.id}
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
                  disabled={currentRoom.currentPlayers < currentRoom.maxPlayers}
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
                  disabled={!selectedCharacter}
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
            {isRoomCreator && ' 如果你是房主，离开后房间将被解散。'}
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
