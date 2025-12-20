import React, { useState } from 'react';

interface HidingArea {
  id: string;
  name: string;
  capacity: number;
  isDestroyed: boolean;
  currentPlayers: string[];
}

interface PlayerInfo {
  id: string;
  name: string;
  health: number;
}

interface HidingScreenProps {
  roomId: string;
  playerId: string;
  players: PlayerInfo[];
  isHost?: boolean;
  hidingState: {
    currentRound: number;
    maxRounds: number;
    phase: string;
    areas: HidingArea[];
    playerSelections: Record<string, string | null>;
    playerConfirmed: Record<string, boolean>;
    playerHitCounts: Record<string, number>;
    selectionTimeLeft: number;
    lastAttackedArea: string | null;
    hitPlayersThisRound: string[];
  };
  storyTexts: string[];
  currentStoryIndex: number;
  attackResult: {
    attackedAreaId: string;
    attackedAreaName: string;
    hitPlayers: string[];
    attackText: string;
  } | null;
  onSelectArea: (areaId: string) => void;
  onConfirmSelection: () => void;
  onNextStory: () => void;
  onNextPhase: () => void;
}

const HidingScreen: React.FC<HidingScreenProps> = ({
  playerId,
  players,
  isHost = false,
  hidingState,
  storyTexts,
  currentStoryIndex,
  attackResult,
  onSelectArea,
  onConfirmSelection,
  onNextStory,
  onNextPhase,
}) => {
  const [showRules, setShowRules] = useState(false);
  
  // 防抖
  const lastClickRef = React.useRef<number>(0);
  const debounceClick = (callback: () => void, delay: number = 500) => {
    const now = Date.now();
    if (now - lastClickRef.current < delay) return;
    lastClickRef.current = now;
    callback();
  };

  const mySelection = hidingState.playerSelections[playerId];
  const myConfirmed = hidingState.playerConfirmed[playerId];

  const getPlayerName = (id: string) => {
    const player = players.find(p => p.id === id);
    return player?.name || '未知玩家';
  };

  const getPlayerEmoji = (index: number) => {
    const emojis = ['😺', '🐶', '🐸'];
    return emojis[index] || '👤';
  };

  // 通用背景
  const bgClass = "min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900";

  // 剧情阶段
  if (hidingState.phase === 'story') {
    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-purple-400">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">🌙</span>
            <p className="text-xl leading-relaxed whitespace-pre-line text-purple-100">
              {storyTexts[currentStoryIndex]}
            </p>
          </div>
          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => debounceClick(currentStoryIndex < storyTexts.length - 1 ? onNextStory : onNextPhase)}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                          hover:from-purple-600 hover:to-indigo-600
                          rounded-2xl text-lg font-semibold transition-all
                          shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                          flex items-center gap-2"
              >
                <span>{currentStoryIndex < storyTexts.length - 1 ? '继续' : '开始躲藏'}</span>
                <span>▶</span>
              </button>
            ) : (
              <div className="text-purple-300 text-sm flex items-center gap-2">
                <span className="animate-pulse">⏳</span>
                <span>等待房主操作...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 规则说明阶段
  if (hidingState.phase === 'rules' || showRules) {
    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-amber-400">
          <h2 className="text-2xl font-bold text-center mb-6 text-amber-300 flex items-center justify-center gap-2">
            <span>📜</span>
            <span>藏匿规则</span>
            <span>📜</span>
          </h2>
          <div className="space-y-4 text-lg">
            <p className="text-center text-purple-100">
              黑色兜帽男将进行 <span className="text-red-400 font-bold text-2xl">5</span> 次攻击！
            </p>
            <p className="text-center text-purple-100">每轮你需要选择一个区域藏匿。</p>
            <div className="bg-white/10 rounded-2xl p-4 space-y-3 border border-purple-400">
              <p className="flex items-center gap-2">
                <span className="text-2xl">⚔️</span>
                <span>被击中：生命值 <span className="text-red-400 font-bold">-1</span></span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span>全程躲过：生命值 <span className="text-green-400 font-bold">+3</span></span>
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 space-y-2 border border-amber-400">
              <p className="text-amber-300 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>注意：</span>
              </p>
              <p className="text-purple-100">• 每个区域最多容纳 2 人</p>
              <p className="text-purple-100">• 被攻击的区域将被摧毁</p>
              <p className="text-purple-100">• 你可以看到队友的选择</p>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            {isHost ? (
              <button
                onClick={() => debounceClick(() => { setShowRules(false); onNextPhase(); })}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 
                          hover:from-green-600 hover:to-emerald-600
                          rounded-2xl text-lg font-semibold transition-all
                          shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                          flex items-center gap-2"
              >
                <span>🏃</span>
                <span>开始躲藏</span>
              </button>
            ) : (
              <div className="text-green-300 text-sm flex items-center gap-2">
                <span className="animate-pulse">⏳</span>
                <span>等待房主开始...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 选择阶段
  if (hidingState.phase === 'selecting') {
    return (
      <div className={`${bgClass} text-white p-4`}>
        <div className="max-w-4xl mx-auto">
          {/* 标题和倒计时 */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <span>🎯</span>
              <span>第 {hidingState.currentRound} 轮 - 选择藏匿区域</span>
            </h2>
            <div className={`inline-block px-6 py-2 rounded-full text-3xl font-bold
                          ${hidingState.selectionTimeLeft <= 5 
                            ? 'bg-red-500/30 text-red-300 animate-pulse border-2 border-red-400' 
                            : 'bg-amber-500/30 text-amber-300 border-2 border-amber-400'}`}>
              ⏱️ {hidingState.selectionTimeLeft}秒
            </div>
          </div>

          {/* 区域选择网格 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {hidingState.areas.map((area) => {
              const isSelected = mySelection === area.id;
              const isFull = area.currentPlayers.filter(id => id !== playerId).length >= area.capacity;
              const playersInArea = area.currentPlayers.map(id => getPlayerName(id));

              return (
                <button
                  key={area.id}
                  onClick={() => !area.isDestroyed && !isFull && !myConfirmed && onSelectArea(area.id)}
                  disabled={area.isDestroyed || isFull || myConfirmed}
                  className={`
                    p-4 rounded-2xl border-3 transition-all duration-200
                    ${area.isDestroyed 
                      ? 'bg-gray-800/50 border-gray-600 opacity-50 cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-gradient-to-b from-green-500/40 to-emerald-600/40 border-green-400 shadow-lg shadow-green-500/30 scale-105' 
                        : isFull 
                          ? 'bg-red-900/30 border-red-600 cursor-not-allowed'
                          : 'bg-white/10 border-purple-400 hover:border-blue-400 hover:bg-white/20 hover:scale-105'
                    }
                  `}
                >
                  <div className="text-lg font-semibold mb-2">
                    {area.isDestroyed ? '💀 已摧毁' : `🏠 ${area.name}`}
                  </div>
                  <div className="text-sm text-purple-200">
                    {area.isDestroyed ? '' : isFull ? '🚫 已满' : `👥 ${area.currentPlayers.length}/${area.capacity}`}
                  </div>
                  {!area.isDestroyed && playersInArea.length > 0 && (
                    <div className="text-xs mt-2 text-blue-300">
                      {playersInArea.join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 队友位置 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-purple-400">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-200">
              <span>👥</span>
              <span>队友位置：</span>
            </h3>
            <div className="space-y-2">
              {players.map((player, index) => {
                const selection = hidingState.playerSelections[player.id];
                const confirmed = hidingState.playerConfirmed[player.id];
                const areaName = selection 
                  ? hidingState.areas.find(a => a.id === selection)?.name || '未知'
                  : '未选择';
                const isMe = player.id === playerId;

                return (
                  <div key={player.id} className={`flex items-center p-2 rounded-xl
                    ${isMe ? 'bg-amber-500/20 border border-amber-400' : 'bg-white/5'}`}>
                    <span className="mr-2 text-xl">{getPlayerEmoji(index)}</span>
                    <span className="mr-2 font-medium">{player.name}{isMe ? '（你）' : ''}：</span>
                    <span className={selection ? 'text-green-400' : 'text-gray-400'}>
                      {areaName}
                    </span>
                    {confirmed && <span className="ml-2 text-green-400">✅</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 确认按钮 */}
          <div className="flex justify-center">
            {myConfirmed ? (
              <div className="px-8 py-3 bg-gray-600/50 rounded-2xl text-lg border border-gray-500">
                ⏳ 已确认，等待其他玩家...
              </div>
            ) : (
              <button
                onClick={onConfirmSelection}
                disabled={!mySelection}
                className={`
                  px-8 py-3 rounded-2xl text-lg font-semibold transition-all
                  flex items-center gap-2
                  ${mySelection 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:scale-105' 
                    : 'bg-gray-600/50 cursor-not-allowed border border-gray-500'
                  }
                `}
              >
                <span>✅</span>
                <span>确认选择</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 攻击阶段
  if (hidingState.phase === 'attacking' && attackResult) {
    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center border-2 border-red-500">
          <h2 className="text-2xl font-bold mb-6 text-red-400 flex items-center justify-center gap-2">
            <span>⚔️</span>
            <span>第 {hidingState.currentRound} 轮 - 攻击！</span>
            <span>⚔️</span>
          </h2>
          <p className="text-xl mb-4 text-purple-200">黑色兜帽男举起了武器...</p>
          <p className="text-2xl font-bold text-red-400 mb-6">
            他朝着【{attackResult.attackedAreaName}】挥出了致命一击！
          </p>
          <div className="text-8xl mb-6 animate-bounce">💥</div>
          <p className="text-lg text-purple-200">{attackResult.attackText}</p>
        </div>
      </div>
    );
  }

  // 结果阶段
  if (hidingState.phase === 'result') {
    const attackedArea = hidingState.areas.find(a => a.id === hidingState.lastAttackedArea);

    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-purple-400">
          <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <span>📊</span>
            <span>第 {hidingState.currentRound} 轮 - 结果</span>
          </h2>

          <div className="space-y-3 mb-6">
            {players.map((player, index) => {
              const selection = hidingState.playerSelections[player.id];
              const areaName = selection 
                ? hidingState.areas.find(a => a.id === selection)?.name || '未知'
                : '未知';
              const wasHit = hidingState.hitPlayersThisRound.includes(player.id);

              return (
                <div key={player.id} className={`flex items-center justify-between p-4 rounded-2xl
                  ${wasHit ? 'bg-red-500/20 border border-red-400' : 'bg-green-500/20 border border-green-400'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getPlayerEmoji(index)}</span>
                    <span className="font-medium">{player.name}：藏在【{areaName}】</span>
                  </div>
                  <div className={`font-bold ${wasHit ? 'text-red-400' : 'text-green-400'}`}>
                    {wasHit ? '💥 被击中！-1HP' : '✅ 安全'}
                  </div>
                </div>
              );
            })}
          </div>

          {attackedArea && (
            <div className="text-center text-amber-300 mb-6 p-3 bg-amber-500/20 rounded-2xl border border-amber-400">
              ⚠️【{attackedArea.name}】已被摧毁
            </div>
          )}

          <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-purple-400">
            <h3 className="font-semibold mb-3 text-center text-purple-200">💚 当前生命值</h3>
            <div className="flex justify-around">
              {players.map((player, index) => (
                <div key={player.id} className="text-center">
                  <span className="text-2xl block mb-1">{getPlayerEmoji(index)}</span>
                  <span className="text-sm text-purple-200">{player.name}</span>
                  <span className="block text-xl font-bold text-green-400">{player.health}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => debounceClick(onNextPhase)}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                          hover:from-purple-600 hover:to-indigo-600
                          rounded-2xl text-lg font-semibold transition-all
                          shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                          flex items-center gap-2"
              >
                <span>{hidingState.currentRound >= hidingState.maxRounds ? '查看最终结算' : '进入下一轮'}</span>
                <span>▶</span>
              </button>
            ) : (
              <div className="text-purple-300 text-sm flex items-center gap-2">
                <span className="animate-pulse">⏳</span>
                <span>等待房主操作...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 最终结算阶段
  if (hidingState.phase === 'final') {
    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-amber-400">
          <h2 className="text-2xl font-bold mb-6 text-center text-amber-300 flex items-center justify-center gap-2">
            <span>🏆</span>
            <span>藏匿结算</span>
            <span>🏆</span>
          </h2>
          <p className="text-center text-lg mb-6 text-purple-200">兜帽男的攻击结束了...</p>

          <div className="space-y-4 mb-6">
            {players.map((player, index) => {
              const hitCount = hidingState.playerHitCounts[player.id] || 0;
              const isPerfect = hitCount === 0;

              return (
                <div key={player.id} className={`p-4 rounded-2xl border-2
                  ${isPerfect ? 'bg-amber-500/20 border-amber-400' : 'bg-white/10 border-purple-400'}`}>
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-3xl">{getPlayerEmoji(index)}</span>
                    <span className="text-lg font-semibold">{player.name}</span>
                    {isPerfect && <span className="ml-2 text-amber-300">🎉 完美躲避！</span>}
                  </div>
                  <div className="text-purple-200 ml-10">
                    被击中：<span className={hitCount > 0 ? 'text-red-400' : 'text-green-400'}>{hitCount}</span> 次
                  </div>
                  <div className="text-purple-200 ml-10">
                    生命值：<span className="text-green-400 font-bold">{player.health}</span>
                    {isPerfect && <span className="text-amber-300 ml-2">(+3奖励)</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => debounceClick(onNextPhase)}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                          hover:from-amber-600 hover:to-orange-600
                          rounded-2xl text-lg font-semibold transition-all
                          shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                          flex items-center gap-2"
              >
                <span>继续</span>
                <span>▶</span>
              </button>
            ) : (
              <div className="text-amber-300 text-sm flex items-center gap-2">
                <span className="animate-pulse">⏳</span>
                <span>等待房主操作...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 结束剧情阶段
  if (hidingState.phase === 'ending') {
    return (
      <div className={`${bgClass} text-white flex flex-col items-center justify-center p-4`}>
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-purple-400">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">🌟</span>
            <p className="text-xl leading-relaxed whitespace-pre-line text-purple-100">
              {storyTexts[currentStoryIndex]}
            </p>
          </div>
          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => debounceClick(currentStoryIndex < storyTexts.length - 1 ? onNextStory : onNextPhase)}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                          hover:from-purple-600 hover:to-indigo-600
                          rounded-2xl text-lg font-semibold transition-all
                          shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                          flex items-center gap-2"
              >
                <span>{currentStoryIndex < storyTexts.length - 1 ? '继续' : '进入下一章'}</span>
                <span>▶</span>
              </button>
            ) : (
              <div className="text-purple-300 text-sm flex items-center gap-2">
                <span className="animate-pulse">⏳</span>
                <span>等待房主操作...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default HidingScreen;
