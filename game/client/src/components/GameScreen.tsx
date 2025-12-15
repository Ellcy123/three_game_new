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
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* 顶部状态栏 */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 font-bold">第{gameState.round}回合</span>
            <span className="text-gray-400">|</span>
            <span className="text-white">
              当前行动: <span className="text-yellow-400">{currentPlayer?.name}</span>
              {isMyTurn && <span className="text-green-400 ml-2">(你的回合)</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {gameState.collectedLetters.length > 0 && (
              <span className="text-gray-400">
                字母: {gameState.collectedLetters.join(', ')} ({gameState.collectedLetters.length}/4)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col p-4">
          {/* 剧情文本区 */}
          <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-3">
              {storyLog.map((text, index) => (
                <p key={index} className="text-gray-200 leading-relaxed">
                  {text}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* 密码输入弹窗 */}
          {eventResult?.requiresPassword && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-yellow-500/50">
              <h3 className="text-yellow-400 font-bold mb-3">
                {eventResult.passwordType === 'suitcase' ? '行李箱密码 (3位数字)' : '大门密码 (4位字母)'}
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  maxLength={eventResult.passwordType === 'suitcase' ? 3 : 4}
                  placeholder={eventResult.passwordType === 'suitcase' ? '输入3位数字' : '输入4位字母'}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={() => handlePasswordSubmit(eventResult.passwordType!)}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg"
                >
                  确认
                </button>
                <button
                  onClick={onClearResult}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 选择弹窗 */}
          {eventResult?.requiresChoice && eventResult.choices && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-yellow-500/50">
              <h3 className="text-yellow-400 font-bold mb-3">做出选择</h3>
              <div className="flex gap-2">
                {eventResult.choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => {
                      onChoice(choice);
                      onClearResult();
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 输入区 */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isMyTurn ? '输入关键词组合，如：水潭+乌龟' : '等待其他玩家行动...'}
              disabled={!isMyTurn}
              className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isMyTurn || !input.trim()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold rounded-lg transition-colors"
            >
              发送
            </button>
          </form>
        </div>

        {/* 右侧状态栏 */}
        <div className="w-64 bg-gray-800 p-4 border-l border-gray-700">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">玩家状态</h3>
          <div className="space-y-3">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg ${
                  index === gameState.currentPlayerIndex
                    ? 'bg-yellow-900/30 border border-yellow-500/50'
                    : 'bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium">{player.name}</span>
                  {player.id === playerId && (
                    <span className="text-xs text-yellow-400">你</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        player.health > 4 ? 'bg-green-500' : player.health > 2 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(player.health / 8) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{player.health}/8</span>
                </div>
                {player.isTrapped && (
                  <span className="text-xs text-red-400 mt-1 block">被困中</span>
                )}
                {player.isIncapacitated && (
                  <div className="mt-2">
                    <span className="text-xs text-red-400 block mb-1">已阵亡</span>
                    {player.id !== playerId && myPlayer && !myPlayer.isIncapacitated && myPlayer.health > 2 && (
                      <button
                        onClick={() => onRevive(player.id)}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded"
                      >
                        复活 (-2HP)
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
              <h3 className="text-lg font-bold text-yellow-400 mb-3">物品栏</h3>
              <div className="space-y-1">
                {gameState.inventory
                  .filter(i => !i.isDestroyed)
                  .map((item) => (
                    <div key={item.id} className="text-gray-300 text-sm">
                      • {getItemName(item.id)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 已解锁区域 */}
          {gameState.smallRoomUnlocked && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-3">已解锁</h3>
              <div className="text-gray-300 text-sm">• 小房间</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
