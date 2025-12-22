import React from 'react';

export interface ItemSelectionOption {
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
}

export interface ItemSelectionData {
  itemId: string;
  itemName: string;
  itemGrade: string;
  itemEffect: string;
  ownerName: string;
  ownerCharacter: 'cat' | 'dog' | 'turtle';
  selectionType: 'anywhere_door' | 'size_light' | 'time_machine' | 'turtle_shell' | 'sleep_gas' | 'soul_bracelet' | 'cupid_arrow' | 'bamboo_copter' | 'turtle_soup';
  options: ItemSelectionOption[];
  // 可选：目标玩家列表（用于需要选择目标的技能）
  targetPlayers?: { id: string; name: string; health: number }[];
}

interface ItemSelectionModalProps {
  data: ItemSelectionData;
  onSelect: (optionId: string) => void;
  onSkip?: () => void;
  canSkip?: boolean;
}

const ItemSelectionModal: React.FC<ItemSelectionModalProps> = ({
  data,
  onSelect,
  onSkip,
  canSkip = true
}) => {
  const getCharacterEmoji = (type: string) => {
    const emojis: Record<string, string> = { cat: '😺', dog: '🐶', turtle: '🐸' };
    return emojis[type] || '👤';
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'S': 'text-blue-500',
      'SS': 'text-purple-500',
      'SSS': 'text-orange-500',
      'SSSS': 'text-red-500'
    };
    return colors[grade] || 'text-gray-500';
  };

  const getItemIcon = (selectionType: string) => {
    const icons: Record<string, string> = {
      'anywhere_door': '🚪',
      'size_light': '🔦',
      'time_machine': '⏰'
    };
    return icons[selectionType] || '📦';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-3xl shadow-2xl border-4 border-amber-400 max-w-lg w-full overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getItemIcon(data.selectionType)}</span>
            <div>
              <h2 className="text-xl font-bold text-white">道具触发</h2>
              <p className="text-amber-100 text-sm">
                {getCharacterEmoji(data.ownerCharacter)} {data.ownerName} 的道具
              </p>
            </div>
          </div>
        </div>

        {/* 道具信息 */}
        <div className="px-6 py-4 border-b border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-bold ${getGradeColor(data.itemGrade)}`}>
              [{data.itemGrade}级]
            </span>
            <span className="font-bold text-gray-800">{data.itemName}</span>
          </div>
          <p className="text-gray-600 text-sm">{data.itemEffect}</p>
        </div>

        {/* 选项列表 */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-gray-700 font-medium mb-3">请选择：</p>
          {data.options.map((option) => (
            <button
              key={option.id}
              onClick={() => !option.disabled && onSelect(option.id)}
              disabled={option.disabled}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                option.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-amber-50 border-2 border-amber-200 hover:border-amber-400 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="font-bold text-gray-800">{option.label}</div>
              <div className="text-sm text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>

        {/* 跳过按钮 */}
        {canSkip && onSkip && (
          <div className="px-6 pb-4">
            <button
              onClick={onSkip}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              暂不使用此道具
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemSelectionModal;
