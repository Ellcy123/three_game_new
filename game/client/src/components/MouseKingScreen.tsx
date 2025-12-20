import React, { useState } from 'react';
import TeamStatusPanel, { TeamPlayerState, SkillInfo } from './TeamStatusPanel';

interface PlayerState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isActive: boolean;
  skills?: SkillInfo[];
  items?: SkillInfo[];
}

interface MouseKingState {
  bossHealth: number;
  bossMaxHealth: number;
  phase: string;
  round: number;
  players: PlayerState[];
  currentPlayerId: string | null;
  excludedHoles: number[];
  canSelectMultiple: boolean;
  multiSelectCount: number;
  lastHoleResult: {
    holeIndex: number;
    content: string;
    damage: number;
    message: string;
  } | null;
}

// 技能触发信息
interface SkillTriggerInfo {
  name: string;
  effect: string;
  owner: 'cat' | 'dog' | 'turtle' | 'system';
  ownerName?: string;
}

interface AttackResult {
  success: boolean;
  holeIndex: number;
  content: string;
  contentName: string;
  damage: number;
  message: string;
  healthChanges: { playerId: string; change: number; reason: string }[];
  bossHealthChange: number;
  skillsTriggered: SkillTriggerInfo[];
}

interface MouseKingScreenProps {
  playerId: string;
  state: MouseKingState;
  onSelectFighter: (playerId: string) => void;
  onAttackHole: (holeIndex: number) => void;
  onNextRound: () => void;
  onStartBattle: () => void;
  lastResult: AttackResult | null;
}

const MouseKingScreen: React.FC<MouseKingScreenProps> = ({
  playerId,
  state,
  onSelectFighter,
  onAttackHole,
  onNextRound,
  onStartBattle,
  lastResult
}) => {
  const [selectedHoles, setSelectedHoles] = useState<number[]>([]);

  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getCharacterName = (type: string) => {
    const names: Record<string, string> = { cat: '猫咪', dog: '狗狗', turtle: '乌龟' };
    return names[type] || '未知';
  };

  // 欢乐小动物园风格
  const containerClass = "min-h-screen bg-gradient-to-b from-amber-200 via-yellow-100 to-orange-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl shadow-xl border-4 border-amber-300";
  const buttonClass = "px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 rounded-full text-lg font-bold text-white shadow-lg transition-all hover:scale-105";

  // 构建队伍状态数据
  const buildTeamPlayers = (): TeamPlayerState[] => {
    return state.players.map(player => ({
      playerId: player.playerId,
      characterType: player.characterType,
      name: getCharacterName(player.characterType),
      health: player.health,
      maxHealth: player.maxHealth,
      isAlive: player.isAlive,
      isActive: player.isActive,
      skills: (player.skills || []).map(s => ({ id: s.id, name: s.name, grade: s.grade, effect: s.effect })),
      items: (player.items || []).map(i => ({ id: i.id, name: i.name, grade: i.grade, effect: i.effect }))
    }));
  };

  const currentPlayer = state.players.find(p => p.isActive);
  const isMyTurn = currentPlayer?.playerId === playerId;

  const handleHoleClick = (index: number) => {
    if (!isMyTurn || state.phase !== 'select_hole') return;
    if (state.excludedHoles.includes(index)) return;

    if (state.canSelectMultiple) {
      if (selectedHoles.includes(index)) {
        setSelectedHoles(selectedHoles.filter(h => h !== index));
      } else if (selectedHoles.length < state.multiSelectCount) {
        setSelectedHoles([...selectedHoles, index]);
      }
    } else {
      onAttackHole(index);
    }
  };

  const handleConfirmAttack = () => {
    if (selectedHoles.length > 0) {
      selectedHoles.forEach(hole => onAttackHole(hole));
      setSelectedHoles([]);
    }
  };

  // 胜利
  if (state.phase === 'victory' || state.bossHealth <= 0) {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-5xl animate-bounce">🎉</div>
        <div className="fixed top-10 right-24 text-4xl animate-pulse">🏆</div>
        <div className="fixed bottom-12 left-12 text-3xl">🌟</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
          <h1 className="text-4xl font-bold text-amber-500 mb-6 flex items-center justify-center gap-3">
            <span>🎊</span> 胜利！ <span>🎊</span>
          </h1>
          <p className="text-xl mb-4 text-gray-700">你们击败了鼠鼠大王！</p>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 mb-6 border-2 border-green-300">
            <p className="text-lg text-green-700">🐀 鼠鼠大王被打败了，你们成功通过了第一关BOSS战！</p>
          </div>
          <p className="text-amber-600 flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            准备进入下一关...
          </p>
        </div>
      </div>
    );
  }

  // 失败
  if (state.phase === 'defeat' || state.players.every(p => !p.isAlive)) {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
          <h1 className="text-4xl font-bold text-rose-500 mb-6">💀 失败...</h1>
          <p className="text-xl mb-4 text-gray-700">你们全部阵亡了...</p>
          <p className="text-gray-500">结局0：死于鼠鼠大王</p>
        </div>
      </div>
    );
  }

  // 开场介绍
  if (state.phase === 'intro') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-4 left-6 text-4xl">🐀</div>
        <div className="fixed bottom-8 right-20 text-3xl animate-bounce">🕳️</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8`}>
          <h1 className="text-3xl font-bold text-center mb-6 text-amber-600 flex items-center justify-center gap-2">
            <span>🐀</span> 第一关 BOSS战：鼠鼠大王 <span>🐀</span>
          </h1>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 mb-6 border-2 border-amber-200">
            <p className="text-lg mb-4 text-gray-700">
              鼠鼠大王拥有良好的教养，并不会使用暴力。他在你们面前挖了五个大洞，
              每个洞都有鼠鼠大王珍藏的道具与陷阱，鼠鼠大王也藏在其中。
            </p>
            <p className="text-amber-600 font-bold">🎯 请选择洞口进行攻击！</p>
          </div>
          <div className="text-center text-gray-500 mb-6 bg-rose-50 rounded-xl p-3 border border-rose-200">
            <span>⚠️</span> 其他两位笨蛋玩家不小心陷入洞中，请小心误伤队友。
          </div>
          <div className="flex justify-center">
            <button onClick={onStartBattle} className={buttonClass}>
              ⚔️ 开始战斗
            </button>
          </div>
        </div>
      </div>
    );
  }


  // 选择出战玩家阶段
  if (state.phase === 'select_player') {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          {/* BOSS状态 */}
          <div className={`${cardClass} p-4 mb-6`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                <span className="text-2xl">🐀</span> 鼠鼠大王
              </h2>
              <div className="text-lg font-bold">
                ❤️ <span className="text-rose-500">{state.bossHealth}</span>/{state.bossMaxHealth}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-rose-400 to-red-500 h-4 rounded-full transition-all"
                style={{ width: `${(state.bossHealth / state.bossMaxHealth) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 左侧：队伍状态面板 */}
            <div className="md:col-span-1">
              <TeamStatusPanel 
                players={buildTeamPlayers()} 
                currentPlayerId={state.currentPlayerId || undefined}
                showHealth={true}
              />
            </div>

            {/* 右侧：选择出战 */}
            <div className={`md:col-span-2 ${cardClass} p-6`}>
              <h3 className="text-xl font-bold text-center mb-6 text-amber-700 flex items-center justify-center gap-2">
                <span>⚔️</span> 选择出战玩家 <span>⚔️</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {state.players.map(player => {
                  const canFight = player.isAlive && 
                    (player.characterType !== 'dog' || 
                     !state.players.some(p => p.characterType !== 'dog' && p.isAlive));
                  
                  return (
                    <button
                      key={player.playerId}
                      onClick={() => canFight && onSelectFighter(player.playerId)}
                      disabled={!canFight}
                      className={`p-5 rounded-2xl border-3 transition-all ${
                        !player.isAlive 
                          ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                          : canFight
                            ? 'bg-gradient-to-b from-amber-50 to-orange-50 border-amber-300 hover:border-orange-400 hover:shadow-lg hover:scale-105 cursor-pointer'
                            : 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-5xl text-center mb-3">
                        {getCharacterEmoji(player.characterType)}
                      </div>
                      <div className="text-center font-bold text-gray-700">
                        {getCharacterName(player.characterType)}
                      </div>
                      <div className="text-center text-sm mt-2">
                        {player.isAlive ? (
                          <span className="text-green-600 font-bold">❤️ {player.health}/{player.maxHealth}</span>
                        ) : (
                          <span className="text-rose-500">💀 已阵亡</span>
                        )}
                      </div>
                      {player.characterType === 'dog' && !canFight && player.isAlive && (
                        <div className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-full px-2 py-1">
                          🐶 多管闲事：不可出战
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示攻击结果
  if (lastResult) {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${cardClass} p-8`}>
          <h2 className="text-2xl font-bold text-center mb-6 text-amber-700">🎯 攻击结果</h2>
          
          <div className="text-center mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
            <p className="text-lg text-gray-600">你选择了洞口 {lastResult.holeIndex + 1}...</p>
            <p className="text-2xl font-bold mt-4 text-amber-600">{lastResult.contentName}！</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 mb-6 border-2 border-gray-200">
            <p className="text-lg text-gray-700">{lastResult.message}</p>
            {lastResult.bossHealthChange !== 0 && (
              <p className="text-rose-500 mt-2 font-bold">
                🐀 鼠鼠大王 {lastResult.bossHealthChange > 0 ? '+' : ''}{lastResult.bossHealthChange} HP
              </p>
            )}
            {lastResult.healthChanges.map((change, idx) => (
              <p key={idx} className={`font-bold ${change.change > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                {change.reason}: {change.change > 0 ? '+' : ''}{change.change} HP
              </p>
            ))}
          </div>
          
          {/* 技能触发显示 */}
          {lastResult.skillsTriggered.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-3 border-yellow-400 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center mb-3">
                <span className="text-3xl mr-2">⚡</span>
                <span className="text-xl font-bold text-amber-600">技能触发！</span>
              </div>
              <div className="space-y-3">
                {lastResult.skillsTriggered.map((skill, idx) => (
                  <div key={idx} className="bg-white/80 rounded-xl p-3 border-2 border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <span>{skill.owner === 'cat' ? '😺' : skill.owner === 'dog' ? '🐶' : skill.owner === 'turtle' ? '🐸' : '⚡'}</span>
                        【{skill.name}】
                      </span>
                      {skill.ownerName && (
                        <span className="text-xs px-2 py-1 bg-amber-100 rounded-full text-amber-600">
                          {skill.ownerName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{skill.effect}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-center">
            <button onClick={onNextRound} className={buttonClass}>继续 →</button>
          </div>
        </div>
      </div>
    );
  }

  // 选择洞口阶段
  if (state.phase === 'select_hole') {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          {/* BOSS状态 */}
          <div className={`${cardClass} p-4 mb-4`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                <span className="text-2xl">🐀</span> 鼠鼠大王
              </h2>
              <div className="font-bold">❤️ <span className="text-rose-500">{state.bossHealth}</span>/{state.bossMaxHealth}</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div className="bg-gradient-to-r from-rose-400 to-red-500 h-3 rounded-full" 
                   style={{ width: `${(state.bossHealth / state.bossMaxHealth) * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 左侧：队伍状态面板 */}
            <div className="md:col-span-1">
              <TeamStatusPanel 
                players={buildTeamPlayers()} 
                currentPlayerId={currentPlayer?.playerId}
                showHealth={true}
              />
            </div>

            {/* 右侧：战斗区域 */}
            <div className="md:col-span-2">
              {/* 当前出战玩家 */}
              <div className={`${cardClass} p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-2">{getCharacterEmoji(currentPlayer?.characterType || '')}</span>
                    <span className="font-bold text-lg">{getCharacterName(currentPlayer?.characterType || '')} 出战中</span>
                  </div>
                  <div className="font-bold text-green-600">❤️ {currentPlayer?.health}/{currentPlayer?.maxHealth}</div>
                </div>
                {currentPlayer?.characterType === 'cat' && (
                  <div className="text-sm text-amber-600 mt-2 bg-amber-50 rounded-full px-3 py-1 inline-block">
                    😺 天敌克制：对鼠鼠大王伤害+1
                  </div>
                )}
                {currentPlayer?.characterType === 'turtle' && (
                  <div className="text-sm text-orange-600 mt-2 bg-orange-50 rounded-full px-3 py-1 inline-block">
                    🐸 师傅压制：对鼠鼠大王伤害减半
                  </div>
                )}
              </div>
              
              {/* 洞口选择 */}
              <div className={`${cardClass} p-6`}>
                <h3 className="text-xl font-bold text-center mb-2 text-amber-700">第 {state.round} 回合</h3>
                <p className="text-center text-gray-500 mb-6">
                  {isMyTurn ? '🎯 选择一个洞口进行攻击' : `⏳ 等待 ${getCharacterName(currentPlayer?.characterType || '')} 选择...`}
                </p>
                
                <div className="flex justify-center gap-4 mb-6">
                  {[0, 1, 2, 3, 4].map(index => {
                    const isExcluded = state.excludedHoles.includes(index);
                    const isSelected = selectedHoles.includes(index);
                    return (
                      <button key={index} onClick={() => handleHoleClick(index)} disabled={!isMyTurn || isExcluded}
                        className={`w-16 h-16 rounded-full border-4 text-2xl font-bold transition-all ${
                          isExcluded 
                            ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                            : isSelected 
                              ? 'bg-gradient-to-b from-amber-300 to-orange-400 border-orange-500 text-white scale-110'
                              : isMyTurn 
                                ? 'bg-gradient-to-b from-amber-100 to-orange-100 border-amber-400 hover:border-orange-500 hover:scale-110 cursor-pointer'
                                : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                        }`}>
                        {isExcluded ? '✕' : index + 1}
                      </button>
                    );
                  })}
                </div>
                
                {state.excludedHoles.length > 0 && (
                  <p className="text-center text-sm text-green-600 mb-4 bg-green-50 rounded-full px-4 py-2 inline-block mx-auto">
                    ⚡ 技能效果：洞口 {state.excludedHoles.map(i => i + 1).join(', ')} 已被排除
                  </p>
                )}
                
                {state.canSelectMultiple && isMyTurn && (
                  <div className="text-center">
                    <p className="text-amber-600 mb-2">⚡ 可选择 {state.multiSelectCount} 个洞口 (已选: {selectedHoles.length})</p>
                    <button onClick={handleConfirmAttack} disabled={selectedHoles.length === 0} 
                      className={`${buttonClass} disabled:opacity-50`}>
                      确认攻击
                    </button>
                  </div>
                )}
              </div>
              
              {/* 队友状态 */}
              <div className={`${cardClass} p-4 mt-4`}>
                <h4 className="font-bold mb-2 text-amber-700">🕳️ 队友状态（洞中）</h4>
                <div className="flex gap-6">
                  {state.players.filter(p => !p.isActive).map(player => (
                    <div key={player.playerId} className="flex items-center bg-amber-50 rounded-full px-4 py-2">
                      <span className="text-2xl mr-2">{getCharacterEmoji(player.characterType)}</span>
                      <span className={`font-bold ${player.isAlive ? 'text-green-600' : 'text-rose-500'}`}>
                        {player.health}/{player.maxHealth}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MouseKingScreen;
