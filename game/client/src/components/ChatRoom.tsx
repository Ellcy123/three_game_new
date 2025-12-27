import { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderCharacterType?: string; // cat/dog/turtle
  content: string;
  timestamp: number;
  type: 'chat' | 'system';
}

// 主题类型
export type ChatTheme = 'dark' | 'light';

// 常用表情列表
const EMOJI_LIST = [
  // 表情
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎',
  '🤔', '😅', '😢', '😭', '😱', '😤', '🥺', '😴',
  // 动物
  '🐱', '🐶', '🐸', '🐭', '🦜', '💀', '🐰', '🦊',
  // 手势
  '👍', '👎', '👏', '🙏', '💪', '✌️', '🤝', '👋',
  // 物品/符号
  '❤️', '💔', '⭐', '🔥', '💯', '✨', '🎉', '🎊',
  // 游戏相关
  '🎮', '🎲', '🏆', '🥇', '💰', '🗡️', '🛡️', '⚔️'
];

interface ChatRoomProps {
  messages: ChatMessage[];
  playerId: string;
  roomId?: string; // 房间码
  enabled: boolean;
  disableReason?: string;
  characterRevealed?: boolean; // 角色是否已揭示
  theme?: ChatTheme; // 主题：dark=紫色暗黑，light=黄橙欢乐
  // 玩家面板相关
  players?: Array<{
    id: string;
    name: string;
    characterType?: string;
    characterRevealed?: boolean;
  }>;
  hammerCounts?: Record<string, number>; // 敲击计数
  hammerEffect?: string | null; // 当前显示特效的玩家ID（服务端广播）
  onHammerHit?: (targetPlayerId: string) => void; // 敲击回调
  onSendMessage: (content: string) => void;
  onForceAdvance?: () => void;
  onReturnToLobby?: () => void;
  // 隐藏的调试功能
  debugActions?: {
    skipToBoss1?: () => void;
    skipToBoss2?: () => void;
    skipToBoss3?: () => void;
    skipToSoup?: () => void;
    skipToLevel3?: () => void;
  };
}

// 角色类型对应的emoji和颜色（根据主题）
const getCharacterConfig = (theme: ChatTheme) => ({
  cat: { 
    emoji: '😺', 
    color: theme === 'dark' ? 'text-orange-300' : 'text-orange-600', 
    bgColor: theme === 'dark' ? 'bg-orange-500/30' : 'bg-orange-100' 
  },
  dog: { 
    emoji: '🐶', 
    color: theme === 'dark' ? 'text-amber-300' : 'text-amber-700', 
    bgColor: theme === 'dark' ? 'bg-amber-500/30' : 'bg-amber-100' 
  },
  turtle: { 
    emoji: '🐸', 
    color: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600', 
    bgColor: theme === 'dark' ? 'bg-emerald-500/30' : 'bg-emerald-100' 
  }
});

export function ChatRoom({
  messages,
  playerId,
  roomId,
  enabled,
  disableReason,
  characterRevealed = false,
  theme = 'dark',
  players = [],
  hammerCounts = {},
  hammerEffect,
  onHammerHit,
  onSendMessage,
  onForceAdvance,
  onReturnToLobby,
  debugActions
}: ChatRoomProps) {
  const [inputValue, setInputValue] = useState('');
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 秘密点击计数器 - 连续点击3次骨头才显示秘密菜单
  const handleSecretClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 3) {
      setShowSecretMenu(true);
      setSecretClickCount(0);
    }
    // 2秒后重置计数
    setTimeout(() => setSecretClickCount(0), 2000);
  };

  // 复制房间码
  const handleCopyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const input = document.createElement('input');
      input.value = roomId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 处理敲击
  const handleHammerHit = (targetId: string) => {
    if (targetId === playerId || !onHammerHit) return;
    onHammerHit(targetId);
    // 特效现在由服务端广播，不再本地管理
  };

  // 插入表情
  const handleInsertEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    // 聚焦输入框
    inputRef.current?.focus();
  };

  // 根据主题获取角色配置
  const CHARACTER_CONFIG = getCharacterConfig(theme);

  // 主题样式配置
  const themeStyles = theme === 'dark' ? {
    // 暗紫色主题
    collapsedBg: 'bg-gradient-to-b from-purple-600 to-indigo-600',
    collapsedBorder: 'border-l-2 border-purple-400',
    collapsedIcon: '🌙',
    expandedBg: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900',
    topBar: 'bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    headerBorder: 'border-b-2 border-purple-400',
    headerIcon: '🌙',
    headerDecor: '✨',
    emptyText: 'text-purple-300',
    emptySubtext: 'text-purple-400',
    systemMsgBg: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
    avatarBorder: 'border-purple-400/50',
    avatarDefaultBg: 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30',
    avatarDefaultText: 'text-purple-200',
    nameDefaultColor: 'text-purple-300',
    timeColor: 'text-purple-400/60',
    myBubble: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
    otherBubble: 'bg-white/10 text-purple-100 border border-purple-400/30',
    disabledBg: 'bg-amber-500/20 border-amber-400/50',
    disabledText: 'text-amber-300',
    inputAreaBg: 'bg-white/5 border-purple-400/50',
    inputBg: 'bg-white/10 text-white border-purple-400/50 focus:border-purple-400 placeholder:text-purple-300/60',
    sendBtn: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
    sendBtnDisabled: 'disabled:from-gray-600 disabled:to-gray-700',
    decorEmojis: ['🌙', '⭐', '✨'],
    helpBtnText: 'text-purple-300 hover:text-purple-200 hover:bg-white/10',
    helpMenuBg: 'bg-slate-800 border-purple-400/50',
    helpMenuHeader: 'bg-purple-900/50 border-purple-400/30 text-purple-200',
    helpMenuItem: 'text-purple-200 hover:bg-purple-500/20 border-purple-400/20',
    helpMenuCancel: 'text-purple-400 hover:bg-white/5 border-purple-400/20'
  } : {
    // 欢乐黄橙主题
    collapsedBg: 'bg-gradient-to-b from-green-400 to-emerald-500',
    collapsedBorder: 'border-l-4 border-yellow-400',
    collapsedIcon: '🌳',
    expandedBg: 'bg-gradient-to-b from-sky-200 via-green-100 to-emerald-200',
    topBar: 'bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400',
    headerBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    headerBorder: 'border-b-4 border-yellow-400',
    headerIcon: '🏡',
    headerDecor: '🌿',
    emptyText: 'text-green-600',
    emptySubtext: 'text-green-500',
    systemMsgBg: 'bg-yellow-100 border-yellow-300 text-amber-700',
    avatarBorder: 'border-white',
    avatarDefaultBg: 'bg-gradient-to-br from-blue-200 to-purple-200',
    avatarDefaultText: 'text-gray-600',
    nameDefaultColor: 'text-gray-600',
    timeColor: 'text-gray-400',
    myBubble: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white',
    otherBubble: 'bg-white text-gray-700 border border-gray-100',
    disabledBg: 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300',
    disabledText: 'text-amber-700',
    inputAreaBg: 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300',
    inputBg: 'bg-white text-gray-700 border-green-300 focus:border-green-500 placeholder:text-gray-400',
    sendBtn: 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600',
    sendBtnDisabled: 'disabled:from-gray-300 disabled:to-gray-400',
    decorEmojis: ['🌱', '🌼', '🍀'],
    helpBtnText: 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
    helpMenuBg: 'bg-white border-gray-200',
    helpMenuHeader: 'bg-gray-50 border-gray-200 text-gray-600',
    helpMenuItem: 'text-gray-700 hover:bg-amber-50 border-gray-100',
    helpMenuCancel: 'text-gray-400 hover:bg-gray-50 border-gray-100'
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !enabled) return;
    if (trimmed.length > 200) {
      alert('消息过长，请控制在200字以内');
      return;
    }
    onSendMessage(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 展开状态 - 右侧侧边栏（不再支持收起）
  return (
    <div className="fixed right-0 top-0 h-screen w-80 flex flex-col z-40 shadow-2xl">
      {/* 背景装饰 */}
      <div className={`absolute inset-0 ${themeStyles.expandedBg} opacity-95`} />
      
      {/* 顶部装饰条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${themeStyles.topBar}`} />
      
      {/* 内容容器 */}
      <div className="relative flex flex-col h-full">
        {/* 标题栏 */}
        <div 
          className={`flex items-center justify-between px-4 py-3
                     ${themeStyles.headerBg} text-white
                     ${themeStyles.headerBorder}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">{themeStyles.headerIcon}</span>
            <span className="font-bold text-lg">小窝</span>
            <span className="text-xl">{themeStyles.headerDecor}</span>
          </div>
          {/* 房间码复制按钮 */}
          {roomId && (
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 
                       transition-colors text-sm"
              title="点击复制房间码"
            >
              <span className="opacity-80">🔗</span>
              <span className="font-mono text-xs">{roomId.slice(0, 8)}</span>
              <span className="text-xs">{copied ? '✓' : '📋'}</span>
            </button>
          )}
        </div>

        {/* 玩家面板 - 敲击互动区域 */}
        {players.length > 0 && (
          <div className={`px-3 py-2 border-b ${theme === 'dark' ? 'border-purple-400/30 bg-white/5' : 'border-green-200 bg-white/50'}`}>
            <div className="flex justify-around items-center">
              {players.map((player) => {
                const isMe = player.id === playerId;
                const charConfig = player.characterType && player.characterRevealed 
                  ? CHARACTER_CONFIG[player.characterType as keyof typeof CHARACTER_CONFIG] 
                  : null;
                const showEmoji = player.characterRevealed && charConfig;
                const hitCount = hammerCounts[player.id] || 0;
                const isHitting = hammerEffect === player.id;

                return (
                  <div 
                    key={player.id} 
                    className="flex flex-col items-center gap-1"
                  >
                    {/* 头像 */}
                    <button
                      onClick={() => handleHammerHit(player.id)}
                      disabled={isMe}
                      className={`w-12 h-12 rounded-full flex items-center justify-center
                                shadow-md border-2 transition-all duration-200
                                ${isMe 
                                  ? 'opacity-60 cursor-default' 
                                  : 'cursor-pointer hover:scale-110 active:scale-95'}
                                ${!isMe && 'hover:cursor-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'80\'>🔨</text></svg>"),auto]'}
                                ${isHitting ? 'animate-bounce scale-90' : ''}
                                ${showEmoji 
                                  ? charConfig.bgColor + ' ' + charConfig.color
                                  : theme === 'dark' 
                                    ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-purple-400/50' 
                                    : 'bg-gradient-to-br from-blue-200 to-purple-200 border-white'}
                                ${theme === 'dark' ? 'border-purple-400/50' : 'border-white'}`}
                      title={isMe ? '这是你自己' : `敲一下 ${player.name}`}
                    >
                      {showEmoji ? (
                        <span className="text-2xl">{charConfig.emoji}</span>
                      ) : (
                        <span className={`font-bold text-lg ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {/* 敲击特效 */}
                      {isHitting && (
                        <span className="absolute -top-1 -right-1 text-xl animate-ping">💥</span>
                      )}
                    </button>
                    {/* 名字 */}
                    <span className={`text-xs font-medium truncate max-w-[60px]
                                   ${showEmoji ? charConfig.color : theme === 'dark' ? 'text-purple-300' : 'text-gray-600'}`}>
                      {player.name}
                    </span>
                    {/* 被敲击次数 */}
                    {hitCount > 0 && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`}>
                        🔨 ×{hitCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">🦋</span>
              <p className={`${themeStyles.emptyText} text-sm`}>还没有消息哦~</p>
              <p className={`${themeStyles.emptySubtext} text-xs`}>快来和小伙伴们聊天吧！</p>
            </div>
          ) : (
            messages.map((msg) => {
              // 系统消息
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="text-center py-1">
                    <span className={`inline-flex items-center gap-1 text-xs 
                                   ${themeStyles.systemMsgBg} px-3 py-1.5 rounded-full border
                                   shadow-sm`}>
                      <span>🔔</span>
                      <span>{msg.content}</span>
                    </span>
                  </div>
                );
              }

              const isMe = msg.senderId === playerId;
              const charConfig = msg.senderCharacterType ? CHARACTER_CONFIG[msg.senderCharacterType as keyof typeof CHARACTER_CONFIG] : null;
              const showEmoji = characterRevealed && charConfig;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* 头像 */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                                 shadow-md border-2 ${themeStyles.avatarBorder}
                                 ${showEmoji ? charConfig.bgColor : themeStyles.avatarDefaultBg}`}>
                    {showEmoji ? (
                      <span className="text-xl">{charConfig.emoji}</span>
                    ) : (
                      <span className={`${themeStyles.avatarDefaultText} font-bold text-sm`}>
                        {msg.senderName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className={`max-w-[65%] ${isMe ? 'text-right' : ''}`}>
                    {/* 名字和时间 */}
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className={`text-xs font-medium ${showEmoji ? charConfig.color : themeStyles.nameDefaultColor}`}>
                        {msg.senderName}
                      </span>
                      <span className={`${themeStyles.timeColor} text-xs`}>{formatTime(msg.timestamp)}</span>
                    </div>
                    
                    {/* 消息气泡 */}
                    <div
                      className={`inline-block px-3 py-2 rounded-2xl text-sm shadow-md
                        ${isMe
                          ? `${themeStyles.myBubble} rounded-br-sm`
                          : `${themeStyles.otherBubble} rounded-bl-sm`
                        }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 禁言提示 */}
        {!enabled && (
          <div className={`px-4 py-3 ${themeStyles.disabledBg} 
                         border-t border-b`}>
            <div className={`flex items-center justify-center gap-2 ${themeStyles.disabledText}`}>
              <span className="text-xl">🤫</span>
              <span className="text-sm font-medium">{disableReason || '聊天已暂时禁用'}</span>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className={`p-3 ${themeStyles.inputAreaBg} border-t`}>
          <div className="flex items-center gap-2">
            {/* 表情按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={!enabled}
                className={`w-10 h-10 rounded-full flex items-center justify-center
                          ${theme === 'dark' 
                            ? 'bg-white/10 hover:bg-white/20 text-yellow-300' 
                            : 'bg-white hover:bg-gray-50 text-yellow-500 border border-gray-200'}
                          disabled:opacity-50 disabled:cursor-not-allowed
                          transition-all duration-200`}
                title="表情"
              >
                😊
              </button>
              
              {/* 表情选择器 */}
              {showEmojiPicker && (
                <div className={`absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-xl 
                              border overflow-hidden z-50
                              ${theme === 'dark' 
                                ? 'bg-slate-800 border-purple-400/50' 
                                : 'bg-white border-gray-200'}`}>
                  <div className={`p-2 border-b ${theme === 'dark' 
                    ? 'bg-purple-900/50 border-purple-400/30' 
                    : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>
                      😊 选择表情
                    </span>
                  </div>
                  <div className="p-2 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                    {EMOJI_LIST.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleInsertEmoji(emoji)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-lg
                                  hover:scale-125 transition-transform
                                  ${theme === 'dark' 
                                    ? 'hover:bg-purple-500/30' 
                                    : 'hover:bg-yellow-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowEmojiPicker(false)}
              disabled={!enabled}
              placeholder={enabled ? (theme === 'dark' ? '说点什么吧~ ✨' : '说点什么吧~ 🌸') : '聊天已禁用'}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm 
                        border-2 focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-inner ${themeStyles.inputBg}`}
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!enabled || !inputValue.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center
                        ${themeStyles.sendBtn} 
                        ${themeStyles.sendBtnDisabled} disabled:cursor-not-allowed
                        text-white shadow-md transition-all duration-200
                        hover:scale-105 active:scale-95`}
            >
              {enabled ? '🚀' : '🔒'}
            </button>
          </div>
          
          {/* 帮助按钮 */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-1 opacity-60">
              {themeStyles.decorEmojis.map((emoji, i) => (
                <span key={i}>{emoji}</span>
              ))}
            </div>
            <div className="relative flex items-center gap-2">
              {/* 秘密骨头按钮 - 连续点击3次触发 */}
              <button
                onClick={handleSecretClick}
                className="text-lg opacity-40 hover:opacity-60 transition-opacity cursor-default"
                title=""
              >
                🦴
              </button>
              
              <button
                onClick={() => setShowHelpMenu(!showHelpMenu)}
                className={`text-xs px-2 py-1 rounded transition-colors ${themeStyles.helpBtnText}`}
              >
                🔧 遇到问题？
              </button>
              
              {/* 秘密调试菜单 */}
              {showSecretMenu && debugActions && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
                     onClick={() => setShowSecretMenu(false)}>
                  <div className="bg-slate-900 border-2 border-purple-500 rounded-xl p-4 shadow-2xl max-w-xs"
                       onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-4">
                      <span className="text-2xl">🎮</span>
                      <h3 className="text-purple-300 font-bold mt-1">开发者工具</h3>
                      <p className="text-purple-400/60 text-xs">嘘...这是秘密</p>
                    </div>
                    <div className="space-y-2">
                      {debugActions.skipToBoss1 && (
                        <button
                          onClick={() => { debugActions.skipToBoss1?.(); setShowSecretMenu(false); }}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          🐀 跳到BOSS1
                        </button>
                      )}
                      {debugActions.skipToBoss2 && (
                        <button
                          onClick={() => { debugActions.skipToBoss2?.(); setShowSecretMenu(false); }}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          🦜 跳到BOSS2
                        </button>
                      )}
                      {debugActions.skipToBoss3 && (
                        <button
                          onClick={() => { debugActions.skipToBoss3?.(); setShowSecretMenu(false); }}
                          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          💀 跳到BOSS3
                        </button>
                      )}
                      {debugActions.skipToSoup && (
                        <button
                          onClick={() => { debugActions.skipToSoup?.(); setShowSecretMenu(false); }}
                          className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          🐸 跳到海龟汤
                        </button>
                      )}
                      {debugActions.skipToLevel3 && (
                        <button
                          onClick={() => { debugActions.skipToLevel3?.(); setShowSecretMenu(false); }}
                          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          🔧 跳到第三关
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowSecretMenu(false)}
                      className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}
              
              {/* 帮助菜单 */}
              {showHelpMenu && (
                <div className={`absolute bottom-full right-0 mb-2 w-48 rounded-lg shadow-lg 
                              border overflow-hidden z-50 ${themeStyles.helpMenuBg}`}>
                  <div className={`p-2 border-b ${themeStyles.helpMenuHeader}`}>
                    <span className="text-xs font-medium">🛠️ 帮助选项</span>
                  </div>
                  {onForceAdvance && (
                    <button
                      onClick={() => {
                        if (confirm('确定要强制推进游戏吗？这可能会跳过当前阶段。')) {
                          onForceAdvance();
                          setShowHelpMenu(false);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-sm 
                                flex items-center gap-2 border-b ${themeStyles.helpMenuItem}`}
                    >
                      <span>⏭️</span>
                      <span>强制推进</span>
                    </button>
                  )}
                  {onReturnToLobby && (
                    <button
                      onClick={() => {
                        if (confirm('确定要返回大厅吗？当前游戏进度将丢失！')) {
                          onReturnToLobby();
                          setShowHelpMenu(false);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50
                                flex items-center gap-2"
                    >
                      <span>🚪</span>
                      <span>返回大厅</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowHelpMenu(false)}
                    className={`w-full text-left px-3 py-2 text-xs border-t ${themeStyles.helpMenuCancel}`}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
