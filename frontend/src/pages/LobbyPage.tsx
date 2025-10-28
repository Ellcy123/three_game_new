/**
 * 大厅页面
 *
 * 功能：
 * - 显示房间列表
 * - 创建新房间
 * - 加入现有房间
 * - 用户信息和登出
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  Divider,
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Group as GroupIcon,
  VideogameAsset as GameIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import type {
  RoomStatus,
  CharacterType,
  CreateRoomRequest,
  RoomListItem,
} from '../types/room.types';
import { CharacterType as CharacterTypeConst } from '../types/room.types';

/**
 * 房间状态映射
 */
const RoomStatusMap: Record<RoomStatus, { label: string; color: 'success' | 'primary' | 'warning' | 'default' }> = {
  waiting: { label: '等待中', color: 'success' },
  playing: { label: '游戏中', color: 'primary' },
  paused: { label: '已暂停', color: 'warning' },
  finished: { label: '已结束', color: 'default' },
};

/**
 * 角色选项
 */
const CharacterOptions: Array<{ value: CharacterType; label: string; emoji: string }> = [
  { value: CharacterTypeConst.CAT, label: '猫咪', emoji: '🐱' },
  { value: CharacterTypeConst.DOG, label: '小狗', emoji: '🐶' },
  { value: CharacterTypeConst.TURTLE, label: '乌龟', emoji: '🐢' },
];

/**
 * 大厅页面组件
 */
const LobbyPage: React.FC = () => {
  const navigate = useNavigate();

  // Store 状态
  const { user, logout } = useAuthStore();
  const {
    rooms,
    isLoading,
    error,
    pagination,
    fetchRooms,
    createRoom,
    joinRoom,
    clearError,
  } = useRoomStore();

  // 本地状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 创建房间表单
  const [createForm, setCreateForm] = useState({
    name: '',
    maxPlayers: 3,
    password: '',
    character: CharacterTypeConst.CAT as CharacterType,
  });

  // 加入房间表单
  const [joinForm, setJoinForm] = useState({
    character: CharacterTypeConst.CAT as CharacterType,
    password: '',
  });

  // 表单验证错误
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * 组件挂载时加载房间列表
   */
  useEffect(() => {
    loadRooms();
  }, []);

  /**
   * 错误处理
   */
  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarOpen(true);
      clearError();
    }
  }, [error, clearError]);

  /**
   * 加载房间列表
   */
  const loadRooms = async () => {
    try {
      await fetchRooms('waiting', 1, 20);
    } catch (err) {
      console.error('加载房间列表失败:', err);
    }
  };

  /**
   * 处理登出
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  /**
   * 打开创建房间对话框
   */
  const handleOpenCreateDialog = () => {
    setCreateForm({
      name: '',
      maxPlayers: 3,
      password: '',
      character: CharacterTypeConst.CAT,
    });
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  /**
   * 关闭创建房间对话框
   */
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormErrors({});
  };

  /**
   * 验证创建房间表单
   */
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.name.trim()) {
      errors.name = '请输入房间名称';
    } else if (createForm.name.length > 50) {
      errors.name = '房间名称不能超过50个字符';
    }

    if (createForm.maxPlayers < 2 || createForm.maxPlayers > 4) {
      errors.maxPlayers = '玩家数量必须在2-4之间';
    }

    if (createForm.password && createForm.password.length < 4) {
      errors.password = '密码长度至少4个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 处理创建房间
   */
  const handleCreateRoom = async () => {
    if (!validateCreateForm()) {
      return;
    }

    if (!user) {
      setSnackbarMessage('请先登录');
      setSnackbarOpen(true);
      return;
    }

    try {
      const requestData: CreateRoomRequest = {
        name: createForm.name,
        maxPlayers: createForm.maxPlayers,
        password: createForm.password || undefined,
        character: createForm.character,
        username: user.username,
      };

      const room = await createRoom(requestData);

      setSnackbarMessage('房间创建成功！');
      setSnackbarOpen(true);
      handleCloseCreateDialog();

      // 导航到房间页面
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      console.error('创建房间失败:', err);
      // 错误已经通过 useEffect 处理
    }
  };

  /**
   * 打开加入房间对话框
   */
  const handleOpenJoinDialog = (room: RoomListItem) => {
    setSelectedRoom(room);
    setJoinForm({
      character: CharacterTypeConst.CAT,
      password: '',
    });
    setFormErrors({});
    setJoinDialogOpen(true);
  };

  /**
   * 关闭加入房间对话框
   */
  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
    setSelectedRoom(null);
    setFormErrors({});
  };

  /**
   * 验证加入房间表单
   */
  const validateJoinForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (selectedRoom?.hasPassword && !joinForm.password) {
      errors.password = '请输入房间密码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 处理加入房间
   */
  const handleJoinRoom = async () => {
    if (!validateJoinForm() || !selectedRoom) {
      return;
    }

    if (!user) {
      setSnackbarMessage('请先登录');
      setSnackbarOpen(true);
      return;
    }

    try {
      const room = await joinRoom({
        roomId: selectedRoom.id,
        character: joinForm.character,
        username: user.username,
        password: joinForm.password || undefined,
      });

      setSnackbarMessage('加入房间成功！');
      setSnackbarOpen(true);
      handleCloseJoinDialog();

      // 导航到房间页面
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      console.error('加入房间失败:', err);
      // 错误已经通过 useEffect 处理
    }
  };

  /**
   * 关闭 Snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <GameIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            三人跑酷游戏
          </Typography>

          {user && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'secondary.main' }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
                <Typography variant="body1">
                  {user.username}
                </Typography>
              </Box>

              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                登出
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* 主要内容区 */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* 操作栏 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            游戏大厅
          </Typography>

          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadRooms}
              disabled={isLoading}
              sx={{ mr: 2 }}
            >
              刷新
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              disabled={isLoading}
            >
              创建房间
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* 加载状态 */}
        {isLoading && rooms.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 空状态 */}
        {!isLoading && rooms.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无可用房间
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              创建一个新房间开始游戏吧！
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              创建房间
            </Button>
          </Box>
        )}

        {/* 房间列表 */}
        {rooms.length > 0 && (
          <Grid container spacing={3}>
            {rooms.map((room) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={room.id}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* 房间名称 */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          flexGrow: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {room.name}
                      </Typography>
                      {room.hasPassword && (
                        <LockIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                      )}
                    </Box>

                    {/* 房间信息 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <GroupIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {room.currentPlayers}/{room.maxPlayers} 玩家
                      </Typography>
                    </Box>

                    {/* 房间状态 */}
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={RoomStatusMap[room.status].label}
                        color={RoomStatusMap[room.status].color}
                        size="small"
                      />
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleOpenJoinDialog(room)}
                      disabled={
                        room.status !== 'waiting' ||
                        room.currentPlayers >= room.maxPlayers
                      }
                    >
                      {room.currentPlayers >= room.maxPlayers ? '房间已满' : '加入房间'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 分页信息 */}
        {pagination && pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 个房间
            </Typography>
          </Box>
        )}
      </Container>

      {/* 创建房间对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建新房间</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 房间名称 */}
            <TextField
              fullWidth
              label="房间名称"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={{ mb: 3 }}
              autoFocus
            />

            {/* 最大玩家数 */}
            <FormControl fullWidth sx={{ mb: 3 }} error={!!formErrors.maxPlayers}>
              <InputLabel>最大玩家数</InputLabel>
              <Select
                value={createForm.maxPlayers}
                label="最大玩家数"
                onChange={(e) =>
                  setCreateForm({ ...createForm, maxPlayers: Number(e.target.value) })
                }
              >
                <MenuItem value={2}>2 人</MenuItem>
                <MenuItem value={3}>3 人</MenuItem>
                <MenuItem value={4}>4 人</MenuItem>
              </Select>
              {formErrors.maxPlayers && (
                <FormHelperText>{formErrors.maxPlayers}</FormHelperText>
              )}
            </FormControl>

            {/* 选择角色 */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>选择角色</InputLabel>
              <Select
                value={createForm.character}
                label="选择角色"
                onChange={(e) =>
                  setCreateForm({ ...createForm, character: e.target.value as CharacterType })
                }
              >
                {CharacterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 8 }}>{option.emoji}</span>
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 房间密码（可选） */}
            <TextField
              fullWidth
              label="房间密码（可选）"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              error={!!formErrors.password}
              helperText={formErrors.password || '留空表示不设置密码'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>取消</Button>
          <Button
            onClick={handleCreateRoom}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 加入房间对话框 */}
      <Dialog
        open={joinDialogOpen}
        onClose={handleCloseJoinDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>加入房间</DialogTitle>
        <DialogContent>
          {selectedRoom && (
            <Box sx={{ pt: 2 }}>
              {/* 房间信息 */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>房间名称：</strong>{selectedRoom.name}
                </Typography>
                <Typography variant="body2">
                  <strong>当前人数：</strong>{selectedRoom.currentPlayers}/{selectedRoom.maxPlayers}
                </Typography>
              </Alert>

              {/* 选择角色 */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>选择角色</InputLabel>
                <Select
                  value={joinForm.character}
                  label="选择角色"
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, character: e.target.value as CharacterType })
                  }
                >
                  {CharacterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 8 }}>{option.emoji}</span>
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 房间密码 */}
              {selectedRoom.hasPassword && (
                <TextField
                  fullWidth
                  label="房间密码"
                  type="password"
                  value={joinForm.password}
                  onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinDialog}>取消</Button>
          <Button
            onClick={handleJoinRoom}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : '加入'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? 'error' : 'success'}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LobbyPage;
