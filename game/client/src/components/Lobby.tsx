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
    <div className="min-h-screen flex items-center justify-center p-4 
                    bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl animate-bounce opacity-60" style={{ animationDelay: '0s' }}>🌙</div>
        <div className="absolute top-20 right-20 text-5xl animate-bounce opacity-60" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-bounce opacity-60" style={{ animationDelay: '1s' }}>✨</div>
        <div className="absolute bottom-10 right-10 text-6xl animate-bounce opacity-60" style={{ animationDelay: '1.5s' }}>🌟</div>
        <div className="absolute top-1/3 left-5 text-4xl animate-pulse opacity-50">💫</div>
        <div className="absolute top-1/2 right-5 text-4xl animate-pulse opacity-50" style={{ animationDelay: '0.7s' }}>🔮</div>
      </div>

      <div className="relative bg-white/10 backdrop-blur-sm p-8 rounded-3xl shadow-2xl max-w-md w-full
                      border-2 border-purple-400">
        <h1 className="text-3xl font-bold text-center mb-2 text-purple-300 mt-2">
          🌙 三兄弟的冒险
        </h1>
        <p className="text-center text-amber-400 mb-8 flex items-center justify-center gap-2">
          <span>✨</span>
          <span>三人在线文字冒险游戏</span>
          <span>✨</span>
        </p>

        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🎭</span>
            <input
              type="text"
              placeholder="输入你的名字"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-2xl text-white 
                        placeholder-purple-300 border-2 border-purple-400/50
                        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>

          {mode === 'menu' ? (
            <>
              <button
                onClick={handleCreate}
                disabled={!playerName.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                          hover:from-purple-600 hover:to-indigo-600 
                          disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed 
                          text-white font-bold rounded-2xl transition-all duration-200
                          shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                          flex items-center justify-center gap-2"
              >
                <span>🏠</span>
                <span>创建房间</span>
              </button>

              <button
                onClick={() => setMode('join')}
                disabled={!playerName.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 
                          hover:from-indigo-600 hover:to-violet-600 
                          disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed 
                          text-white font-bold rounded-2xl transition-all duration-200
                          shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                          flex items-center justify-center gap-2"
              >
                <span>🚪</span>
                <span>加入房间</span>
              </button>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                <input
                  type="text"
                  placeholder="输入房间代码"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-amber-500/20 rounded-2xl text-amber-300 
                            placeholder-amber-400/60 border-2 border-amber-400/50
                            focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400
                            text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!playerName.trim() || roomCode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                          hover:from-amber-600 hover:to-orange-600 
                          disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed 
                          text-white font-bold rounded-2xl transition-all duration-200
                          shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                          flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>加入</span>
              </button>

              <button
                onClick={() => setMode('menu')}
                className="w-full py-3 bg-white/10 hover:bg-white/20
                          text-purple-300 font-bold rounded-2xl transition-all duration-200
                          border border-purple-400/50
                          flex items-center justify-center gap-2"
              >
                <span>◀</span>
                <span>返回</span>
              </button>
            </>
          )}
        </div>

        {/* 底部装饰 */}
        <div className="flex justify-center gap-2 mt-6 text-2xl opacity-60">
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
