import { useEffect, useRef, useState, useCallback } from 'react';
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

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 房间事件
    socket.on('room:created', (data: { id: string; code: string; playerId: string; players: Player[] }) => {
      setRoom({ id: data.id, code: data.code, players: data.players, playerId: data.playerId });
      setPlayerId(data.playerId);
    });

    socket.on('room:joined', (data: { id: string; code: string; players: Player[]; playerId: string }) => {
      setRoom({ id: data.id, code: data.code, players: data.players, playerId: data.playerId });
      setPlayerId(data.playerId);
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

  return {
    isConnected,
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
    clearEventResult
  };
}
