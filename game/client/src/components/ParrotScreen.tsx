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

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface RoundResult {
  questionId: number;
  questionText: string;
  answers: { playerId: string; characterType: string; answer: string; optionText: string }[];
  isConsistent: boolean;
  bossHealthChange: number;
  playerHealthChanges: { playerId: string; change: number; reason: string }[];
  skillsTriggered: string[];
  message: string;
}

interface ParrotState {
  bossHealth: number;
  bossMaxHealth: number;
  phase: string;
  round: number;
  players: PlayerState[];
  currentQuestion: Question | null;
  answeredPlayers: string[];
  lastRoundResult: RoundResult | null;
}

interface ParrotScreenProps {
  playerId: string;
  state: ParrotState;
  onStartBattle: () => void;
  onSubmitAnswer: (answer: string) => void;
  onNextRound: () => void;
}

const ParrotScreen: React.FC<ParrotScreenProps> = ({
  playerId,
  state,
  onStartBattle,
  onSubmitAnswer,
  onNextRound
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getCharacterName = (type: string) => {
    const names: Record<string, string> = { cat: '猫咪', dog: '狗狗', turtle: '乌龟' };
    return names[type] || '未知';
  };

  // 欢乐小动物园风格 - 绿色主题（鹦鹉）
  const containerClass = "min-h-screen bg-gradient-to-b from-emerald-200 via-green-100 to-teal-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl shadow-xl border-4 border-emerald-300";
  const buttonClass = "px-8 py-3 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 rounded-full text-lg font-bold text-white shadow-lg transition-all hover:scale-105";

  const hasAnswered = state.answeredPlayers.includes(playerId);

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
  if (state.phase === 'victory' || state.bossHealth <= 0) {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-5xl animate-bounce">🎉</div>
        <div className="fixed top-10 right-24 text-4xl animate-pulse">🏆</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8 text-center`}>
          <h1 className="text-4xl font-bold text-emerald-500 mb-6 flex items-center justify-center gap-3">
            <span>🎊</span> 胜利！ <span>🎊</span>
          </h1>
          <p className="text-xl mb-4 text-gray-700">你们击败了百变小鹦！</p>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 mb-6 border-2 border-green-300">
            <p className="text-lg text-green-700">🦜 团队默契满分！你们成功通过了第二关BOSS战！</p>
          </div>
          <p className="text-emerald-600 flex items-center justify-center gap-2">
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
          <p className="text-gray-500">结局1：疯人院</p>
        </div>
      </div>
    );
  }

  // 开场介绍
  if (state.phase === 'intro') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-4 left-6 text-4xl">🦜</div>
        <div className="fixed bottom-8 right-20 text-3xl animate-bounce">❓</div>
        
        <div className={`max-w-2xl w-full ${cardClass} p-8`}>
          <h1 className="text-3xl font-bold text-center mb-6 text-emerald-600 flex items-center justify-center gap-2">
            <span>🦜</span> 第二关 BOSS战：百变小鹦 <span>🦜</span>
          </h1>
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-5 mb-6 border-2 border-emerald-200">
            <p className="text-lg mb-4 text-gray-700">
              掌握多国语言的天才鹦鹉，是这个世界的百鸟之王，哲学家，喜欢提出各种生活上的问题难倒敌人。
            </p>
            <p className="text-lg mb-4 text-gray-700">
              百变小鹦最看重的就是团队默契了，他会向你们提出一些问题，刁钻的小问题。
            </p>
            <div className="border-l-4 border-emerald-400 pl-4 mt-4 bg-white/50 rounded-r-xl py-2">
              <p className="text-green-600 font-bold">✅ 若玩家的选择相同 → 小鹦生命值 -1</p>
              <p className="text-rose-500 font-bold">❌ 若不相同 → 全体玩家生命值 -1</p>
            </div>
          </div>
          <div className="text-center mb-6 bg-rose-50 rounded-xl p-4 border-2 border-rose-200">
            <p className="text-lg font-bold text-rose-600 flex items-center justify-center gap-2">
              <span>🤫</span> 禁止任何形式的沟通！ <span>🤫</span>
            </p>
          </div>
          <div className="flex justify-center">
            <button onClick={onStartBattle} className={buttonClass}>
              📝 开始答题
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
          {/* BOSS状态 */}
          <div className={`${cardClass} p-4 mb-4`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                <span className="text-2xl">🦜</span> 百变小鹦
              </h2>
              <div className="font-bold">❤️ <span className="text-rose-500">{state.bossHealth}</span>/{state.bossMaxHealth}</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-3 rounded-full" 
                   style={{ width: `${(state.bossHealth / state.bossMaxHealth) * 100}%` }} />
            </div>
          </div>

          {/* 答案揭晓 */}
          <div className={`${cardClass} p-6`}>
            <h3 className="text-xl font-bold text-center mb-4 text-emerald-700">🎯 答案揭晓</h3>
            <p className="text-center text-gray-500 mb-6 bg-emerald-50 rounded-xl p-3">{result.questionText}</p>

            {/* 三人答案 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {result.answers.map((ans, idx) => (
                <div key={idx} className={`rounded-2xl p-4 text-center border-3 ${
                  result.isConsistent 
                    ? 'bg-gradient-to-b from-green-50 to-emerald-50 border-green-300' 
                    : 'bg-gradient-to-b from-amber-50 to-orange-50 border-amber-300'
                }`}>
                  <div className="text-4xl mb-2">{getCharacterEmoji(ans.characterType)}</div>
                  <div className="font-bold mb-2 text-gray-700">{getCharacterName(ans.characterType)}</div>
                  <div className={`text-2xl font-bold ${result.isConsistent ? 'text-green-600' : 'text-amber-600'}`}>
                    [{ans.answer}]
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{ans.optionText}</div>
                </div>
              ))}
            </div>

            {/* 结果信息 */}
            <div className={`text-center text-xl font-bold mb-4 p-3 rounded-xl ${
              result.isConsistent 
                ? 'text-green-600 bg-green-50' 
                : 'text-rose-500 bg-rose-50'
            }`}>
              {result.message}
            </div>

            {/* 生命值变化 */}
            {result.bossHealthChange !== 0 && (
              <p className="text-center text-green-600 font-bold">🦜 百变小鹦 {result.bossHealthChange} HP</p>
            )}
            {result.playerHealthChanges.map((change, idx) => (
              <p key={idx} className={`text-center font-bold ${change.change > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                {change.reason}: {change.change > 0 ? '+' : ''}{change.change} HP
              </p>
            ))}

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
              <button
                onClick={() => { setSelectedAnswer(null); onNextRound(); }}
                className={buttonClass}
              >
                下一题 →
              </button>
            </div>
          </div>

          {/* 玩家状态 */}
          <div className={`${cardClass} p-4 mt-4`}>
            <h4 className="font-bold mb-2 text-emerald-700">👥 玩家状态</h4>
            <div className="flex justify-around">
              {state.players.map(player => (
                <div key={player.playerId} className="text-center bg-emerald-50 rounded-xl px-4 py-2">
                  <div className="text-3xl">{getCharacterEmoji(player.characterType)}</div>
                  <div className={`font-bold ${player.isAlive ? 'text-green-600' : 'text-rose-500'}`}>
                    ❤️ {player.health}/{player.maxHealth}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 答题阶段
  if ((state.phase === 'question' || state.phase === 'waiting' || state.phase === 'reveal') && state.currentQuestion) {
    const question = state.currentQuestion;
    const handleSubmit = () => {
      if (selectedAnswer && !hasAnswered) {
        onSubmitAnswer(selectedAnswer);
      }
    };

    return (
      <div className={`${containerClass} p-4`}>
        <div className="max-w-3xl mx-auto">
          {/* BOSS状态 */}
          <div className={`${cardClass} p-4 mb-4`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                <span className="text-2xl">🦜</span> 百变小鹦
              </h2>
              <div className="font-bold">❤️ <span className="text-rose-500">{state.bossHealth}</span>/{state.bossMaxHealth}</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-3 rounded-full" 
                   style={{ width: `${(state.bossHealth / state.bossMaxHealth) * 100}%` }} />
            </div>
          </div>

          {/* 禁止沟通提示 */}
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 mb-4 text-center">
            <span className="text-rose-600 font-bold flex items-center justify-center gap-2">
              <span>🤫</span> 禁止沟通模式 - 请独立思考后作答 <span>🤫</span>
            </span>
          </div>

          {/* 题目 */}
          <div className={`${cardClass} p-6`}>
            <div className="text-center mb-2 text-gray-400">第 {state.round} 题</div>
            <h3 className="text-xl font-bold text-center mb-6 text-emerald-700 bg-emerald-50 rounded-xl p-4">
              {question.text}
            </h3>

            {/* 选项 */}
            <div className="space-y-3 mb-6">
              {question.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedAnswer === letter;
                return (
                  <button
                    key={idx}
                    onClick={() => !hasAnswered && setSelectedAnswer(letter)}
                    disabled={hasAnswered}
                    className={`w-full p-4 rounded-2xl text-left transition-all border-3 ${
                      hasAnswered
                        ? isSelected
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                        : isSelected
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-500 scale-[1.02]'
                          : 'bg-white border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="font-bold mr-2 text-emerald-600">{letter}.</span>
                    <span className="text-gray-700">{option.replace(/^[A-C]\./, '')}</span>
                  </button>
                );
              })}
            </div>

            {/* 提交按钮 */}
            {!hasAnswered ? (
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className={`${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ✅ 确认提交
                </button>
              </div>
            ) : (
              <div className="text-center text-green-600 font-bold flex items-center justify-center gap-2">
                <span>✓</span> 已提交答案，等待其他玩家...
              </div>
            )}
          </div>

          {/* 玩家状态和技能 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className={`${cardClass} p-4`}>
              <h4 className="font-bold mb-2 text-emerald-700">📝 答题状态</h4>
              <div className="flex justify-around">
                {state.players.map(player => {
                  const answered = state.answeredPlayers.includes(player.playerId);
                  return (
                    <div key={player.playerId} className="text-center">
                      <div className="text-3xl">{getCharacterEmoji(player.characterType)}</div>
                      <div className={`text-sm font-bold ${player.isAlive ? 'text-green-600' : 'text-rose-500'}`}>
                        ❤️ {player.health}
                      </div>
                      <div className={`text-sm mt-1 px-2 py-1 rounded-full ${
                        answered ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {answered ? '✓ 已提交' : '等待中...'}
                      </div>
                    </div>
                  );
                })}
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
  }

  return null;
};

export default ParrotScreen;
