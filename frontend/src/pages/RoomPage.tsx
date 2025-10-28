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
  Container,
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
   * 渲染玩家槽位
   */
  const renderPlayerSlots = () => {
    if (!currentRoom) return null;

    const slots = [];

    // 已有玩家
    currentRoom.players.forEach((player) => {
      slots.push(
        <Grid size={{ xs: 12, md: 4 }} key={player.id}>
          <Card
            elevation={3}
            sx={{
              height: '100%',
              border: player.id === user?.id ? 3 : 1,
              borderColor: player.id === user?.id ? 'primary.main' : 'divider',
              bgcolor: player.isReady ? 'success.light' : 'background.paper',
              transition: 'all 0.3s',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              {/* 角色图标 */}
              <Box sx={{ mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: 40,
                    bgcolor: CharacterInfo[player.character].color,
                    mx: 'auto',
                  }}
                >
                  {CharacterInfo[player.character].emoji}
                </Avatar>
              </Box>

              {/* 玩家名 */}
              <Typography variant="h6" gutterBottom>
                {player.username}
                {player.id === user?.id && ' (你)'}
              </Typography>

              {/* 角色名称 */}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {CharacterInfo[player.character].label}
              </Typography>

              {/* 状态标签 */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
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
            </CardContent>
          </Card>
        </Grid>
      );
    });

    // 空槽位
    for (let i = 0; i < getEmptySlots(); i++) {
      slots.push(
        <Grid size={{ xs: 12, md: 4 }} key={`empty-${i}`}>
          <Card
            elevation={1}
            sx={{
              height: '100%',
              border: 1,
              borderColor: 'divider',
              borderStyle: 'dashed',
              bgcolor: 'action.hover',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'action.disabled',
                    mx: 'auto',
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
              </Box>

              <Typography variant="h6" color="text.secondary">
                等待玩家加入...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* 房间信息卡片 */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          {/* 房间名称 */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}
          >
            {currentRoom.name}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* 房间码 */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              房间码
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  letterSpacing: 8,
                  color: 'primary.main',
                }}
              >
                {currentRoom.id}
              </Typography>
              <Tooltip title="复制房间码">
                <IconButton onClick={handleCopyRoomCode} color="primary" size="large">
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 邀请提示 */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>邀请朋友：</strong>分享房间码给好友，让他们加入游戏！
            </Typography>
          </Alert>
        </Paper>

        {/* 角色选择区域 */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            选择你的神秘角色
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            选择一个角色开始游戏。你的真实身份将在游戏开始后揭晓！
          </Typography>

          <Grid container spacing={3}>
            {Object.entries(CharacterInfo).map(([charType, info]) => {
              const character = charType as CharacterType;
              const isSelected = selectedCharacter === character;
              const isTaken = currentRoom.players.some(
                (p) => p.character === character && p.id !== user?.id
              );

              return (
                <Grid size={{ xs: 12, sm: 4 }} key={character}>
                  <Card
                    elevation={isSelected ? 6 : 2}
                    sx={{
                      cursor: isTaken ? 'not-allowed' : 'pointer',
                      opacity: isTaken ? 0.5 : 1,
                      border: isSelected ? 3 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: isTaken ? 'none' : 'translateY(-4px)',
                        boxShadow: isTaken ? 2 : 6,
                      },
                    }}
                    onClick={() => !isTaken && handleSelectCharacter(character)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Avatar
                        sx={{
                          width: 100,
                          height: 100,
                          fontSize: 50,
                          bgcolor: info.color,
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        {info.emoji}
                      </Avatar>

                      <Typography variant="h6" gutterBottom>
                        {info.label}
                      </Typography>

                      {isTaken && (
                        <Chip label="已被选择" color="default" size="small" sx={{ mt: 1 }} />
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

        {/* 玩家列表 */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            玩家列表 ({currentRoom.currentPlayers}/{currentRoom.maxPlayers})
          </Typography>

          <Grid container spacing={3}>
            {renderPlayerSlots()}
          </Grid>
        </Paper>

        {/* 底部按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {/* 离开房间 */}
          <Button
            variant="outlined"
            color="error"
            size="large"
            startIcon={<ExitIcon />}
            onClick={handleOpenLeaveDialog}
          >
            离开房间
          </Button>

          {/* 房主：开始游戏 */}
          {isRoomCreator && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<StartIcon />}
              onClick={handleStartGame}
              disabled={currentRoom.currentPlayers < currentRoom.maxPlayers}
            >
              开始游戏
            </Button>
          )}

          {/* 其他玩家：准备 */}
          {!isRoomCreator && (
            <Button
              variant="contained"
              color={isReady ? 'success' : 'primary'}
              size="large"
              startIcon={<ReadyIcon />}
              onClick={handleToggleReady}
              disabled={!selectedCharacter}
            >
              {isReady ? '取消准备' : '准备'}
            </Button>
          )}
        </Box>
      </Container>

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
