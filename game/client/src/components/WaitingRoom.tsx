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

const CHARACTER_NAMES = ['角色1', '角色2', '角色3'];

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">等待房间</h2>
          <div className="text-right">
            <p className="text-gray-400 text-sm">房间代码</p>
            <p className="text-2xl font-mono text-white tracking-widest">{room.code}</p>
          </div>
        </div>

        {/* 玩家列表 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-300 mb-3">玩家 ({room.players.length}/3)</h3>
          <div className="space-y-2">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === playerId ? 'bg-yellow-900/30 border border-yellow-500/50' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white">{player.customName || player.name}</span>
                  {player.isHost && (
                    <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded">房主</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {player.characterIndex && (
                    <span className="text-gray-400 text-sm">
                      {CHARACTER_NAMES[player.characterIndex - 1]}
                    </span>
                  )}
                  {player.isReady ? (
                    <span className="text-green-400 text-sm">✓ 已准备</span>
                  ) : (
                    <span className="text-gray-500 text-sm">等待中...</span>
                  )}
                </div>
              </div>
            ))}
            {Array.from({ length: 3 - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-lg bg-gray-700/50 border border-dashed border-gray-600">
                <span className="text-gray-500">等待玩家加入...</span>
              </div>
            ))}
          </div>
        </div>

        {/* 角色选择 */}
        {!isReady && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">选择角色</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3].map((index) => {
                const isTaken = takenCharacters.has(index);
                const isSelected = selectedCharacter === index;
                return (
                  <button
                    key={index}
                    onClick={() => !isTaken && setSelectedCharacter(index)}
                    disabled={isTaken}
                    className={`p-4 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'bg-yellow-500 text-gray-900'
                        : isTaken
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {index === 1 ? '🐱' : index === 2 ? '🐕' : '🐢'}
                    </div>
                    <div className="text-sm">{CHARACTER_NAMES[index - 1]}</div>
                    {isTaken && <div className="text-xs mt-1">已选择</div>}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="给角色起个名字"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
            />

            <button
              onClick={handleReady}
              disabled={!selectedCharacter || !customName.trim()}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              准备
            </button>
          </div>
        )}

        {/* 开始游戏按钮 */}
        {isHost && canStart && (
          <button
            onClick={onStartGame}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg transition-colors mb-4"
          >
            开始游戏
          </button>
        )}

        <button
          onClick={onLeave}
          className="w-full py-2 text-gray-400 hover:text-white transition-colors"
        >
          离开房间
        </button>
      </div>
    </div>
  );
}
