import { useState, useRef, useEffect } from 'react';
import { GameState, EventResult } from '../hooks/useSocket';
import { getItemName } from '../utils/itemNames';

interface GameScreenProps {
  gameState: GameState;
  playerId: string;
  eventResult: EventResult | null;
  onAction: (input: string) => void;
  onPassword: (password: string, type: 'suitcase' | 'door') => void;
  onChoice: (choice: string) => void;
  onRevive: (targetPlayerId: string) => void;
  onClearResult: () => void;
}

export function GameScreen({
  gameState,
  playerId,
  eventResult,
  onAction,
  onPassword,
  onChoice,
  onRevive,
  onClearResult
}: GameScreenProps) {
  const [input, setInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [storyLog, setStoryLog] = useState<string[]>([
    '你们醒来后发现被困在一个密室当中。',
    '环顾四周，发现这是一个布局奇怪的房间。',
    '有一汪水潭，一个行李箱，一个衣柜。',
    '好像听到了有人在哭泣...'
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = gameState.players.find(p => p.id === playerId);

  useEffect(() => {
    if (eventResult?.storyText) {
      setStoryLog(prev => [...prev, eventResult.storyText]);
      if (!eventResult.requiresPassword && !eventResult.requiresChoice) {
        onClearResult();
      }
    }
  }, [eventResult]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyLog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isMyTurn) {
      onAction(input.trim());
      setInput('');
    }
  };

  const handlePasswordSubmit = (type: 'suitcase' | 'door') => {
    if (passwordInput.trim()) {
      onPassword(passwordInput.trim(), type);
      setPasswordInput('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900">
      {/* 顶部状态栏 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 border-b-4 border-amber-400 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold flex items-center gap-2">
              <span>🎯</span>
              <span>第{gameState.round}回合</span>
            </span>
            <span className="text-white/60">|</span>
            <span className="text-white flex items-center gap-2">
              <span>🎮</span>
              <span>当前行动:</span>
              <span className="font-bold text-amber-300">{currentPlayer?.name}</span>
              {isMyTurn && <span className="bg-amber-400 text-purple-900 px-2 py-0.5 rounded-full text-xs font-bold ml-2">你的回合!</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {gameState.collectedLetters.length > 0 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
                <span>🔤</span>
                <span>{gameState.collectedLetters.join(', ')} ({gameState.collectedLetters.length}/4)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col p-4">
          {/* 剧情文本区 */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-4 overflow-y-auto max-h-[60vh]
                         border-2 border-purple-400 shadow-lg">
            <div className="space-y-4">
              {storyLog.map((text, index) => (
                <p key={index} className="text-purple-100 leading-relaxed text-lg
                                         bg-white/5 p-3 rounded-2xl border-l-4 border-purple-400">
                  <span className="text-purple-300 mr-2">📖</span>
                  {text}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* 密码输入弹窗 */}
          {eventResult?.requiresPassword && (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-4 
                           border-2 border-amber-400 shadow-xl">
              <h3 className="text-amber-300 font-bold mb-4 flex items-center gap-2 text-lg">
                <span>🔐</span>
                <span>{eventResult.passwordType === 'suitcase' ? '行李箱密码 (3位数字)' : '大门密码 (4位字母)'}</span>
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  maxLength={eventResult.passwordType === 'suitcase' ? 3 : 4}
                  placeholder={eventResult.passwordType === 'suitcase' ? '输入3位数字' : '输入4位字母'}
                  className="flex-1 px-4 py-3 bg-white/10 rounded-2xl text-white text-center text-2xl tracking-widest 
                            border-2 border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400
                            placeholder-purple-300"
                />
                <button
                  onClick={() => handlePasswordSubmit(eventResult.passwordType!)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                            hover:from-amber-600 hover:to-orange-600
                            text-white font-bold rounded-2xl shadow-lg
                            flex items-center gap-2"
                >
                  <span>✅</span>
                  <span>确认</span>
                </button>
                <button
                  onClick={onClearResult}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-purple-200 rounded-2xl border border-purple-400"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 选择弹窗 */}
          {eventResult?.requiresChoice && eventResult.choices && (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-4 
                           border-2 border-purple-400 shadow-xl">
              <h3 className="text-purple-300 font-bold mb-4 flex items-center gap-2 text-lg">
                <span>🤔</span>
                <span>做出选择</span>
              </h3>
              <div className="flex gap-3">
                {eventResult.choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => {
                      onChoice(choice);
                      onClearResult();
                    }}
                    className="flex-1 px-4 py-4 bg-white/10 
                              hover:bg-white/20
                              text-purple-100 font-medium rounded-2xl transition-all
                              border-2 border-purple-400 hover:border-amber-400
                              hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 输入区 */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">💬</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isMyTurn ? '输入关键词组合，如：水潭+你的名字' : '等待其他玩家行动...'}
                disabled={!isMyTurn}
                className="w-full pl-12 pr-4 py-4 bg-white/10 rounded-2xl text-white 
                          placeholder-purple-300 border-2 border-purple-400
                          focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400
                          disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!isMyTurn || !input.trim()}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 
                        hover:from-purple-600 hover:to-indigo-600 
                        disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed 
                        text-white font-bold rounded-2xl transition-all duration-200
                        shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                        flex items-center gap-2"
            >
              <span>发送</span>
              <span>🚀</span>
            </button>
          </form>
        </div>

        {/* 右侧状态栏 */}
        <div className="w-64 bg-white/10 backdrop-blur-sm p-4 border-l-2 border-purple-400 shadow-lg">
          <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
            <span>👥</span>
            <span>玩家状态</span>
          </h3>
          <div className="space-y-3">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`p-3 rounded-2xl transition-all
                  ${index === gameState.currentPlayerIndex
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-md'
                    : 'bg-white/5 border-2 border-purple-400/50'
                  }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-purple-100 font-medium">{player.name}</span>
                  {player.id === playerId && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">你</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        player.health > 4 ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : player.health > 2 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                        : 'bg-gradient-to-r from-red-400 to-rose-500'
                      }`}
                      style={{ width: `${(player.health / 8) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-purple-300 font-medium">{player.health}/8</span>
                </div>
                {player.isTrapped && (
                  <span className="text-xs text-amber-400 mt-2 block flex items-center gap-1">
                    <span>⛓️</span>
                    <span>被困中</span>
                  </span>
                )}
                {player.isIncapacitated && (
                  <div className="mt-2">
                    <span className="text-xs text-red-400 block mb-1 flex items-center gap-1">
                      <span>💀</span>
                      <span>已阵亡</span>
                    </span>
                    {player.id !== playerId && myPlayer && !myPlayer.isIncapacitated && myPlayer.health > 2 && (
                      <button
                        onClick={() => onRevive(player.id)}
                        className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 
                                  hover:from-green-600 hover:to-emerald-600
                                  text-white rounded-full flex items-center gap-1"
                      >
                        <span>💚</span>
                        <span>复活 (-2HP)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 物品栏 */}
          {gameState.inventory.filter(i => !i.isDestroyed).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-purple-300 mb-3 flex items-center gap-2">
                <span>🎒</span>
                <span>物品栏</span>
              </h3>
              <div className="space-y-2">
                {gameState.inventory
                  .filter(i => !i.isDestroyed)
                  .map((item) => (
                    <div key={item.id} className="text-purple-200 text-sm bg-white/5 px-3 py-2 rounded-xl
                                                 border border-purple-400/50 flex items-center gap-2">
                      <span>📦</span>
                      <span>{getItemName(item.id)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 已解锁区域 */}
          {gameState.smallRoomUnlocked && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-purple-300 mb-3 flex items-center gap-2">
                <span>🔓</span>
                <span>已解锁</span>
              </h3>
              <div className="text-purple-200 text-sm bg-green-500/20 px-3 py-2 rounded-xl
                             border border-green-400 flex items-center gap-2">
                <span>🚪</span>
                <span>小房间</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
