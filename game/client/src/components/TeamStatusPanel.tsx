import React, { useState } from 'react';

// 技能/道具信息
export interface SkillInfo {
  id?: string;
  name: string;
  grade: string;
  effect: string;
  type?: 'skill' | 'item';
}

// 玩家状态
export interface TeamPlayerState {
  playerId: string;
  characterType: 'cat' | 'dog' | 'turtle';
  name?: string;
  health: number;
  maxHealth?: number;
  isAlive?: boolean;
  isActive?: boolean;
  skills: SkillInfo[];
  items: SkillInfo[];
}

interface TeamStatusPanelProps {
  players: TeamPlayerState[];
  currentPlayerId?: string;
  showHealth?: boolean;
  compact?: boolean;
}

// 技能详情弹窗
interface SkillDetailModalProps {
  skill: SkillInfo | null;
  onClose: () => void;
}

const SkillDetailModal: React.FC<SkillDetailModalProps> = ({ skill, onClose }) => {
  if (!skill) return null;

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'B': 'from-gray-400 to-gray-500',
      'A': 'from-sky-400 to-blue-500',
      'S': 'from-violet-400 to-purple-500',
      'SS': 'from-amber-400 to-yellow-500',
      'SSS': 'from-orange-400 to-red-500',
      'SSSS': 'from-rose-400 to-pink-500',
      'SSSSS': 'from-pink-400 to-fuchsia-500'
    };
    return colors[grade] || 'from-gray-400 to-gray-500';
  };

  const getGradeTextColor = (grade: string) => {
    const colors: Record<string, string> = {
      'B': 'text-gray-600', 'A': 'text-sky-600', 'S': 'text-violet-600',
      'SS': 'text-amber-600', 'SSS': 'text-orange-600', 'SSSS': 'text-rose-600', 'SSSSS': 'text-pink-600'
    };
    return colors[grade] || 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl border-4 border-amber-300 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className={`bg-gradient-to-r ${getGradeColor(skill.grade)} rounded-2xl p-4 mb-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{skill.type === 'item' ? '📦' : '⚡'}</span>
              <span className="text-xl font-bold">【{skill.name}】</span>
            </div>
            <span className="text-lg font-bold bg-white/20 px-3 py-1 rounded-full">
              {skill.grade}级
            </span>
          </div>
        </div>

        {/* 类型标签 */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            skill.type === 'item' 
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
              : 'bg-purple-100 text-purple-700 border border-purple-300'
          }`}>
            {skill.type === 'item' ? '🎁 道具' : '🎯 技能'}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeTextColor(skill.grade)} bg-gray-100 border border-gray-200`}>
            稀有度：{skill.grade}
          </span>
        </div>

        {/* 效果描述 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-200">
          <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
            <span>📜</span> 效果说明
          </h4>
          <p className="text-gray-700 leading-relaxed">{skill.effect}</p>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 rounded-full text-white font-bold shadow-lg transition-all hover:scale-105"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

const TeamStatusPanel: React.FC<TeamStatusPanelProps> = ({
  players,
  currentPlayerId,
  showHealth = true,
  compact = false
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);

  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getCharacterName = (type: string) => {
    const names: Record<string, string> = { cat: '猫咪', dog: '狗狗', turtle: '乌龟' };
    return names[type] || '未知';
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'B': 'text-gray-500 border-gray-300 bg-gray-50',
      'A': 'text-sky-600 border-sky-300 bg-sky-50',
      'S': 'text-violet-600 border-violet-300 bg-violet-50',
      'SS': 'text-amber-600 border-amber-300 bg-amber-50',
      'SSS': 'text-orange-600 border-orange-300 bg-orange-50',
      'SSSS': 'text-rose-600 border-rose-300 bg-rose-50',
      'SSSSS': 'text-pink-600 border-pink-300 bg-pink-50'
    };
    return colors[grade] || 'text-gray-500 border-gray-300 bg-gray-50';
  };

  const handleSkillClick = (skill: SkillInfo, type: 'skill' | 'item') => {
    setSelectedSkill({ ...skill, type });
  };

  if (compact) {
    // 紧凑模式 - 横向显示
    return (
      <>
        <div className="bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg border-2 border-amber-200">
          <div className="flex items-center gap-4 overflow-x-auto">
            {players.map(player => (
              <div key={player.playerId} className={`flex items-center gap-2 px-3 py-2 rounded-xl min-w-fit ${
                player.playerId === currentPlayerId 
                  ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-400' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className="text-2xl">{getCharacterEmoji(player.characterType)}</span>
                <div>
                  <div className="font-bold text-sm">{player.name || getCharacterName(player.characterType)}</div>
                  {showHealth && (
                    <div className={`text-xs font-bold ${(player.isAlive ?? true) ? 'text-green-600' : 'text-rose-500'}`}>
                      ❤️ {player.health}/{player.maxHealth || 10}
                    </div>
                  )}
                </div>
                {/* 技能图标 */}
                {player.skills.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {player.skills.slice(0, 3).map((skill, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSkillClick(skill, 'skill')}
                        className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${getGradeColor(skill.grade)}`}
                        title={skill.name}
                      >
                        ⚡
                      </button>
                    ))}
                    {player.skills.length > 3 && (
                      <span className="text-xs text-gray-400">+{player.skills.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      </>
    );
  }

  // 完整模式 - 卡片式显示
  return (
    <>
      <div className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-xl border-4 border-amber-300">
        <h4 className="font-bold mb-3 text-amber-600 flex items-center gap-2 text-lg">
          <span>👥</span> 队伍状态
        </h4>
        <div className="space-y-3">
          {players.map(player => {
            const isCurrentPlayer = player.playerId === currentPlayerId;
            const isAlive = player.isAlive ?? true;
            
            return (
              <div 
                key={player.playerId} 
                className={`rounded-2xl p-3 border-2 transition-all ${
                  isCurrentPlayer 
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-400 shadow-md' 
                    : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                } ${!isAlive ? 'opacity-60' : ''}`}
              >
                {/* 角色信息 */}
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-2">{getCharacterEmoji(player.characterType)}</span>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">
                      {player.name || getCharacterName(player.characterType)}
                      {isCurrentPlayer && <span className="ml-2 text-amber-500">🎬</span>}
                      {player.isActive && <span className="ml-1 text-green-500">⚔️</span>}
                    </div>
                    {showHealth && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isAlive ? 'text-green-600' : 'text-rose-500'}`}>
                          {isAlive ? `❤️ ${player.health}/${player.maxHealth || 10}` : '💀 已阵亡'}
                        </span>
                        {/* 生命值条 */}
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-20">
                          <div 
                            className={`h-full rounded-full transition-all ${isAlive ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-400'}`}
                            style={{ width: `${(player.health / (player.maxHealth || 10)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 技能列表 */}
                {player.skills.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 mr-1">🎯 技能：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.skills.map((skill, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSkillClick(skill, 'skill')}
                          className={`text-xs px-2 py-1 rounded-full border font-bold cursor-pointer hover:scale-105 transition-transform ${getGradeColor(skill.grade)}`}
                        >
                          【{skill.name}】
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 道具列表 */}
                {player.items.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 mr-1">📦 道具：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSkillClick(item, 'item')}
                          className={`text-xs px-2 py-1 rounded-full border font-bold cursor-pointer hover:scale-105 transition-transform bg-yellow-50 border-yellow-300 text-yellow-700`}
                        >
                          📦 {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 无技能提示 */}
                {player.skills.length === 0 && player.items.length === 0 && (
                  <span className="text-xs text-gray-400 italic">暂无技能</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
    </>
  );
};

export default TeamStatusPanel;
export { SkillDetailModal };
