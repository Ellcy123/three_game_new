import { useEffect, useState, useRef, useCallback } from 'react';

// 其他玩家的光标信息
export interface RemoteCursor {
  playerId: string;
  playerName: string;
  characterType?: string; // cat/dog/turtle
  characterRevealed: boolean;
  x: number; // 百分比 0-100
  y: number; // 百分比 0-100
  lastUpdate: number;
}

// 角色对应的emoji
const CHARACTER_EMOJI: Record<string, string> = {
  cat: '😺',
  dog: '🐶',
  turtle: '🐸'
};

// 角色对应的颜色
const CHARACTER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cat: { bg: 'bg-orange-400', border: 'border-orange-500', text: 'text-orange-600' },
  dog: { bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-amber-600' },
  turtle: { bg: 'bg-emerald-400', border: 'border-emerald-500', text: 'text-emerald-600' }
};

// 默认颜色（未揭示角色时）
const DEFAULT_COLORS = [
  { bg: 'bg-blue-400', border: 'border-blue-500', text: 'text-blue-600' },
  { bg: 'bg-purple-400', border: 'border-purple-500', text: 'text-purple-600' },
  { bg: 'bg-pink-400', border: 'border-pink-500', text: 'text-pink-600' }
];

interface CursorOverlayProps {
  playerId: string; // 当前玩家ID
  remoteCursors: RemoteCursor[];
  enabled?: boolean;
}

export function CursorOverlay({ playerId, remoteCursors, enabled = true }: CursorOverlayProps) {
  // 平滑动画的目标位置
  const [smoothPositions, setSmoothPositions] = useState<Record<string, { x: number; y: number }>>({});
  const animationRef = useRef<number>();

  // 使用 requestAnimationFrame 平滑移动光标
  useEffect(() => {
    if (!enabled) return;

    const animate = () => {
      setSmoothPositions(prev => {
        const next = { ...prev };
        remoteCursors.forEach(cursor => {
          if (cursor.playerId === playerId) return;
          
          const current = prev[cursor.playerId] || { x: cursor.x, y: cursor.y };
          // 线性插值，0.15 是平滑系数
          const dx = (cursor.x - current.x) * 0.15;
          const dy = (cursor.y - current.y) * 0.15;
          
          next[cursor.playerId] = {
            x: current.x + dx,
            y: current.y + dy
          };
        });
        return next;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remoteCursors, playerId, enabled]);

  if (!enabled) return null;

  // 过滤掉自己和超时的光标（5秒无更新）
  const now = Date.now();
  const activeCursors = remoteCursors.filter(
    c => c.playerId !== playerId && now - c.lastUpdate < 5000
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {activeCursors.map((cursor, index) => {
        const pos = smoothPositions[cursor.playerId] || { x: cursor.x, y: cursor.y };
        const colors = cursor.characterRevealed && cursor.characterType
          ? CHARACTER_COLORS[cursor.characterType]
          : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        
        const displayContent = cursor.characterRevealed && cursor.characterType
          ? CHARACTER_EMOJI[cursor.characterType]
          : cursor.playerName.charAt(0).toUpperCase();

        return (
          <div
            key={cursor.playerId}
            className="absolute transition-opacity duration-300"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* 光标主体 */}
            <div className={`relative flex items-center`}>
              {/* 光标圆圈 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center
                           ${colors.bg} ${colors.border} border-2
                           shadow-lg animate-pulse`}
                style={{ animationDuration: '2s' }}
              >
                <span className={`${cursor.characterRevealed ? 'text-lg' : 'text-sm font-bold text-white'}`}>
                  {displayContent}
                </span>
              </div>
              
              {/* 名字标签 */}
              <div
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium
                           bg-white/90 ${colors.text} shadow-md
                           whitespace-nowrap max-w-[80px] truncate`}
              >
                {cursor.playerName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 节流函数
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

// Hook: 用于发送自己的鼠标位置
export function useCursorTracking(
  onCursorMove: (x: number, y: number) => void,
  enabled: boolean = true,
  throttleMs: number = 50
) {
  const throttledMove = useCallback(
    throttle((x: number, y: number) => {
      onCursorMove(x, y);
    }, throttleMs),
    [onCursorMove, throttleMs]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 转换为视口百分比
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      throttledMove(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, throttledMove]);
}
