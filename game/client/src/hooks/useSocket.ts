import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '../components/ChatRoom';
import { io, Socket } from 'socket.io-client';

// 支持环境变量配置服务器地址，方便部署
// 本地开发: http://localhost:3000
// 生产环境: 自动使用当前域名（前后端同一服务器）
const getSocketUrl = (): string => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL as string;
  }
  // 生产环境下使用当前域名
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // 开发环境默认
  return 'http://localhost:3000';
};

const SOCKET_URL = getSocketUrl();

// sessionStorage keys for reconnection (每个标签页独立)
const STORAGE_KEYS = {
  PLAYER_ID: 'game_player_id',
  ROOM_ID: 'game_room_id',
  ROOM_CODE: 'game_room_code'
};

// 保存会话信息到sessionStorage（每个标签页独立，避免多账号冲突）
const saveSession = (playerId: string, roomId: string, roomCode: string) => {
  sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
  sessionStorage.setItem(STORAGE_KEYS.ROOM_ID, roomId);
  sessionStorage.setItem(STORAGE_KEYS.ROOM_CODE, roomCode);
};

// 清除会话信息
const clearSession = () => {
  sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
  sessionStorage.removeItem(STORAGE_KEYS.ROOM_ID);
  sessionStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
};

// 获取保存的会话信息
const getSavedSession = () => {
  const playerId = sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID);
  const roomId = sessionStorage.getItem(STORAGE_KEYS.ROOM_ID);
  const roomCode = sessionStorage.getItem(STORAGE_KEYS.ROOM_CODE);
  if (playerId && roomId && roomCode) {
    return { playerId, roomId, roomCode };
  }
  return null;
};

export interface Player {
  id: string;
  name: string;
  characterIndex?: number;
  customName?: string;
  isReady: boolean;
  isHost: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  characterType?: string;
  characterRevealed: boolean;
  health: number;
  isIncapacitated: boolean;
  isTrapped: boolean;
  trappedLocation?: string;
  isConnected: boolean;
}

export interface GameState {
  roomId: string;
  levelId: string;
  round: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  triggeredEvents: string[];
  collectedLetters: string[];
  unlockedAreas: string[];
  inventory: { id: string; name: string; isDestroyed: boolean }[];
  smallRoomUnlocked: boolean;
}

export interface EventResult {
  success: boolean;
  storyText: string;
  requiresPassword?: boolean;
  passwordType?: 'suitcase' | 'door';
  requiresChoice?: boolean;
  choices?: string[];
}

export interface Room {
  id: string;
  code: string;
  players: Player[];
  playerId?: string;
}

// 判断当前玩家是否是房主
export const isPlayerHost = (room: Room | null, playerId: string | null): boolean => {
  if (!room || !playerId) return false;
  const player = room.players.find(p => p.id === playerId);
  return player?.isHost ?? false;
};

// 第二关 - 藏匿相关类型
export interface HidingArea {
  id: string;
  name: string;
  capacity: number;
  isDestroyed: boolean;
  currentPlayers: string[];
}

export interface HidingState {
  currentRound: number;
  maxRounds: number;
  phase: 'story' | 'rules' | 'selecting' | 'attacking' | 'result' | 'final' | 'ending';
  areas: HidingArea[];
  destroyedAreas: string[];
  playerSelections: Record<string, string | null>;
  playerConfirmed: Record<string, boolean>;
  playerHitCounts: Record<string, number>;
  selectionTimeLeft: number;
  lastAttackedArea: string | null;
  hitPlayersThisRound: string[];
  players: { id: string; name: string; health: number }[];
}

export interface HidingAttackResult {
  attackedAreaId: string;
  attackedAreaName: string;
  hitPlayers: string[];
  attackText: string;
}

export interface LevelChangeData {
  levelId: string;
  levelName: string;
  openingStory: string[];
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [canStart, setCanStart] = useState(false);
  
  // 第二关状态
  const [currentLevel, setCurrentLevel] = useState<string>('level1');
  const [hidingState, setHidingState] = useState<HidingState | null>(null);
  const [hidingAttackResult, setHidingAttackResult] = useState<HidingAttackResult | null>(null);
  const [levelStory, setLevelStory] = useState<string[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // 第三幕状态
  const [storyState, setStoryState] = useState<any>(null);

  // BOSS战状态 - 鼠鼠大王
  const [bossState, setBossState] = useState<any>(null);
  const [bossAttackResult, setBossAttackResult] = useState<any>(null);

  // BOSS战状态 - 百变小鹦
  const [parrotState, setParrotState] = useState<any>(null);
  const [parrotRoundResult, setParrotRoundResult] = useState<any>(null);

  // BOSS战状态 - 死神
  const [deathState, setDeathState] = useState<any>(null);
  const [deathRoundResult, setDeathRoundResult] = useState<any>(null);
  const [diceSelectionNeeded, setDiceSelectionNeeded] = useState<{ needed: boolean; skillName: string; playerId: string } | null>(null);

  // 结局状态
  const [endingId, setEndingId] = useState<'ending_0' | 'ending_1' | 'ending_2' | null>(null);

  // 道具选择状态
  const [itemSelectionData, setItemSelectionData] = useState<any>(null);

  // 海龟汤状态
  const [soupState, setSoupState] = useState<any>(null);
  const [soupQuestionResult, setSoupQuestionResult] = useState<any>(null);

  // 聊天室状态
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatDisableReason, setChatDisableReason] = useState<string | undefined>(undefined);
  const lastSendTimeRef = useRef<number>(0);
  
  // 光标同步状态
  const [remoteCursors, setRemoteCursors] = useState<any[]>([]);
  const [cursorEnabled, setCursorEnabled] = useState(true);
  
  // 敲击互动状态
  const [hammerCounts, setHammerCounts] = useState<Record<string, number>>({}); // playerId -> hitCount
  const [shouldShake, setShouldShake] = useState(false); // 是否应该震动屏幕
  const lastShakeTimeRef = useRef<number>(0); // 上次震动时间
  
  // 重连状态
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasAttemptedReconnect = useRef(false);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      
      // 尝试自动重连
      if (!hasAttemptedReconnect.current) {
        hasAttemptedReconnect.current = true;
        const savedSession = getSavedSession();
        if (savedSession) {
          console.log('尝试重连到房间:', savedSession.roomCode);
          setIsReconnecting(true);
          socket.emit('room:reconnect', savedSession.playerId, savedSession.roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 房间事件
    socket.on('room:created', (data: { id: string; code: string; playerId: string; players: Player[] }) => {
      setRoom({ id: data.id, code: data.code, players: data.players, playerId: data.playerId });
      setPlayerId(data.playerId);
      // 保存会话信息
      saveSession(data.playerId, data.id, data.code);
    });

    socket.on('room:joined', (data: { id: string; code: string; players: Player[]; playerId: string }) => {
      setRoom({ id: data.id, code: data.code, players: data.players, playerId: data.playerId });
      setPlayerId(data.playerId);
      // 保存会话信息
      saveSession(data.playerId, data.id, data.code);
    });
    
    // 重连成功
    socket.on('room:reconnected', (data: {
      roomId: string;
      roomCode: string;
      playerId: string;
      players: Player[];
      gameState: GameState | null;
      currentLevel: string;
      hidingState: any;
      storyState: any;
      bossState: any;
      parrotState: any;
      deathState: any;
      soupState: any;
      endingId: string | null;
      chatHistory: any[];
      hammerCounts?: Record<string, number>;
    }) => {
      console.log('重连成功:', data);
      setIsReconnecting(false);
      setRoom({ id: data.roomId, code: data.roomCode, players: data.players, playerId: data.playerId });
      setPlayerId(data.playerId);
      setCurrentLevel(data.currentLevel);
      
      // 先清理所有状态，再设置当前关卡的状态
      setHidingState(null);
      setHidingAttackResult(null);
      setStoryState(null);
      setBossState(null);
      setBossAttackResult(null);
      setParrotState(null);
      setParrotRoundResult(null);
      setDeathState(null);
      setDeathRoundResult(null);
      setSoupState(null);
      setSoupQuestionResult(null);
      
      // 设置当前关卡的状态
      if (data.gameState) setGameState(data.gameState);
      if (data.hidingState) setHidingState(data.hidingState);
      if (data.storyState) setStoryState(data.storyState);
      if (data.bossState) setBossState(data.bossState);
      if (data.parrotState) setParrotState(data.parrotState);
      if (data.deathState) setDeathState(data.deathState);
      if (data.soupState) setSoupState(data.soupState);
      if (data.endingId) setEndingId(data.endingId as any);
      if (data.chatHistory) setChatMessages(data.chatHistory);
      if (data.hammerCounts) setHammerCounts(data.hammerCounts);
    });
    
    // 重连失败
    socket.on('room:reconnectFailed', (reason: string) => {
      console.log('重连失败:', reason);
      setIsReconnecting(false);
      clearSession(); // 清除无效的会话信息
    });

    socket.on('room:playerJoined', (player: Player) => {
      setRoom(prev => prev ? { ...prev, players: [...prev.players, player] } : null);
    });

    socket.on('room:playerLeft', (leftPlayerId: string) => {
      setRoom(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== leftPlayerId) } : null);
    });

    socket.on('room:playerReady', (readyPlayerId: string, characterIndex: number, customName?: string) => {
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map(p => 
            p.id === readyPlayerId ? { ...p, isReady: true, characterIndex, customName: customName || p.customName } : p
          )
        };
      });
    });

    socket.on('room:canStart', () => {
      setCanStart(true);
    });

    socket.on('room:error', (message: string) => {
      setError(message);
    });

    // 游戏事件
    socket.on('game:started', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:stateUpdate', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:eventResult', (result: EventResult) => {
      setEventResult(result);
    });

    socket.on('game:turnChange', (currentPlayerId: string) => {
      setGameState(prev => {
        if (!prev) return null;
        const index = prev.players.findIndex(p => p.id === currentPlayerId);
        return { ...prev, currentPlayerIndex: index };
      });
    });

    // 关卡切换事件
    socket.on('game:levelChange', (data: LevelChangeData) => {
      setCurrentLevel(data.levelId);
      setLevelStory(data.openingStory);
      setCurrentStoryIndex(0);
      
      // 清理旧的关卡状态，避免跳转时状态残留
      if (data.levelId === 'level2') {
        // 进入第二关，清理第一关状态
      } else if (data.levelId === 'level3') {
        // 进入第三幕，清理第二关状态
        setHidingState(null);
        setHidingAttackResult(null);
      } else if (data.levelId === 'boss1') {
        // 进入BOSS1，清理第三幕状态
        setStoryState(null);
        // 清理其他BOSS状态
        setParrotState(null);
        setDeathState(null);
      } else if (data.levelId === 'boss2') {
        // 进入BOSS2，清理BOSS1状态
        setBossState(null);
        setBossAttackResult(null);
        // 清理其他BOSS状态
        setDeathState(null);
      } else if (data.levelId === 'boss3') {
        // 进入BOSS3，清理BOSS2状态
        setParrotState(null);
        setParrotRoundResult(null);
        // 清理BOSS1状态
        setBossState(null);
        setBossAttackResult(null);
      } else if (data.levelId === 'turtle-soup') {
        // 进入海龟汤，清理所有BOSS状态
        setBossState(null);
        setBossAttackResult(null);
        setParrotState(null);
        setParrotRoundResult(null);
        setDeathState(null);
        setDeathRoundResult(null);
      } else if (data.levelId === 'ending') {
        // 进入结局，清理海龟汤状态
        setSoupState(null);
        setSoupQuestionResult(null);
      }
    });

    // 第二关 - 藏匿事件
    socket.on('hiding:stateUpdate', (state: HidingState) => {
      setHidingState(state);
    });

    socket.on('hiding:timerUpdate', (timeLeft: number) => {
      setHidingState(prev => prev ? { ...prev, selectionTimeLeft: timeLeft } : null);
    });

    socket.on('hiding:attackResult', (result: HidingAttackResult) => {
      setHidingAttackResult(result);
    });

    socket.on('hiding:nextStory', () => {
      setCurrentStoryIndex(prev => prev + 1);
    });

    socket.on('hiding:roundStart', (data: { round: number; text: string }) => {
      // 可以用来显示轮次开始文本
      console.log(`第${data.round}轮: ${data.text}`);
    });

    socket.on('hiding:endingStory', (story: string[]) => {
      setLevelStory(story);
      setCurrentStoryIndex(0);
    });

    socket.on('hiding:error', (message: string) => {
      setError(message);
    });

    // 第三幕 - 个人剧情事件
    socket.on('story:stateUpdate', (state: any) => {
      setStoryState(state);
    });

    // BOSS战事件
    socket.on('boss:stateUpdate', (state: any) => {
      setBossState(state);
    });

    socket.on('boss:nextStory', () => {
      setCurrentStoryIndex(prev => prev + 1);
    });

    socket.on('boss:battleStart', (data: { text: string }) => {
      console.log('战斗开始:', data.text);
    });

    socket.on('boss:fighterSelected', (data: { playerId: string; message: string }) => {
      console.log('出战玩家:', data.message);
    });

    socket.on('boss:attackResult', (result: any) => {
      setBossAttackResult(result);
    });

    socket.on('boss:victory', (data: { text: string[] }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('boss:defeat', (data: { text: string[]; ending: string }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('boss:skip', (data: { bossId: string; reason: string }) => {
      console.log('跳过BOSS战:', data.reason);
    });

    socket.on('boss:error', (message: string) => {
      setError(message);
    });

    // 百变小鹦BOSS战事件
    socket.on('parrot:stateUpdate', (state: any) => {
      setParrotState(state);
    });

    socket.on('parrot:roundResult', (result: any) => {
      setParrotRoundResult(result);
    });

    socket.on('parrot:victory', (data: { text: string[] }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('parrot:defeat', (data: { text: string[]; ending: string }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('parrot:skip', (data: { bossId: string; reason: string }) => {
      console.log('跳过百变小鹦:', data.reason);
    });

    socket.on('parrot:error', (message: string) => {
      setError(message);
    });

    // 死神BOSS战事件
    socket.on('death:stateUpdate', (state: any) => {
      setDeathState(state);
    });

    socket.on('death:roundResult', (result: any) => {
      setDeathRoundResult(result);
    });

    socket.on('death:diceSelectionNeeded', (data: { needed: boolean; skillName: string; playerId: string }) => {
      setDiceSelectionNeeded(data);
    });

    socket.on('death:customDiceSet', (data: { diceValue: number; message: string }) => {
      console.log('骰子点数已设定:', data.message);
      setDiceSelectionNeeded(null);
    });

    socket.on('death:victory', (data: { text: string[] }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('death:defeat', (data: { text: string[]; ending: string }) => {
      setLevelStory(data.text);
      setCurrentStoryIndex(0);
    });

    socket.on('death:skip', (data: { bossId: string; reason: string }) => {
      console.log('跳过死神:', data.reason);
    });

    socket.on('death:error', (message: string) => {
      setError(message);
    });

    // 道具选择事件
    socket.on('item:selectionNeeded', (data: any) => {
      setItemSelectionData(data);
    });

    socket.on('item:selectionComplete', () => {
      setItemSelectionData(null);
    });

    socket.on('item:error', (message: string) => {
      setError(message);
    });

    // 结局事件
    socket.on('game:ending', (data: { endingId: 'ending_0' | 'ending_1' | 'ending_2' }) => {
      setEndingId(data.endingId);
      setCurrentLevel('ending');
    });

    // 游戏重启事件
    socket.on('game:restarted', (data: { room: Room }) => {
      setRoom(data.room);
      setGameState(null);
      setCurrentLevel('level1');
      setHidingState(null);
      setStoryState(null);
      setBossState(null);
      setParrotState(null);
      setDeathState(null);
      setSoupState(null);
      setEndingId(null);
      setChatMessages([]);
    });

    // 海龟汤事件
    socket.on('soup:stateUpdate', (state: any) => {
      setSoupState(state);
    });

    socket.on('soup:questionResult', (result: any) => {
      setSoupQuestionResult(result);
    });

    socket.on('soup:answerResult', (result: any) => {
      console.log('答案结果:', result);
    });

    socket.on('soup:identityResults', (data: any) => {
      console.log('身份判定结果:', data);
    });

    socket.on('soup:error', (message: string) => {
      setError(message);
    });

    // 聊天室事件
    socket.on('chat:message', (message: ChatMessage) => {
      setChatMessages(prev => {
        const newMessages = [...prev, message];
        // 限制最多保留100条消息
        if (newMessages.length > 100) {
          return newMessages.slice(-100);
        }
        return newMessages;
      });
    });

    socket.on('chat:history', (messages: ChatMessage[]) => {
      setChatMessages(messages);
    });

    socket.on('chat:status', (data: { enabled: boolean; reason?: string }) => {
      setChatEnabled(data.enabled);
      setChatDisableReason(data.reason);
    });

    socket.on('chat:error', (data: { message: string }) => {
      console.warn('聊天错误:', data.message);
    });

    // 光标同步事件
    socket.on('cursor:update', (data: {
      playerId: string;
      playerName: string;
      characterType?: string;
      characterRevealed: boolean;
      x: number;
      y: number;
    }) => {
      setRemoteCursors(prev => {
        const existing = prev.findIndex(c => c.playerId === data.playerId);
        const newCursor = { ...data, lastUpdate: Date.now() };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newCursor;
          return updated;
        }
        return [...prev, newCursor];
      });
    });

    socket.on('cursor:leave', (leavingPlayerId: string) => {
      setRemoteCursors(prev => prev.filter(c => c.playerId !== leavingPlayerId));
    });

    // 敲击互动事件
    socket.on('hammer:update', (data: { counts: Record<string, number> }) => {
      setHammerCounts(data.counts);
    });

    socket.on('hammer:shake', () => {
      // 检查震动冷却（客户端也做一次检查，双重保险）
      const now = Date.now();
      if (now - lastShakeTimeRef.current >= 10000) {
        lastShakeTimeRef.current = now;
        setShouldShake(true);
        // 震动效果持续500ms后重置
        setTimeout(() => setShouldShake(false), 500);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('room:create', playerName);
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socketRef.current?.emit('room:join', roomCode, playerName);
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoom(null);
    setGameState(null);
    clearSession(); // 清除会话信息
  }, []);

  const setReady = useCallback((characterIndex: number, customName: string) => {
    socketRef.current?.emit('room:ready', characterIndex, customName);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const sendAction = useCallback((input: string) => {
    socketRef.current?.emit('game:action', input);
  }, []);

  const sendPassword = useCallback((password: string, type: 'suitcase' | 'door') => {
    socketRef.current?.emit('game:password', password, type);
  }, []);

  const sendChoice = useCallback((choice: string) => {
    socketRef.current?.emit('game:choice', choice);
  }, []);

  const revivePlayer = useCallback((targetPlayerId: string) => {
    socketRef.current?.emit('game:revive', targetPlayerId);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearEventResult = useCallback(() => {
    setEventResult(null);
  }, []);

  // 第二关 - 藏匿操作
  const hidingNextStory = useCallback(() => {
    socketRef.current?.emit('hiding:nextStory');
    setCurrentStoryIndex(prev => prev + 1);
  }, []);

  const hidingNextPhase = useCallback(() => {
    socketRef.current?.emit('hiding:nextPhase');
    setHidingAttackResult(null);
  }, []);

  const hidingSelectArea = useCallback((areaId: string) => {
    socketRef.current?.emit('hiding:selectArea', areaId);
  }, []);

  const hidingConfirmSelection = useCallback(() => {
    socketRef.current?.emit('hiding:confirmSelection');
  }, []);

  const clearHidingAttackResult = useCallback(() => {
    setHidingAttackResult(null);
  }, []);

  // 第三幕 - 个人剧情操作
  const storyNextStory = useCallback(() => {
    socketRef.current?.emit('story:nextStory');
  }, []);

  const storyNextPhase = useCallback(() => {
    socketRef.current?.emit('story:nextPhase');
  }, []);

  const storySelectBranch = useCallback((branch: string) => {
    socketRef.current?.emit('story:selectBranch', branch);
  }, []);

  const storyMakeChoice = useCallback((option: string) => {
    socketRef.current?.emit('story:makeChoice', option);
  }, []);

  // 调试：直接跳到第三关
  const debugSkipToLevel3 = useCallback(() => {
    socketRef.current?.emit('debug:skipToLevel3');
  }, []);

  // 调试：直接跳到BOSS战
  const debugSkipToBoss1 = useCallback(() => {
    socketRef.current?.emit('debug:skipToBoss1');
  }, []);

  // BOSS战操作
  const bossNextStory = useCallback(() => {
    socketRef.current?.emit('boss:nextStory');
    setCurrentStoryIndex(prev => prev + 1);
  }, []);

  const bossStartBattle = useCallback(() => {
    socketRef.current?.emit('boss:startBattle');
  }, []);

  const bossSelectFighter = useCallback((fighterId: string) => {
    socketRef.current?.emit('boss:selectFighter', fighterId);
  }, []);

  const bossAttackHole = useCallback((holeIndex: number) => {
    socketRef.current?.emit('boss:attackHole', holeIndex);
  }, []);

  const bossNextRound = useCallback(() => {
    socketRef.current?.emit('boss:nextRound');
    setBossAttackResult(null);
  }, []);

  const clearBossAttackResult = useCallback(() => {
    setBossAttackResult(null);
  }, []);

  // 百变小鹦BOSS战操作
  const parrotStartBattle = useCallback(() => {
    socketRef.current?.emit('parrot:startBattle');
  }, []);

  const parrotSubmitAnswer = useCallback((answer: string) => {
    socketRef.current?.emit('parrot:submitAnswer', answer);
  }, []);

  const parrotNextRound = useCallback(() => {
    socketRef.current?.emit('parrot:nextRound');
    setParrotRoundResult(null);
  }, []);

  const clearParrotRoundResult = useCallback(() => {
    setParrotRoundResult(null);
  }, []);

  // 调试：直接跳到百变小鹦
  const debugSkipToBoss2 = useCallback(() => {
    socketRef.current?.emit('debug:skipToBoss2');
  }, []);

  // 死神BOSS战操作
  const deathStartBattle = useCallback(() => {
    socketRef.current?.emit('death:startBattle');
  }, []);

  const deathSetBet = useCallback((amount: number) => {
    socketRef.current?.emit('death:setBet', amount);
  }, []);

  const deathSetChoice = useCallback((choice: string) => {
    socketRef.current?.emit('death:setChoice', choice);
  }, []);

  const deathConfirmBet = useCallback(() => {
    socketRef.current?.emit('death:confirmBet');
  }, []);

  const deathRoll = useCallback(() => {
    socketRef.current?.emit('death:roll');
  }, []);

  const deathSetCustomDice = useCallback((diceValue: number) => {
    socketRef.current?.emit('death:setCustomDice', diceValue);
  }, []);

  const deathNextRound = useCallback(() => {
    socketRef.current?.emit('death:nextRound');
    setDeathRoundResult(null);
  }, []);

  // 调试：直接跳到死神
  const debugSkipToBoss3 = useCallback(() => {
    socketRef.current?.emit('debug:skipToBoss3');
  }, []);

  // 调试：直接跳到海龟汤
  const debugSkipToSoup = useCallback(() => {
    socketRef.current?.emit('debug:skipToSoup');
  }, []);

  // 海龟汤操作
  const soupNextStory = useCallback(() => {
    socketRef.current?.emit('soup:nextStory');
  }, []);

  const soupNextPhase = useCallback(() => {
    socketRef.current?.emit('soup:nextPhase');
  }, []);

  const soupGoBack = useCallback(() => {
    socketRef.current?.emit('soup:goBack');
  }, []);

  const soupAskQuestion = useCallback((keywordId: string, questionId: string) => {
    socketRef.current?.emit('soup:askQuestion', keywordId, questionId);
  }, []);

  const soupSubmitDeathCount = useCallback((answer: string) => {
    socketRef.current?.emit('soup:submitDeathCount', answer);
  }, []);

  const soupSubmitIsHuman = useCallback((answer: string) => {
    socketRef.current?.emit('soup:submitIsHuman', answer);
  }, []);

  const soupSubmitIdentity = useCallback((animalId: string) => {
    socketRef.current?.emit('soup:submitIdentity', animalId);
  }, []);

  const soupConfirmIdentities = useCallback(() => {
    socketRef.current?.emit('soup:confirmIdentities');
  }, []);

  const clearSoupQuestionResult = useCallback(() => {
    setSoupQuestionResult(null);
  }, []);

  // 聊天室操作
  const sendChatMessage = useCallback((content: string) => {
    // 频率限制：500ms
    const now = Date.now();
    if (now - lastSendTimeRef.current < 500) {
      console.warn('发送太频繁');
      return;
    }
    lastSendTimeRef.current = now;
    
    socketRef.current?.emit('chat:send', { content });
  }, []);

  // 光标同步操作
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (!cursorEnabled) return;
    socketRef.current?.emit('cursor:move', { x, y });
  }, [cursorEnabled]);

  const toggleCursorSync = useCallback((enabled: boolean) => {
    setCursorEnabled(enabled);
    if (!enabled) {
      // 通知服务器停止发送光标
      socketRef.current?.emit('cursor:leave');
    }
  }, []);

  // 敲击互动操作
  const sendHammerHit = useCallback((targetPlayerId: string) => {
    socketRef.current?.emit('hammer:hit', targetPlayerId);
  }, []);

  // 道具选择操作
  const itemSelect = useCallback((itemId: string, optionId: string) => {
    socketRef.current?.emit('item:select', itemId, optionId);
  }, []);

  const itemSkip = useCallback((itemId: string) => {
    socketRef.current?.emit('item:skip', itemId);
    setItemSelectionData(null);
  }, []);

  // 强制推进游戏（防卡死）
  const forceAdvance = useCallback(() => {
    socketRef.current?.emit('game:forceAdvance');
  }, []);

  // 重新开始游戏（回到等待房间，保持外层名字）
  const restartGame = useCallback(() => {
    socketRef.current?.emit('game:restart');
    // 重置游戏状态但保持房间
    setGameState(null);
    setCurrentLevel('level1');
    setHidingState(null);
    setStoryState(null);
    setBossState(null);
    setParrotState(null);
    setDeathState(null);
    setSoupState(null);
    setEndingId(null);
    setChatMessages([]);
  }, []);

  // 返回大厅（放弃当前游戏，重新注册）
  const returnToLobby = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoom(null);
    setGameState(null);
    setCurrentLevel('level1');
    setHidingState(null);
    setStoryState(null);
    setBossState(null);
    setParrotState(null);
    setDeathState(null);
    setSoupState(null);
    setEndingId(null);
    setChatMessages([]);
    clearSession();
  }, []);

  return {
    isConnected,
    isReconnecting,
    room,
    gameState,
    eventResult,
    error,
    playerId,
    canStart,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    sendAction,
    sendPassword,
    sendChoice,
    revivePlayer,
    clearError,
    clearEventResult,
    // 第二关
    currentLevel,
    hidingState,
    hidingAttackResult,
    levelStory,
    currentStoryIndex,
    hidingNextStory,
    hidingNextPhase,
    hidingSelectArea,
    hidingConfirmSelection,
    clearHidingAttackResult,
    // 第三幕
    storyState,
    storyNextStory,
    storyNextPhase,
    storySelectBranch,
    storyMakeChoice,
    // BOSS战 - 鼠鼠大王
    bossState,
    bossAttackResult,
    bossNextStory,
    bossStartBattle,
    bossSelectFighter,
    bossAttackHole,
    bossNextRound,
    clearBossAttackResult,
    // BOSS战 - 百变小鹦
    parrotState,
    parrotRoundResult,
    parrotStartBattle,
    parrotSubmitAnswer,
    parrotNextRound,
    clearParrotRoundResult,
    // BOSS战 - 死神
    deathState,
    deathRoundResult,
    diceSelectionNeeded,
    deathStartBattle,
    deathSetBet,
    deathSetChoice,
    deathConfirmBet,
    deathRoll,
    deathSetCustomDice,
    deathNextRound,
    // 结局
    endingId,
    // 道具选择
    itemSelectionData,
    itemSelect,
    itemSkip,
    // 海龟汤
    soupState,
    soupQuestionResult,
    soupNextStory,
    soupNextPhase,
    soupGoBack,
    soupAskQuestion,
    soupSubmitDeathCount,
    soupSubmitIsHuman,
    soupSubmitIdentity,
    soupConfirmIdentities,
    clearSoupQuestionResult,
    // 调试
    debugSkipToLevel3,
    debugSkipToBoss1,
    debugSkipToBoss2,
    debugSkipToBoss3,
    debugSkipToSoup,
    // 聊天室
    chatMessages,
    chatEnabled,
    chatDisableReason,
    sendChatMessage,
    // 光标同步
    remoteCursors,
    cursorEnabled,
    sendCursorPosition,
    toggleCursorSync,
    // 敲击互动
    hammerCounts,
    shouldShake,
    sendHammerHit,
    // 帮助功能
    forceAdvance,
    returnToLobby,
    restartGame
  };
}
