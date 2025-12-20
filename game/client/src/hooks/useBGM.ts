import { useEffect, useRef, useState, useCallback } from 'react';

// BGM 映射：关卡 -> 音乐文件
const BGM_MAP: Record<string, string> = {
  lobby: '/music/01.mp3', // 大厅/等待房间用密室音乐
  waiting: '/music/01.mp3', // 等待房间
  level1: '/music/01.mp3', // 密室
  level2: '/music/02.mp3', // 藏匿
  'turtle-soup': '/music/03.mp3', // 海龟汤
  level3: '/music/04.mp3', // 人物剧情
  boss1: '/music/05.mp3', // BOSS战 - 鼠鼠大王
  boss2: '/music/05.mp3', // BOSS战 - 百变小鹦
  boss3: '/music/05.mp3', // BOSS战 - 死神
  ending: '/music/04.mp3' // 结局用温馨的音乐
};

// 默认音量
const DEFAULT_VOLUME = 0.5;

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
      audio.addEventListener('play', () => {
        console.log('🎵 BGM 开始播放');
        setIsPlaying(true);
      });
      audio.addEventListener('pause', () => {
        console.log('⏸️ BGM 暂停');
        setIsPlaying(false);
      });
      audio.addEventListener('error', (e) => {
        console.error('❌ BGM 加载错误:', e);
      });
      audio.addEventListener('canplaythrough', () => {
        console.log('✅ BGM 可以播放');
      });

      // 立即加载第一首音乐
      const initialBgm = BGM_MAP[currentLevel] || BGM_MAP.lobby;
      console.log('🎵 初始化 BGM:', initialBgm, '当前关卡:', currentLevel);
      audio.src = initialBgm;
      currentBgmRef.current = initialBgm;
      audio.load();
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
    console.log('🎵 关卡变化:', currentLevel, '-> BGM:', bgmUrl);

    if (!bgmUrl || !audioRef.current) {
      console.log('⚠️ 跳过切换: bgmUrl=', bgmUrl, 'audio=', !!audioRef.current);
      return;
    }

    // 如果是同一首 BGM，不需要切换
    if (currentBgmRef.current === bgmUrl) {
      console.log('🎵 同一首 BGM，跳过切换');
      return;
    }

    currentBgmRef.current = bgmUrl;
    console.log('🎵 切换 BGM 到:', bgmUrl);

    // 切换音乐
    const audio = audioRef.current;
    const wasPlaying = isPlaying;
    audio.pause();
    audio.src = bgmUrl;
    audio.load();

    // 如果之前在播放，继续播放新的
    if (wasPlaying && !isMuted) {
      audio.play().catch((err) => {
        console.warn('⚠️ BGM 自动播放失败:', err);
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
    console.log('🎵 togglePlay 被调用, isPlaying:', isPlaying, 'audio:', !!audioRef.current);
    if (!audioRef.current) {
      console.error('❌ audioRef 为空');
      return;
    }

    // 确保有音乐源
    if (!audioRef.current.src || audioRef.current.src === window.location.href) {
      const bgmUrl = BGM_MAP[currentLevel] || BGM_MAP.lobby;
      console.log('🎵 设置音乐源:', bgmUrl);
      audioRef.current.src = bgmUrl;
      currentBgmRef.current = bgmUrl;
      audioRef.current.load();
    }

    if (isPlaying) {
      console.log('⏸️ 暂停播放');
      audioRef.current.pause();
    } else {
      console.log('▶️ 开始播放, src:', audioRef.current.src);
      audioRef.current.play().catch((err) => {
        console.error('❌ BGM 播放失败:', err);
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
