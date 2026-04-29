import React, { useState, useEffect, useRef } from 'react'

interface MusicPlayerProps {
  song: {
    name: string
    artist: string
    cover?: string
    url?: string
  }
  variant?: 'minimal' | 'full'
  autoplay?: boolean
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  song,
  variant = 'minimal',
  autoplay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // 如果有播放链接，使用真实音频
  useEffect(() => {
    if (song.url && audioRef.current) {
      audioRef.current.src = song.url
      if (autoplay) {
        audioRef.current.play().catch(() => {
          // 自动播放可能被浏览器阻止
          setIsPlaying(false)
        })
      }
    }
  }, [song.url, autoplay])

  // 模拟播放进度（无真实音频时）
  useEffect(() => {
    if (!song.url && isPlaying) {
      const timer = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 1))
      }, 500)
      return () => clearInterval(timer)
    }
  }, [isPlaying, song.url])

  // 音频事件处理
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(percent)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  const togglePlay = () => {
    if (audioRef.current && song.url) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  if (variant === 'full') {
    return (
      <div className="bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm">
        {/* 封面 */}
        <div className="relative mb-3">
          <div 
            className="w-full aspect-square rounded-lg overflow-hidden shadow-md"
            style={{ 
              background: song.cover ? `url(${song.cover}) center/cover` : '#F5F5F5',
            }}
          >
            {!song.cover && (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🎵
              </div>
            )}
            {/* 播放状态覆盖 */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center animate-pulse">
                  <span className="text-xl">🎵</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 歌曲信息 */}
        <div className="mb-3">
          <div className="text-sm font-medium truncate">{song.name || '歌曲名称'}</div>
          <div className="text-xs text-gray-400 truncate">{song.artist || '歌手'}</div>
        </div>

        {/* 进度条 */}
        <div className="mb-3">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(progress * duration / 100)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-4">
          <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
            ⏮
          </button>
          <button 
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
            ⏭
          </button>
        </div>

        {/* 隐藏的音频元素 */}
        {song.url && (
          <audio 
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            style={{ display: 'none' }}
          />
        )}
      </div>
    )
  }

  // Minimal variant (默认)
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg backdrop-blur-sm">
      {/* 封面 */}
      <div 
        className="w-10 h-10 rounded flex items-center justify-center overflow-hidden shadow-sm"
        style={{ 
          background: song.cover ? `url(${song.cover}) center/cover` : '#F5F5F5',
        }}
      >
        {!song.cover && <span className="text-lg">🎵</span>}
      </div>

      {/* 歌曲信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{song.name || '歌曲名称'}</div>
        <div className="text-xs text-gray-400 truncate">{song.artist || '歌手'}</div>
      </div>

      {/* 播放按钮 */}
      <button 
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs shadow-sm hover:shadow transition-shadow"
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* 隐藏的音频元素 */}
      {song.url && (
        <audio 
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          style={{ display: 'none' }}
        />
      )}
    </div>
  )
}

// 格式化时间
function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default MusicPlayer