import { useState } from 'react';

interface LobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

export function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-yellow-400">
          三兄弟的冒险2
        </h1>
        <p className="text-center text-gray-400 mb-8">
          三人在线文字冒险游戏
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="输入你的名字"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {mode === 'menu' ? (
            <>
              <button
                onClick={handleCreate}
                disabled={!playerName.trim()}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold rounded-lg transition-colors"
              >
                创建房间
              </button>

              <button
                onClick={() => setMode('join')}
                disabled={!playerName.trim()}
                className="w-full py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                加入房间
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="输入房间代码"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center text-2xl tracking-widest"
              />

              <button
                onClick={handleJoin}
                disabled={!playerName.trim() || roomCode.length !== 6}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold rounded-lg transition-colors"
              >
                加入
              </button>

              <button
                onClick={() => setMode('menu')}
                className="w-full py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
              >
                返回
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
