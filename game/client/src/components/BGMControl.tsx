import React from 'react';

interface BGMControlProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
}

export const BGMControl: React.FC<BGMControlProps> = ({
  isPlaying,
  isMuted,
  volume,
  onToggleMute,
  onTogglePlay,
  onVolumeChange
}) => {
  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-2 transition-all duration-300 ${
      isPlaying ? 'bg-black/50' : 'bg-purple-600/80 animate-pulse'
    }`}>
      {/* 播放/暂停按钮 */}
      <button
        onClick={onTogglePlay}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${
          isPlaying ? 'text-white hover:text-yellow-300' : 'text-yellow-300 hover:text-white'
        }`}
        title={isPlaying ? '暂停音乐' : '点击播放音乐 🎵'}
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>
      
      {/* 未播放时显示提示 */}
      {!isPlaying && (
        <span className="text-white text-xs whitespace-nowrap">点击播放</span>
      )}
      
      {/* 静音按钮 */}
      <button
        onClick={onToggleMute}
        className="w-8 h-8 flex items-center justify-center text-white hover:text-yellow-300 transition-colors"
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
      </button>
      
      {/* 音量滑块 */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={isMuted ? 0 : volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:bg-yellow-300"
        title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
      />
    </div>
  );
};
