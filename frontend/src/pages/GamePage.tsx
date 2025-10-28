/**
 * 游戏主界面
 *
 * 功能：
 * - 顶部：玩家面板（3个玩家的头像、名字、生命值）
 * - 中间：剧情显示区（滚动显示游戏描述和操作结果）
 * - 底部：操作区（道具组合输入）
 * - 右侧：聊天框
 * - WebSocket 实时通信
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  Badge,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Favorite as HeartIcon,
  FavoriteBorder as HeartOutlineIcon,
  Inventory as InventoryIcon,
  ContentCopy as CopyIcon,
  Info as InfoIcon,
  ExitToApp as ExitIcon,
  Chat as ChatIcon,
  Psychology as BrainIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  useGameStore,
  useGameState,
  useCurrentStory,
  useActionHistory,
  useGamePlayers,
  useInventory,
  useCollectedLetters,
  useGameLoading,
  useGameError,
} from '../store/gameStore';
import useSocket from '../hooks/useSocket';
import type { CharacterType, ActionType } from '../types/game.types';
import { CharacterType as CharacterTypeEnum } from '../types/game.types';

/**
 * 角色信息配置（游戏中显示真实身份）
 */
const CharacterInfo: Record<CharacterType, { label: string; emoji: string; color: string; description: string }> = {
  [CharacterTypeEnum.CAT]: {
    label: '猫咪',
    emoji: '🐱',
    color: '#ff6b6b',
    description: '初始被困在行李箱中',
  },
  [CharacterTypeEnum.DOG]: {
    label: '小狗',
    emoji: '🐶',
    color: '#4ecdc4',
    description: '初始被困在囚笼中',
  },
  [CharacterTypeEnum.TURTLE]: {
    label: '乌龟',
    emoji: '🐢',
    color: '#95e1d3',
    description: '唯一自由的角色，可以行动',
  },
};

/**
 * 游戏主界面组件
 */
const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // 从路由获取房间ID和初始状态
  const roomId = location.state?.roomId;
  const initialState = location.state?.initialState;

  // Game Store
  const {
    performAction,
    requestGameState,
    startStateSync,
    stopStateSync,
    registerSocketListeners,
    unregisterSocketListeners,
    setCurrentStory,
    clearError,
  } = useGameStore();

  // Game State Selectors
  const gameState = useGameState();
  const currentStory = useCurrentStory();
  const actionHistory = useActionHistory();
  const players = useGamePlayers();
  const inventory = useInventory();
  const collectedLetters = useCollectedLetters();
  const isLoading = useGameLoading();
  const gameError = useGameError();

  // WebSocket
  const { isConnected } = useSocket({ autoConnect: true });

  // 本地状态
  const [item1, setItem1] = useState('');
  const [item2, setItem2] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [inputMode, setInputMode] = useState<'select' | 'text'>('select'); // 选择模式或文本模式
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; message: string; timestamp: number }>>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Refs
  const storyDisplayRef = useRef<HTMLDivElement>(null);
  const chatDisplayRef = useRef<HTMLDivElement>(null);

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
  // 初始化游戏
  // ========================================
  useEffect(() => {
    if (!roomId || !user) {
      showSnackbar('房间信息不存在，返回大厅', 'error');
      setTimeout(() => navigate('/lobby'), 2000);
      return;
    }

    // 注册 WebSocket 事件监听器
    registerSocketListeners();

    // 如果有初始状态，设置初始剧情
    if (initialState) {
      setCurrentStory('游戏开始！欢迎来到《三兄弟的冒险2 - 密室逃脱》\n\n你们三个好朋友醒来后发现自己被困在一个神秘的密室中...');
    }

    // 请求游戏状态
    requestGameState(roomId).catch((err) => {
      console.error('[GamePage] 获取游戏状态失败:', err);
      showSnackbar('获取游戏状态失败', 'error');
    });

    // 启动状态同步
    startStateSync(roomId).catch((err) => {
      console.error('[GamePage] 启动状态同步失败:', err);
    });

    // 清理函数
    return () => {
      unregisterSocketListeners();
      stopStateSync(roomId).catch((err) => {
        console.error('[GamePage] 停止状态同步失败:', err);
      });
    };
  }, [roomId, user, initialState, registerSocketListeners, unregisterSocketListeners, requestGameState, startStateSync, stopStateSync, setCurrentStory, navigate, showSnackbar]);

  // ========================================
  // 错误处理
  // ========================================
  useEffect(() => {
    if (gameError) {
      showSnackbar(gameError, 'error');
      clearError();
    }
  }, [gameError, clearError, showSnackbar]);

  // ========================================
  // 自动滚动到底部
  // ========================================
  useEffect(() => {
    if (storyDisplayRef.current) {
      storyDisplayRef.current.scrollTop = storyDisplayRef.current.scrollHeight;
    }
  }, [currentStory, actionHistory]);

  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ========================================
  // 游戏操作处理
  // ========================================

  /**
   * 执行道具组合
   */
  const handlePerformAction = async () => {
    if (!roomId) {
      showSnackbar('房间信息不存在', 'error');
      return;
    }

    let finalItem1 = item1;
    let finalItem2 = item2;
    let finalRawInput = rawInput;

    // 文本模式：解析输入
    if (inputMode === 'text') {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        showSnackbar('请输入操作内容', 'warning');
        return;
      }

      // 尝试解析 "物品1+物品2" 格式
      const parts = trimmed.split('+').map(s => s.trim());
      if (parts.length === 2) {
        finalItem1 = parts[0];
        finalItem2 = parts[1];
      } else {
        // 如果不是组合格式，当作单个物品
        finalItem1 = trimmed;
        finalItem2 = '';
      }

      finalRawInput = trimmed;
    } else {
      // 选择模式
      if (!finalItem1 || !finalItem2) {
        showSnackbar('请选择两个物品进行组合', 'warning');
        return;
      }
      finalRawInput = `${finalItem1}+${finalItem2}`;
    }

    try {
      const result = await performAction(roomId, 'combination', finalItem1, finalItem2, finalRawInput);

      if (result.success) {
        showSnackbar('操作成功！', 'success');
        // 清空输入
        setItem1('');
        setItem2('');
        setRawInput('');
      } else {
        showSnackbar(result.message || '操作失败', 'error');
      }
    } catch (error: any) {
      console.error('[GamePage] 执行操作失败:', error);
      showSnackbar(error.message || '执行操作失败', 'error');
    }
  };

  /**
   * 发送聊天消息
   */
  const handleSendChat = () => {
    if (!chatMessage.trim()) return;

    const newMessage = {
      id: `${Date.now()}_${Math.random()}`,
      sender: user?.username || '未知',
      message: chatMessage,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatMessage('');

    // TODO: 通过 WebSocket 发送聊天消息
  };

  /**
   * 离开游戏
   */
  const handleLeaveGame = () => {
    if (window.confirm('确定要离开游戏吗？游戏进度将不会保存。')) {
      navigate('/lobby');
    }
  };

  /**
   * 获取当前玩家
   */
  const getCurrentPlayer = () => {
    return players.find((p) => p.id === user?.id);
  };

  /**
   * 获取可用的物品列表
   */
  const getAvailableItems = () => {
    // 基础物品（场景中的）
    const sceneItems = [
      '水潭',
      '行李箱',
      '衣柜',
      '木箱',
      '电脑',
      '显示器',
      '花瓶',
      '囚笼',
      '猫',
      '狗',
      '龟',
    ];

    // 已获得的物品
    const obtainedItems = inventory.map((item) => item.name);

    // 合并去重
    return [...new Set([...sceneItems, ...obtainedItems])];
  };

  const availableItems = getAvailableItems();
  const currentPlayer = getCurrentPlayer();

  // ========================================
  // 渲染玩家面板
  // ========================================
  const renderPlayerPanel = () => {
    return (
      <Paper elevation={3} sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BrainIcon color="primary" />
          玩家状态
        </Typography>

        <Grid container spacing={2}>
          {players.map((player) => {
            const charInfo = CharacterInfo[player.character];
            const isCurrentPlayer = player.id === user?.id;
            const hpPercentage = (player.hp / player.maxHp) * 100;

            return (
              <Grid item xs={12} sm={4} key={player.id}>
                <Card
                  elevation={isCurrentPlayer ? 6 : 2}
                  sx={{
                    border: isCurrentPlayer ? 2 : 1,
                    borderColor: isCurrentPlayer ? 'primary.main' : 'divider',
                    bgcolor: isCurrentPlayer ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Badge
                        badgeContent={player.status === 'trapped' ? '被困' : player.status === 'dead' ? '死亡' : ''}
                        color={player.status === 'trapped' ? 'warning' : 'error'}
                      >
                        <Avatar
                          sx={{
                            width: 50,
                            height: 50,
                            fontSize: 28,
                            bgcolor: charInfo.color,
                          }}
                        >
                          {charInfo.emoji}
                        </Avatar>
                      </Badge>

                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {player.username}
                          </Typography>
                          {isCurrentPlayer && <Chip label="你" color="primary" size="small" />}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {charInfo.label}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 生命值 */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          生命值
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {player.hp}/{player.maxHp}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={hpPercentage}
                        color={hpPercentage > 60 ? 'success' : hpPercentage > 30 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>

                    {/* 状态标签 */}
                    {player.status === 'trapped' && player.trappedLocation && (
                      <Chip
                        label={`被困于${player.trappedLocation}`}
                        color="warning"
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
    );
  };

  // ========================================
  // 渲染剧情显示区
  // ========================================
  const renderStoryDisplay = () => {
    return (
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            游戏剧情
          </Typography>
        </Box>

        <Box
          ref={storyDisplayRef}
          sx={{
            flexGrow: 1,
            p: 3,
            overflowY: 'auto',
            bgcolor: '#f5f5f5',
            fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
          }}
        >
          {/* 当前剧情文本 */}
          {currentStory && (
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {currentStory}
              </Typography>
            </Paper>
          )}

          {/* 操作历史 */}
          {actionHistory.map((entry) => {
            const isSuccess = entry.result.success;
            const isCurrentPlayer = entry.playerId === user?.id;

            return (
              <Paper
                key={entry.id}
                elevation={1}
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: isSuccess ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                  borderLeft: 4,
                  borderColor: isSuccess ? 'success.main' : 'error.main',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={entry.playerName}
                    size="small"
                    color={isCurrentPlayer ? 'primary' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Chip
                    label={isSuccess ? '成功' : '失败'}
                    size="small"
                    color={isSuccess ? 'success' : 'error'}
                  />
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  操作：{entry.input}
                </Typography>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {entry.result.message}
                </Typography>

                {/* HP变化提示 */}
                {entry.result.hpChanges && entry.result.hpChanges.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {entry.result.hpChanges.map((hpChange, idx) => {
                      const player = players.find(p => p.id === hpChange.playerId);
                      const charInfo = player ? CharacterInfo[player.character] : null;
                      return (
                        <Chip
                          key={idx}
                          label={`${charInfo?.emoji || ''} ${hpChange.amount > 0 ? '+' : ''}${hpChange.amount} HP`}
                          size="small"
                          color={hpChange.amount > 0 ? 'success' : 'error'}
                          icon={hpChange.amount > 0 ? <HeartIcon /> : <HeartOutlineIcon />}
                        />
                      );
                    })}
                  </Box>
                )}
              </Paper>
            );
          })}

          {!currentStory && actionHistory.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                游戏剧情将在这里显示...
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  // ========================================
  // 渲染操作区
  // ========================================
  const renderActionArea = () => {
    return (
      <Paper elevation={3} sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon color="primary" />
          操作面板
        </Typography>

        {/* 模式切换 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant={inputMode === 'select' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setInputMode('select')}
          >
            选择模式
          </Button>
          <Button
            variant={inputMode === 'text' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setInputMode('text')}
          >
            文本模式
          </Button>
        </Box>

        {inputMode === 'select' ? (
          // 选择模式
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>物品 1</InputLabel>
              <Select value={item1} onChange={(e) => setItem1(e.target.value)} label="物品 1">
                <MenuItem value="">
                  <em>请选择</em>
                </MenuItem>
                {availableItems.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
              +
            </Typography>

            <FormControl fullWidth>
              <InputLabel>物品 2</InputLabel>
              <Select value={item2} onChange={(e) => setItem2(e.target.value)} label="物品 2">
                <MenuItem value="">
                  <em>请选择</em>
                </MenuItem>
                {availableItems.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          // 文本模式
          <TextField
            fullWidth
            label="输入操作"
            placeholder="例如：水潭+龟 或 行李箱+猫"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePerformAction();
              }
            }}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="使用 + 连接两个物品">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* 执行按钮 */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          startIcon={<SendIcon />}
          onClick={handlePerformAction}
          disabled={isLoading || !isConnected}
          sx={{ py: 1.5, fontSize: '1rem' }}
        >
          {isLoading ? '执行中...' : '执行操作'}
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* 背包和收集状态 */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 背包 */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              背包物品 ({inventory.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {inventory.length > 0 ? (
                inventory.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.name}
                    size="small"
                    color={item.isKeyItem ? 'primary' : 'default'}
                    icon={<InventoryIcon />}
                  />
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  暂无物品
                </Typography>
              )}
            </Box>
          </Box>

          {/* 已收集字母 */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              已收集字母 ({collectedLetters.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {collectedLetters.length > 0 ? (
                collectedLetters.map((letter, idx) => (
                  <Chip
                    key={idx}
                    label={letter.letter}
                    size="small"
                    color="secondary"
                  />
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  暂无字母
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* 提示信息 */}
        <Alert severity="info" sx={{ mt: 2 }}>
          {currentPlayer?.status === 'trapped'
            ? `你被困在${currentPlayer.trappedLocation}中，需要其他玩家救援！`
            : '尝试组合不同的物品，探索这个神秘的密室...'}
        </Alert>

        {!isConnected && (
          <Alert severity="error" sx={{ mt: 1 }}>
            与服务器断开连接，请检查网络
          </Alert>
        )}
      </Paper>
    );
  };

  // ========================================
  // 渲染聊天框
  // ========================================
  const renderChatBox = () => {
    return (
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatIcon color="primary" />
            聊天室
          </Typography>
        </Box>

        <Box
          ref={chatDisplayRef}
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            bgcolor: '#f5f5f5',
          }}
        >
          {chatMessages.length > 0 ? (
            <List sx={{ p: 0 }}>
              {chatMessages.map((msg) => {
                const isCurrentUser = msg.sender === user?.username;
                return (
                  <ListItem
                    key={msg.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                      p: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      {msg.sender} · {new Date(msg.timestamp).toLocaleTimeString()}
                    </Typography>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        maxWidth: '80%',
                        bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
                        color: isCurrentUser ? 'white' : 'text.primary',
                      }}
                    >
                      <Typography variant="body2">{msg.message}</Typography>
                    </Paper>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                暂无聊天消息
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="输入消息..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendChat();
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendChat}
              disabled={!chatMessage.trim()}
            >
              发送
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  // ========================================
  // 主渲染
  // ========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#e3f2fd' }}>
      {/* 顶部信息栏 */}
      <Paper elevation={2} sx={{ borderRadius: 0, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            三兄弟的冒险2 - 密室逃脱
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={isConnected ? '已连接' : '未连接'}
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={`第${gameState?.currentChapter || 1}章 - 第${gameState?.currentLevel || 1}关`}
              color="secondary"
            />
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<ExitIcon />}
              onClick={handleLeaveGame}
            >
              离开游戏
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 主内容区 */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* 左侧：游戏主区域 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, gap: 2, overflow: 'auto' }}>
          {/* 玩家面板 */}
          {renderPlayerPanel()}

          {/* 剧情显示区 */}
          <Box sx={{ flex: 1, minHeight: 0 }}>{renderStoryDisplay()}</Box>

          {/* 操作区 */}
          {renderActionArea()}
        </Box>

        {/* 右侧：聊天框 */}
        <Box sx={{ width: 350, p: 2, borderLeft: 1, borderColor: 'divider' }}>
          {renderChatBox()}
        </Box>
      </Box>

      {/* 加载指示器 */}
      {isLoading && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        />
      )}

      {/* 消息提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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

export default GamePage;
