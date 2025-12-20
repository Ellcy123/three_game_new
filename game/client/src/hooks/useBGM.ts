import { useEffect, useRef, useState, useCallback } from 'react';

// BGM 映射：关卡 -> 音乐文件
const BGM_MAP: Record<string, string> = {
  'lobby': '/music/01.mp3',        // 大厅/等待房间用密室音乐
  'waiting': '/music/01.mp3',      // 等待房间
  'level1': '/music/01.mp3',       // 密室
  'level2': '/music/02.mp3',       // 藏匿
  'turtle-soup': '/music/03.mp3', // 海龟汤
  'level3': '/music/04.mp3',       // 人物剧情
  'boss1': '/music/05.mp3',        // BOSS战 - 鼠鼠大王
  'boss2': '/music/05.mp3',        // BOSS战 - 百变小鹦
  'boss3': '/music/05.mp3',        // BOSS战 - 死神
  'ending': '/music/04.mp3',       // 结局用温馨的音乐
};

// 默认音量
const DEFAULT_VOLUME = 0.3;

export function useBGM(currentLevel: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const currentBgmRef = useRef<string>('');

  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'auto';
      audioRef.current = audio;
      
      // 监听播放状态变化
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 根据关卡切换 BGM
  useEffect(() => {
    const bgmUrl = BGM_MAP[currentLevel];
    
    if (!bgmUrl || !audioRef.current) {
      return;
    }
    
    // 如果是同一首 BGM，不需要切换
    if (currentBgmRef.current === bgmUrl) {
      return;
    }
    
    currentBgmRef.current = bgmUrl;
    console.log('BGM 切换到:', bgmUrl);
    
    // 切换音乐
    const audio = audioRef.current;
    const wasPlaying = isPlaying;
    audio.pause();
    audio.src = bgmUrl;
    audio.load();
    
    // 如果之前在播放，继续播放新的
    if (wasPlaying && !isMuted) {
      audio.play().catch((err) => {
        console.warn('BGM 自动播放失败:', err);
      });
    }
  }, [currentLevel, isPlaying, isMuted]);

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 切换静音
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  // 设置音量
  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = clampedVolume;
    }
  }, [isMuted]);

  // 手动播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    // 确保有音乐源
    if (!currentBgmRef.current) {
      const bgmUrl = BGM_MAP[currentLevel];
      if (bgmUrl) {
        currentBgmRef.current = bgmUrl;
        audioRef.current.src = bgmUrl;
        audioRef.current.load();
      }
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('BGM 播放失败:', err);
      });
    }
  }, [isPlaying, currentLevel]);

  return {
    isPlaying,
    isMuted,
    volume,
    toggleMute,
    togglePlay,
    changeVolume
  };
}
