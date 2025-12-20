import React, { useState } from 'react';
import TeamStatusPanel, { TeamPlayerState, SkillInfo } from './TeamStatusPanel';

interface PlayerState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  health: number;
  maxHealth: number;
  isAlive: boolean;
  skills?: SkillInfo[];
  items?: SkillInfo[];
}

interface RoundConfig {
  round: number;
  name: string;
  description: string;
  rule: string;
  type: string;
  odds?: number;
  choices?: string[];
  oddsMap?: Record<string, number>;
  noBet?: boolean;
}

interface RoundResult {
  round: number;
  roundName: string;
  bet: number;
  choice?: string;
  diceResults: number[];
  isWin: boolean;
  chipsChange: number;
  skillsTriggered: string[];
  message: string;
  isDeath?: boolean;
}

interface DeathState {
  phase: string;
  round: number;
  maxRounds: number;
  chips: number;
  targetChips: number;
  players: PlayerState[];
  currentRoundConfig: RoundConfig | null;
  lastDiceResult: number;
  currentBet: number;
  currentChoice: string | null;
  lastRoundResult: RoundResult | null;
  roundHistory: RoundResult[];
}

interface DeathScreenProps {
  playerId: string;
  state: DeathState;
  onStartBattle: () => void;
  onSetBet: (amount: number) => void;
  onSetChoice: (choice: string) => void;
  onConfirmBet: () => void;
  onRoll: () => void;
  onNextRound: () => void;
}

const DeathScreen: React.FC<DeathScreenProps> = ({
  playerId: _playerId,
  state,
  onStartBattle,
  onSetBet,
  onSetChoice,
  onConfirmBet,
  onRoll,
  onNextRound
}) => {
  const [betInput, setBetInput] = useState<string>('0');

  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getDiceEmoji = (value: number) => {
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return diceEmojis[value - 1] || '🎲';
  };

  const getCharacterName = (type: string) => {
    const names: Record<string, string> = { cat: '猫咪', dog: '狗狗', turtle: '乌龟' };
    return names[type] || '未知';
  };

  // 欢乐小动物园风格 - 紫色神秘主题（死神）
  const containerClass = "min-h-screen bg-gradient-to-b from-violet-200 via-purple-100 to-indigo-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl shadow-xl border-4 border-violet-300";
  const buttonClass = "px-8 py-3 bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 rounded-full text-lg font-bold text-white shadow-lg transition-all hover:scale-105";

  // 构建队伍状态数据
  const buildTeamPlayers = (): TeamPlayerState[] => {
    return state.players.map(player => ({
      playerId: player.playerId,
      characterType: player.characterType,
      name: getCharacterName(player.characterType),
      health: player.health,
      maxHealth: player.maxHealth,
      isAlive: player.isAlive,
      skills: (player.skills || []).map(s => ({ id: s.id, name: s.name, grade: s.grade, effect: s.effect })),
      items: (player.items || []).map(i => ({ id: i.id, name: i.name, grade: i.grade, effect: i.effect }))
    }));
  };

  // 胜利
  if (state.phase === 'victory' || state.chips > state.targetChips) {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-5xl animate-bounce">🎉</div>
        <div className="fixed top-10 right-24 text-4xl animate-pulse">🏆</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
          <h1 className="text-4xl font-bold text-violet-500 mb-6 flex items-center justify-center gap-3">
            <span>🎊</span> 胜利！ <span>🎊</span>
          </h1>
          <p className="text-xl mb-4 text-gray-700">你们击败了死神！</p>
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-4 mb-6 border-2 border-yellow-300">
            <p className="text-3xl text-amber-600 font-bold">💰 {state.chips} 筹码</p>
            <p className="text-lg text-gray-500">目标：{state.targetChips}</p>
          </div>
          <p className="text-green-600 font-bold text-lg">🌟 成功逃出了这个世界！</p>
        </div>
      </div>
    );
  }

  // 失败
  if (state.phase === 'defeat') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
          <h1 className="text-4xl font-bold text-rose-500 mb-6">💀 失败...</h1>
          <p className="text-xl mb-4 text-gray-700">
            {state.chips <= 0 ? '筹码耗尽...' : '15轮结束，筹码不足...'}
          </p>
          <div className="bg-gradient-to-r from-rose-100 to-red-100 rounded-2xl p-4 mb-6 border-2 border-rose-300">
            <p className="text-3xl text-rose-500 font-bold">💔 {state.chips} 筹码</p>
          </div>
          <p className="text-gray-500 mb-6">结局2：我也永远爱你</p>
          <button
            onClick={onNextRound}
            className={buttonClass}
          >
            📖 查看结局
          </button>
        </div>
      </div>
    );
  }

  // 开场介绍
  if (state.phase === 'intro') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-4 left-6 text-4xl">💀</div>
        <div className="fixed bottom-8 right-20 text-3xl animate-bounce">🎲</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8`}>
          <h1 className="text-3xl font-bold text-center mb-6 text-violet-600 flex items-center justify-center gap-2">
            <span>💀</span> 最终关卡：死神的赌局 <span>💀</span>
          </h1>
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-5 mb-6 border-2 border-violet-200">
            <p className="text-lg mb-4 text-gray-700">
              引路人，带领你们来到这里的人。如果想逃出去，请打败他。
            </p>
            <p className="text-lg mb-4 text-gray-700">
              死神见你们居然挑战他，来了兴趣，决定与你们赌一盘，赌注是你们的生命。
            </p>
            <div className="border-l-4 border-violet-400 pl-4 mt-4 bg-white/50 rounded-r-xl py-2">
              <p className="text-violet-600 font-bold">
                🎯 若在15回合内筹码超过 <span className="text-amber-500 text-xl">1000</span>，则胜利
              </p>
              <p className="text-rose-500 font-bold">💀 超过15回合或筹码归零则失败</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-4 mb-6 border-2 border-yellow-300">
            <p className="text-center text-xl">
              初始筹码：<span className="text-amber-600 font-bold text-2xl">{state.chips}</span>
            </p>
            <p className="text-center text-gray-500 text-sm mt-2">
              （三人生命值总和 + 技能加成）
            </p>
          </div>
          <div className="flex justify-center">
            <button onClick={onStartBattle} className={buttonClass}>
              🎲 开始赌局
            </button>
          </div>
        </div>
      </div>
    );
  }


  // 显示回合结果
  if (state.phase === 'result' && state.lastRoundResult) {
    const result = state.lastRoundResult;
    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto">
          {/* 筹码状态 */}
          <div className={`${cardClass} p-4 mb-4`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-violet-600 flex items-center gap-2">
                <span className="text-2xl">💀</span> 死神的赌局
              </h2>
              <div className="font-bold">第 {state.round} / {state.maxRounds} 轮</div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>💰 筹码</span>
                <span className="font-bold">{state.chips} / {state.targetChips}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${state.chips > state.targetChips ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-yellow-500'}`}
                  style={{ width: `${Math.min(100, (state.chips / state.targetChips) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* 结果展示 */}
          <div className={`${cardClass} p-6`}>
            <h3 className="text-xl font-bold text-center mb-4 text-violet-700">
              第 {result.round} 轮：{result.roundName}
            </h3>

            {/* 骰子结果 */}
            <div className="flex justify-center gap-4 mb-6">
              {result.diceResults.map((dice, idx) => (
                <div key={idx} className="text-7xl drop-shadow-lg">
                  {getDiceEmoji(dice)}
                </div>
              ))}
            </div>

            {/* 判定结果 */}
            <div className={`text-center text-2xl font-bold mb-4 p-4 rounded-2xl ${
              result.isWin 
                ? 'text-green-600 bg-green-50 border-2 border-green-300' 
                : 'text-rose-500 bg-rose-50 border-2 border-rose-300'
            }`}>
              {result.message}
            </div>

            {/* 筹码变化 */}
            {result.chipsChange !== 0 && (
              <p className={`text-center text-xl font-bold ${result.chipsChange > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                💰 筹码 {result.chipsChange > 0 ? '+' : ''}{result.chipsChange}
              </p>
            )}

            {/* 技能触发 */}
            {result.skillsTriggered.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-3 border-yellow-400 rounded-2xl p-4 mt-4 animate-pulse">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-3xl mr-2">⚡</span>
                  <span className="text-xl font-bold text-amber-600">技能触发！</span>
                </div>
                <div className="space-y-2">
                  {result.skillsTriggered.map((skill, idx) => (
                    <div key={idx} className="text-center">
                      <span className="inline-block px-4 py-2 bg-yellow-200 rounded-full text-amber-700 font-bold">
                        ✨ {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <button onClick={onNextRound} className={buttonClass}>
                {state.round >= state.maxRounds ? '查看结果' : '下一轮 →'}
              </button>
            </div>
          </div>

          {/* 历史记录 */}
          {state.roundHistory.length > 1 && (
            <div className={`${cardClass} p-4 mt-4`}>
              <h4 className="font-bold mb-2 text-violet-700">📜 历史记录</h4>
              <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                {state.roundHistory.slice(0, -1).reverse().map((h, idx) => (
                  <div key={idx} className={`py-1 px-3 rounded-lg ${h.isWin ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-500'}`}>
                    第{h.round}轮：{h.roundName} - {h.isWin ? '✓ 胜利' : '✗ 失败'} ({h.chipsChange > 0 ? '+' : ''}{h.chipsChange})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 下注/投掷阶段
  const config = state.currentRoundConfig;
  if (!config) return null;

  const handleBetChange = (value: string) => {
    const num = parseInt(value) || 0;
    setBetInput(value);
    if (num >= 0 && num <= state.chips) {
      onSetBet(num);
    }
  };

  const handleQuickBet = (percentage: number) => {
    const amount = Math.floor(state.chips * percentage);
    setBetInput(amount.toString());
    onSetBet(amount);
  };

  return (
    <div className={`${containerClass} p-4`}>
      <div className="max-w-3xl mx-auto">
        {/* 筹码状态 */}
        <div className={`${cardClass} p-4 mb-4`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-violet-600 flex items-center gap-2">
              <span className="text-2xl">💀</span> 死神的赌局
            </h2>
            <div className="font-bold">第 {state.round} / {state.maxRounds} 轮</div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span>💰 筹码</span>
              <span className="text-amber-600 font-bold text-lg">{state.chips}</span>
              <span>目标：{state.targetChips}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-amber-400 to-yellow-500 h-3 rounded-full"
                style={{ width: `${Math.min(100, (state.chips / state.targetChips) * 100)}%` }} 
              />
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">
              还差 <span className="text-violet-600 font-bold">{Math.max(0, state.targetChips - state.chips + 1)}</span> 筹码
            </p>
          </div>
        </div>

        {/* 第11轮警告 */}
        {state.round === 11 && (
          <div className="bg-rose-100 border-3 border-rose-400 rounded-2xl p-4 mb-4 text-center animate-pulse">
            <span className="text-rose-600 font-bold text-lg flex items-center justify-center gap-2">
              <span>⚠️</span> 死亡轮！投出4点将直接死亡！ <span>⚠️</span>
            </span>
          </div>
        )}

        {/* 本轮规则 */}
        <div className={`${cardClass} p-6 mb-4`}>
          <h3 className="text-xl font-bold text-center mb-2 text-violet-700">
            第 {state.round} 轮：{config.name}
          </h3>
          <p className="text-center text-gray-600 mb-2">{config.description}</p>
          <p className="text-center text-sm text-violet-500 bg-violet-50 rounded-xl p-2">{config.rule}</p>
          
          {config.odds && (
            <p className="text-center text-amber-600 font-bold mt-3">赔率：×{config.odds}</p>
          )}
          {config.oddsMap && (
            <div className="text-center text-amber-600 font-bold mt-3">
              {Object.entries(config.oddsMap).map(([k, v]) => (
                <span key={k} className="mx-2 bg-amber-50 px-3 py-1 rounded-full">{k}:×{v}</span>
              ))}
            </div>
          )}
        </div>

        {/* 下注区域 */}
        {state.phase === 'betting' && !config.noBet && (
          <div className={`${cardClass} p-6 mb-4`}>
            <h4 className="font-bold mb-4 text-center text-violet-700">💰 下注金额</h4>
            
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              <button onClick={() => handleQuickBet(0)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold">0</button>
              <button onClick={() => handleQuickBet(0.1)} className="px-4 py-2 bg-violet-100 hover:bg-violet-200 rounded-full text-sm font-bold text-violet-700">10%</button>
              <button onClick={() => handleQuickBet(0.25)} className="px-4 py-2 bg-violet-100 hover:bg-violet-200 rounded-full text-sm font-bold text-violet-700">25%</button>
              <button onClick={() => handleQuickBet(0.5)} className="px-4 py-2 bg-violet-100 hover:bg-violet-200 rounded-full text-sm font-bold text-violet-700">50%</button>
              <button onClick={() => handleQuickBet(1)} className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full text-sm font-bold text-white">全押</button>
            </div>

            <input
              type="number"
              value={betInput}
              onChange={(e) => handleBetChange(e.target.value)}
              min={0}
              max={state.chips}
              className="w-full p-4 bg-violet-50 rounded-2xl text-center text-2xl font-bold border-2 border-violet-300 focus:border-violet-500 focus:outline-none"
            />
            <p className="text-center text-sm text-gray-500 mt-2">
              可下注：0 - {state.chips}
            </p>

            {/* 选择区域 */}
            {config.choices && (
              <div className="mt-6">
                <h4 className="font-bold mb-3 text-center text-violet-700">🎯 选择</h4>
                <div className="flex justify-center gap-3 flex-wrap">
                  {config.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => onSetChoice(choice)}
                      className={`px-6 py-3 rounded-2xl font-bold transition-all border-3 ${
                        state.currentChoice === choice
                          ? 'bg-gradient-to-r from-violet-400 to-purple-500 text-white border-violet-600 scale-105'
                          : 'bg-white border-violet-200 hover:border-violet-400 text-violet-700'
                      }`}
                    >
                      {choice}
                      {config.oddsMap && <span className="text-sm ml-1 opacity-80">(×{config.oddsMap[choice]})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <button
                onClick={onConfirmBet}
                disabled={config.choices && !state.currentChoice}
                className={`${buttonClass} disabled:opacity-50`}
              >
                ✅ 确认下注
              </button>
            </div>
          </div>
        )}

        {/* 投掷阶段 */}
        {state.phase === 'rolling' && (
          <div className={`${cardClass} p-6 mb-4 text-center`}>
            {!config.noBet && (
              <p className="text-xl mb-4 text-gray-700">
                下注：<span className="text-amber-600 font-bold">{state.currentBet}</span>
                {state.currentChoice && <span className="ml-3">选择：<span className="text-violet-600 font-bold">{state.currentChoice}</span></span>}
              </p>
            )}
            <div className="flex justify-center">
              <button onClick={onRoll} className="px-12 py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-full text-xl font-bold text-white shadow-lg animate-pulse hover:animate-none hover:scale-110 transition-all">
                🎲 投掷骰子
              </button>
            </div>
          </div>
        )}

        {/* 玩家状态和技能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${cardClass} p-4`}>
            <h4 className="font-bold mb-2 text-violet-700">👥 玩家状态</h4>
            <div className="flex justify-around">
              {state.players.map(player => (
                <div key={player.playerId} className="text-center bg-violet-50 rounded-xl px-4 py-2">
                  <div className="text-3xl">{getCharacterEmoji(player.characterType)}</div>
                  <div className="text-sm text-gray-500">
                    ❤️ {player.health}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <TeamStatusPanel 
            players={buildTeamPlayers()} 
            showHealth={true}
          />
        </div>
      </div>
    </div>
  );
};

export default DeathScreen;
