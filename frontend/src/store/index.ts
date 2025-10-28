/**
 * Store 导出索引
 *
 * 统一导出所有 zustand stores
 */

// 认证 Store
export { default as useAuthStore } from './authStore';

// 房间 Store
export {
  default as useRoomStore,
  useRooms,
  useCurrentRoom,
  useRoomLoading,
  useRoomError,
  useRoomPagination,
  useIsInRoom,
} from './roomStore';

// 游戏 Store
export {
  default as useGameStore,
  useGameState,
  useGameSession,
  useCurrentStory,
  useActionHistory,
  useEventLog,
  useGameLoading,
  useGameError,
  useIsSyncing,
  useGamePlayers,
  useInventory,
  useCollectedLetters,
  useIsInGame,
  useCurrentLevel,
} from './gameStore';
