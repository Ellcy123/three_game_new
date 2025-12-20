import { useState } from 'react';
import { Room } from '../hooks/useSocket';

interface WaitingRoomProps {
  room: Room;
  playerId: string;
  canStart: boolean;
  onReady: (characterIndex: number, customName: string) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

const CHARACTER_CONFIG = [
  { name: '角色 1', emoji: '❓', color: 'from-orange-400/80 to-amber-400/80', borderColor: 'border-orange-400' },
  { name: '角色 2', emoji: '❓', color: 'from-amber-400/80 to-yellow-400/80', borderColor: 'border-amber-400' },
  { name: '角色 3', emoji: '❓', color: 'from-emerald-400/80 to-green-400/80', borderColor: 'border-emerald-400' }
];

export function WaitingRoom({ room, playerId, canStart, onReady, onStartGame, onLeave }: WaitingRoomProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [isReady, setIsReady] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;

  const takenCharacters = new Set(
    room.players
      .filter(p => p.characterIndex !== undefined && p.characterIndex !== null)
      .map(p => p.characterIndex)
  );

  const handleReady = () => {
    if (selectedCharacter && customName.trim()) {
      onReady(selectedCharacter, customName.trim());
      setIsReady(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 
                    bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-5xl animate-bounce opacity-60">🌙</div>
        <div className="absolute top-20 right-20 text-4xl animate-bounce opacity-60" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-bounce opacity-60" style={{ animationDelay: '1s' }}>✨</div>
        <div className="absolute bottom-10 right-10 text-5xl animate-bounce opacity-60" style={{ animationDelay: '1.5s' }}>🌟</div>
      </div>

      <div className="relative bg-white/10 backdrop-blur-sm p-6 rounded-3xl shadow-2xl max-w-lg w-full
                      border-2 border-purple-400">
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-300 flex items-center gap-2">
            <span>🌙</span>
            <span>等待房间</span>
          </h2>
          <div className="text-right bg-amber-500/20 px-4 py-2 rounded-2xl border-2 border-amber-400/50">
            <p className="text-amber-400 text-xs">房间代码</p>
            <p className="text-xl font-mono text-amber-300 tracking-widest font-bold">{room.code}</p>
          </div>
        </div>

        {/* 玩家列表 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <span>👥</span>
            <span>玩家 ({room.players.length}/3)</span>
          </h3>
          <div className="space-y-2">
            {room.players.map((player) => {
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all
                    ${player.id === playerId 
                      ? 'bg-purple-500/20 border-2 border-purple-400' 
                      : 'bg-white/5 border-2 border-purple-400/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-purple-100 font-medium">{player.customName || player.name}</span>
                    {player.isHost && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">👑 房主</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isReady ? (
                      <span className="text-emerald-400 text-sm font-medium">✅ 已准备</span>
                    ) : (
                      <span className="text-purple-400 text-sm">⏳ 等待中</span>
                    )}
                  </div>
                </div>
              );
            })}
            {Array.from({ length: 3 - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-2xl bg-white/5 border-2 border-dashed border-purple-400/30">
                <span className="text-purple-400 flex items-center gap-2">
                  <span>🪑</span>
                  <span>等待玩家加入...</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 角色选择 */}
        {!isReady && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <span>🎭</span>
              <span>选择角色</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {CHARACTER_CONFIG.map((char, index) => {
                const charIndex = index + 1;
                const isTaken = takenCharacters.has(charIndex);
                const isSelected = selectedCharacter === charIndex;
                return (
                  <button
                    key={charIndex}
                    onClick={() => !isTaken && setSelectedCharacter(charIndex)}
                    disabled={isTaken}
                    className={`p-4 rounded-2xl text-center transition-all duration-200 border-3
                      ${isSelected
                        ? `bg-gradient-to-b ${char.color} ${char.borderColor} border-4 shadow-lg scale-105`
                        : isTaken
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border-gray-600 border-2'
                        : `bg-gradient-to-b ${char.color} opacity-60 hover:opacity-100 border-2 ${char.borderColor} hover:scale-105`
                      }`}
                  >
                    <div className="text-4xl mb-2">{char.emoji}</div>
                    <div className={`text-sm font-medium ${isTaken ? 'text-gray-500' : 'text-white'}`}>{char.name}</div>
                    {isTaken && <div className="text-xs mt-1 text-gray-500">已选择</div>}
                  </button>
                );
              })}
            </div>

            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">✏️</span>
              <input
                type="text"
                placeholder="给角色起个名字"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-2xl text-white 
                          placeholder-purple-300 border-2 border-purple-400/50
                          focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>

            <button
              onClick={handleReady}
              disabled={!selectedCharacter || !customName.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600 
                        disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed 
                        text-white font-bold rounded-2xl transition-all duration-200
                        shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                        flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>准备完毕</span>
            </button>
          </div>
        )}

        {/* 开始游戏按钮 */}
        {isHost && canStart && (
          <button
            onClick={onStartGame}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                      hover:from-amber-600 hover:to-orange-600 
                      text-white font-bold rounded-2xl transition-all duration-200
                      shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                      flex items-center justify-center gap-2 mb-4 animate-pulse"
          >
            <span>🎮</span>
            <span>开始冒险！</span>
            <span>🚀</span>
          </button>
        )}

        <button
          onClick={onLeave}
          className="w-full py-2 text-purple-400 hover:text-red-400 transition-colors
                    flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          <span>离开房间</span>
        </button>

        {/* 底部装饰 */}
        <div className="flex justify-center gap-2 mt-4 text-xl opacity-60">
          <span>🌙</span>
          <span>⭐</span>
          <span>✨</span>
          <span>🌟</span>
          <span>🌙</span>
        </div>
      </div>
    </div>
  );
}
