import React from 'react';
import TeamStatusPanel, { TeamPlayerState } from './TeamStatusPanel';

interface StoryReward {
  type: 'skill' | 'item' | 'form' | 'none';
  id?: string;
  name: string;
  grade: string;
  effect: string;
  healthBonus?: number;
  specialEffect?: string;
}

interface StoryOption {
  text: string;
  story: string[];
  reward?: StoryReward;
  rewards?: StoryReward[]; // 支持多奖励
}

interface StoryChoice {
  title: string;
  story: string[];
  options: Record<string, StoryOption>;
}

interface PlayerStoryState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  branch: string | null;
  branchName: string | null;
  currentChoiceIndex: number;
  choices: string[];
  skills: StoryReward[];
  items: StoryReward[];
  forms: StoryReward[];
  transformerForm: string | null;
  completed: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
  health: number;
}

interface StoryScreenProps {
  playerId: string;
  players: PlayerInfo[];
  storyState: {
    phase: string;
    currentPlayerIndex: number;
    playerStates: PlayerStoryState[];
    currentStoryTexts: string[];
    currentStoryIndex: number;
    currentChoice: StoryChoice | null;
    selectedOption: string | null;
  };
  onNextStory: () => void;
  onSelectBranch: (branch: string) => void;
  onMakeChoice: (option: string) => void;
  onNextPhase: () => void;
}

const StoryScreen: React.FC<StoryScreenProps> = ({
  playerId,
  players,
  storyState,
  onNextStory,
  onSelectBranch,
  onMakeChoice,
  onNextPhase,
}) => {
  const currentPlayerState = storyState.playerStates?.[storyState.currentPlayerIndex];
  const isMyTurn = currentPlayerState?.playerId === playerId;
  
  // 如果 playerStates 为空或 currentPlayerState 不存在，显示加载状态
  if (!storyState.playerStates || storyState.playerStates.length === 0 || !currentPlayerState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📖</div>
          <p className="text-amber-700 text-lg font-medium">正在加载剧情...</p>
        </div>
      </div>
    );
  }
  
  
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '未知';
  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'B': 'text-gray-500', 'A': 'text-sky-500', 'S': 'text-violet-500',
      'SS': 'text-amber-500', 'SSS': 'text-orange-500', 'SSSS': 'text-rose-500', 'SSSSS': 'text-pink-500'
    };
    return colors[grade] || 'text-gray-700';
  };

  const getBranchOptions = (characterType: string) => {
    if (characterType === 'cat') {
      return [
        { key: 'A', title: '打铁还需自身硬，你决定学习功夫', subtitle: '拜师学艺，成为武林高手！', emoji: '🥋' },
        { key: 'B', title: '有钱能使鬼推磨，你决定自主创业', subtitle: '白手起家，成为商业大亨！', emoji: '💼' },
        { key: 'C', title: '加入光荣的进化吧，你决定改造身体', subtitle: '科技改造，成为超级猫咪！', emoji: '🤖' }
      ];
    } else if (characterType === 'dog') {
      return [
        { key: 'A', title: '打铁还需自身硬，你决定寻仙问道', subtitle: '游历名山大川，寻找世外高人！', emoji: '🏔️' },
        { key: 'B', title: '加入光荣的进化吧，你决定第三类接触', subtitle: '探索未知，接触外星科技！', emoji: '🛸' },
        { key: 'C', title: '有钱能使鬼推磨，你决定自主创业', subtitle: '...狗狗对创业没有兴趣。', disabled: true, emoji: '💤' }
      ];
    } else if (characterType === 'turtle') {
      return [
        { key: 'A', title: '打铁还需自身硬，你决定学习功夫', subtitle: '拜师学艺，成为武林高手！', emoji: '🥷' },
        { key: 'B', title: '加入光荣的进化吧，你决定改造身体', subtitle: '科技改造，成为超级乌龟！', emoji: '🔧' },
        { key: 'C', title: '有钱能使鬼推磨，你决定自主创业', subtitle: '白手起家...等等，你哪来的本金？', emoji: '💰' }
      ];
    }
    return [];
  };

  // 基础容器样式 - 欢乐小动物园风格
  const containerClass = "min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100 text-gray-800";
  const cardClass = "bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl border-4 border-amber-300";
  const buttonClass = "px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 rounded-full text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl";

  // 开场剧情
  if (storyState.phase === 'intro' || storyState.phase === 'turn_intro') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        {/* 装饰元素 */}
        <div className="fixed top-4 left-4 text-4xl animate-bounce">🌟</div>
        <div className="fixed top-8 right-20 text-3xl animate-pulse">✨</div>
        <div className="fixed bottom-8 left-8 text-3xl">🌻</div>
        <div className="fixed bottom-12 right-24 text-2xl animate-bounce delay-100">🦋</div>
        
        <div className={`max-w-2xl w-full ${cardClass}`}>
          {/* 标题装饰 */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="text-3xl">📖</span>
            <span className="text-2xl font-bold text-amber-600">第三幕：成长之路</span>
            <span className="text-3xl">📖</span>
          </div>
          
          <div className="text-center mb-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
            <p className="text-xl leading-relaxed whitespace-pre-line text-gray-700">
              {storyState.currentStoryTexts[storyState.currentStoryIndex]}
            </p>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={storyState.currentStoryIndex < storyState.currentStoryTexts.length - 1 ? onNextStory : onNextPhase}
              className={buttonClass}
            >
              {storyState.currentStoryIndex < storyState.currentStoryTexts.length - 1 ? '继续 →' : 
                storyState.phase === 'intro' ? '🎬 准备好了' : `开始${getCharacterEmoji(currentPlayerState?.characterType)}的故事`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 构建队伍状态数据
  const buildTeamPlayers = (): TeamPlayerState[] => {
    return storyState.playerStates.map(ps => {
      const playerInfo = players.find(p => p.id === ps.playerId);
      return {
        playerId: ps.playerId,
        characterType: ps.characterType,
        name: playerInfo?.name || getPlayerName(ps.playerId),
        health: playerInfo?.health || 8,
        maxHealth: 10,
        isAlive: true,
        skills: ps.skills.map(s => ({ id: s.id, name: s.name, grade: s.grade, effect: s.effect })),
        items: ps.items.map(i => ({ id: i.id, name: i.name, grade: i.grade, effect: i.effect }))
      };
    });
  };

  // 分支选择
  if (storyState.phase === 'branch_select') {
    const playerName = getPlayerName(currentPlayerState.playerId);
    return (
      <div className={`${containerClass} p-4`}>
        {/* 装饰 */}
        <div className="fixed top-4 left-4 text-4xl">🌈</div>
        <div className="fixed bottom-8 right-24 text-3xl animate-bounce">🎯</div>
        
        <div className="max-w-4xl mx-auto">
          {/* 队伍状态面板 - 顶部紧凑模式 */}
          <div className="mb-4">
            <TeamStatusPanel 
              players={buildTeamPlayers()} 
              currentPlayerId={currentPlayerState.playerId}
              compact={true}
            />
          </div>

          {/* 观看状态 */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 border-3 border-sky-300 shadow-lg">
            <div className="text-center mb-3">
              <span className="text-xl">🎭</span>
              <span className="text-amber-600 font-bold ml-2">现在是 {playerName} 的个人剧情时间</span>
              <span className="text-xl ml-2">🎭</span>
            </div>
            <div className="flex justify-center gap-6">
              {storyState.playerStates.map((ps, idx) => (
                <div key={ps.playerId} className={`flex items-center px-4 py-2 rounded-full ${
                  idx === storyState.currentPlayerIndex 
                    ? 'bg-gradient-to-r from-amber-200 to-orange-200 border-2 border-amber-400' 
                    : 'bg-gray-100'
                }`}>
                  <span className="text-2xl mr-2">{getCharacterEmoji(ps.characterType)}</span>
                  <span className={idx === storyState.currentPlayerIndex ? 'text-amber-700 font-bold' : 'text-gray-500'}>
                    {getPlayerName(ps.playerId)}
                  </span>
                  <span className="ml-2 text-sm">
                    {idx === storyState.currentPlayerIndex ? '🎬' : '👀'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 分支选择 */}
          <div className={cardClass}>
            <h2 className="text-2xl font-bold text-center mb-6 text-amber-700">
              <span className="text-3xl mr-2">{getCharacterEmoji(currentPlayerState.characterType)}</span>
              {playerName}，请选择你的修炼道路：
            </h2>
            <div className="space-y-4">
              {getBranchOptions(currentPlayerState.characterType).map(branch => (
                <button key={branch.key} 
                  onClick={() => isMyTurn && !branch.disabled && onSelectBranch(branch.key)} 
                  disabled={!isMyTurn || branch.disabled}
                  className={`w-full p-5 rounded-2xl border-3 text-left transition-all ${
                    branch.disabled 
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' 
                      : isMyTurn 
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 hover:border-orange-400 hover:shadow-lg hover:scale-[1.02] cursor-pointer' 
                        : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-70'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{branch.emoji}</span>
                    <div>
                      <div className="font-bold text-lg text-gray-800">{branch.key}. {branch.title}</div>
                      <div className={`text-sm mt-1 ${branch.disabled ? 'text-gray-400' : 'text-amber-600'}`}>
                        "{branch.subtitle}"
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {!isMyTurn ? (
              <p className="text-center text-amber-600 mt-6 flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                等待 {playerName} 做出选择...
              </p>
            ) : (
              <p className="text-center text-green-600 mt-6 flex items-center justify-center gap-2">
                <span>👆</span>
                轮到你了，请选择一个选项！
              </p>
            )}

          </div>
        </div>
      </div>
    );
  }


  // 分支剧情
  if (storyState.phase === 'branch_story') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-6 text-3xl animate-pulse">🌟</div>
        <div className="fixed bottom-10 right-28 text-2xl">🍃</div>
        
        {/* 队伍状态面板 - 顶部 */}
        <div className="w-full max-w-2xl mb-4">
          <TeamStatusPanel 
            players={buildTeamPlayers()} 
            currentPlayerId={currentPlayerState.playerId}
            compact={true}
          />
        </div>
        
        <div className={`max-w-2xl w-full ${cardClass}`}>
          <div className="text-center mb-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
            <p className="text-xl leading-relaxed whitespace-pre-line text-gray-700">
              {storyState.currentStoryTexts[storyState.currentStoryIndex]}
            </p>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={storyState.currentStoryIndex < storyState.currentStoryTexts.length - 1 ? onNextStory : onNextPhase}
              className={buttonClass}
            >
              继续 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 选择点
  if (storyState.phase === 'choice' && storyState.currentChoice) {
    const choice = storyState.currentChoice;
    
    const checkRequirement = (option: any): { hasRequirement: boolean; isMet: boolean; message?: string } => {
      if (!option.requires) return { hasRequirement: false, isMet: true };
      const hasSkill = currentPlayerState.skills.some(s => s.id === option.requires);
      return { hasRequirement: true, isMet: hasSkill, message: option.requiresMessage };
    };
    
    return (
      <div className={`${containerClass} p-4`}>
        <div className="fixed top-4 right-20 text-3xl animate-bounce">❓</div>
        
        <div className="max-w-3xl mx-auto">
          {/* 队伍状态面板 - 顶部 */}
          <div className="mb-4">
            <TeamStatusPanel 
              players={buildTeamPlayers()} 
              currentPlayerId={currentPlayerState.playerId}
              compact={true}
            />
          </div>
          
          <div className={`${cardClass} mb-6`}>
            <h2 className="text-2xl font-bold text-center mb-4 text-amber-700 flex items-center justify-center gap-2">
              <span>🎯</span> {choice.title} <span>🎯</span>
            </h2>
            {choice.story.map((text, idx) => (
              <p key={idx} className="text-lg text-center mb-2 text-gray-700">{text}</p>
            ))}
          </div>
          
          <div className="space-y-3">
            {Object.entries(choice.options).map(([key, option]) => {
              const req = checkRequirement(option);
              const isDisabled = !isMyTurn || (req.hasRequirement && !req.isMet);
              return (
                <button key={key} 
                  onClick={() => isMyTurn && !isDisabled && onMakeChoice(key)} 
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-2xl border-3 text-left transition-all ${
                    isDisabled 
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:border-green-500 hover:shadow-lg hover:scale-[1.01]'
                  }`}>
                  <span className="font-bold text-green-700">{key}. </span>
                  <span className="text-gray-700">{option.text}</span>
                  {req.hasRequirement && !req.isMet && (
                    <div className="text-sm text-rose-500 mt-2 flex items-center gap-1">
                      <span>⚠️</span> {req.message || '缺少前置技能'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {!isMyTurn && (
            <p className="text-center text-amber-600 mt-6 flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              等待玩家做出选择...
            </p>
          )}
        </div>
      </div>
    );
  }

  // 选择结果
  if (storyState.phase === 'choice_result' && storyState.currentChoice && storyState.selectedOption) {
    const option = storyState.currentChoice.options[storyState.selectedOption];
    // 支持多奖励和单奖励
    const rewards = option.rewards || (option.reward ? [option.reward] : []);
    
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-6 left-8 text-4xl animate-bounce">🎉</div>
        <div className="fixed bottom-10 right-20 text-3xl">🌟</div>
        
        {/* 队伍状态面板 - 顶部 */}
        <div className="w-full max-w-2xl mb-4">
          <TeamStatusPanel 
            players={buildTeamPlayers()} 
            currentPlayerId={currentPlayerState.playerId}
            compact={true}
          />
        </div>
        
        <div className={`max-w-2xl w-full ${cardClass}`}>
          <div className="text-center mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
            {option.story.map((text, idx) => (
              <p key={idx} className="text-lg mb-2 text-gray-700">{text}</p>
            ))}
          </div>
          
          {rewards.length > 0 && rewards.some(r => r.type !== 'none') && (
            <div className="space-y-3 mb-6">
              {rewards.filter(r => r.type !== 'none').map((reward, idx) => (
                <div key={idx} className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-5 border-3 border-yellow-400 shadow-lg animate-pulse">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-3xl">✨</span>
                      <span className={`text-xl font-bold ${getGradeColor(reward.grade)}`}>
                        {reward.type === 'form' ? '获得' : '领悟'} {reward.grade}级
                        {reward.type === 'skill' ? '技能' : reward.type === 'item' ? '道具' : '形态'}：【{reward.name}】
                      </span>
                      <span className="text-3xl">✨</span>
                    </div>
                    <p className="text-gray-600 mt-2">效果：{reward.effect}</p>
                    {reward.healthBonus && (
                      <p className="text-green-600 mt-1 font-bold">❤️ 生命值 +{reward.healthBonus}</p>
                    )}
                    {reward.specialEffect === 'maxHealth1' && (
                      <p className="text-rose-500 mt-1 font-bold">⚠️ 生命值上限固定为1（最终关卡解除）</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-center">
            <button onClick={onNextPhase} className={buttonClass}>继续 →</button>
          </div>
        </div>
      </div>
    );
  }

  // 结束剧情
  if (storyState.phase === 'ending') {
    return (
      <div className={`${containerClass} flex flex-col items-center justify-center p-4`}>
        <div className="fixed top-8 right-24 text-3xl animate-pulse">🌙</div>
        
        {/* 队伍状态面板 - 顶部 */}
        <div className="w-full max-w-2xl mb-4">
          <TeamStatusPanel 
            players={buildTeamPlayers()} 
            currentPlayerId={currentPlayerState.playerId}
            compact={true}
          />
        </div>
        
        <div className={`max-w-2xl w-full ${cardClass}`}>
          <div className="text-center mb-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
            <p className="text-xl leading-relaxed whitespace-pre-line text-gray-700">
              {storyState.currentStoryTexts[storyState.currentStoryIndex]}
            </p>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={storyState.currentStoryIndex < storyState.currentStoryTexts.length - 1 ? onNextStory : onNextPhase}
              className={buttonClass}
            >
              继续 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 总结
  if (storyState.phase === 'summary') {
    const playerName = getPlayerName(currentPlayerState.playerId);
    return (
      <div className={`${containerClass} p-4`}>
        <div className="fixed top-4 left-6 text-4xl animate-bounce">🏆</div>
        <div className="fixed top-8 right-20 text-3xl">🎊</div>
        <div className="fixed bottom-10 left-10 text-2xl">🌟</div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 左侧：完整队伍状态面板 */}
            <div className="md:col-span-1">
              <TeamStatusPanel 
                players={buildTeamPlayers()} 
                currentPlayerId={currentPlayerState.playerId}
                showHealth={true}
              />
            </div>
            
            {/* 右侧：总结内容 */}
            <div className={`md:col-span-2 ${cardClass}`}>
              <h2 className="text-2xl font-bold text-center mb-6 text-amber-600 flex items-center justify-center gap-2">
                <span>🎓</span>
                {currentPlayerState.branchName} · {playerName} · 修炼完成
                <span>🎓</span>
              </h2>
              
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 mb-6 border-2 border-amber-200">
                <h3 className="font-bold mb-4 text-lg text-amber-700 flex items-center gap-2">
                  <span className="text-2xl">{getCharacterEmoji(currentPlayerState.characterType)}</span>
                  {playerName} 获得的能力：
                </h3>
                
                {currentPlayerState.forms && currentPlayerState.forms.length > 0 && (
                  <div className="mb-3">
                    <span className="text-gray-500 mr-2">🤖 形态：</span>
                    {currentPlayerState.forms.map((f, i) => (
                      <span key={i} className={`ml-2 font-bold ${getGradeColor(f.grade)}`}>【{f.name}】</span>
                    ))}
                  </div>
                )}
                
                {currentPlayerState.skills.length > 0 && (
                  <div className="mb-3">
                    <span className="text-gray-500 mr-2">🎯 技能：</span>
                    {currentPlayerState.skills.map((s, i) => (
                      <span key={i} className={`ml-2 font-bold ${getGradeColor(s.grade)}`}>【{s.name}】</span>
                    ))}
                  </div>
                )}
                
                {currentPlayerState.items.length > 0 && (
                  <div>
                    <span className="text-gray-500 mr-2">📦 道具：</span>
                    {currentPlayerState.items.map((s, i) => (
                      <span key={i} className={`ml-2 font-bold ${getGradeColor(s.grade)}`}>【{s.name}】</span>
                    ))}
                  </div>
                )}
                
                {currentPlayerState.skills.length === 0 && currentPlayerState.items.length === 0 && (!currentPlayerState.forms || currentPlayerState.forms.length === 0) && (
                  <p className="text-gray-400 italic">暂无获得技能或道具</p>
                )}
              </div>
              
              <div className="flex justify-center">
                <button onClick={onNextPhase} className={buttonClass}>
                  {storyState.currentPlayerIndex < storyState.playerStates.length - 1 
                    ? '👉 下一位玩家' 
                    : '⚔️ 进入BOSS战'}
                </button>
              </div>
              
              {storyState.currentPlayerIndex >= storyState.playerStates.length - 1 && (
                <p className="text-center text-amber-600 mt-4 flex items-center justify-center gap-2">
                  <span>🎮</span>
                  所有玩家修炼完成，准备迎战BOSS！
                  <span>🎮</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StoryScreen;
