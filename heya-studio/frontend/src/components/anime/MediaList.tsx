import React, { useState } from 'react'
import { THEME_COLORS, ThemeId } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'anime' | 'movie' | 'music' | 'game' | 'book'

export interface MediaItem {
  title: string
  platform?: string // B站 / Steam / Pixiv 等
  rating?: number // 1-5 星
  cover?: string
  comment?: string
  link?: string
}

export interface MediaListProps {
  items: MediaItem[]
  mediaType?: MediaType
  variant?: 'grid' | 'list' | 'carousel'
  columns?: number
  showRating?: boolean
  theme?: ThemeId
  title?: string
}

// ─── Platform Icons & Colors ───────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { color: string; icon: string }> = {
  'B站': { color: '#00A1D6', icon: '📺' },
  '哔哩哔哩': { color: '#00A1D6', icon: '📺' },
  'Steam': { color: '#1B2838', icon: '🎮' },
  'Pixiv': { color: '#0096FA', icon: '🎨' },
  'Netflix': { color: '#E50914', icon: '🎬' },
  'Spotify': { color: '#1DB954', icon: '🎵' },
  'YouTube': { color: '#FF0000', icon: '▶️' },
  '豆瓣': { color: '#00B51D', icon: '📖' },
  '京东': { color: '#E2231A', icon: '🛒' },
  'Kindle': { color: '#FF9900', icon: '📚' },
  'Apple Music': { color: '#FA243C', icon: '🎵' },
  '网易云音乐': { color: '#C20C0C', icon: '🎵' },
  'default': { color: '#888888', icon: '📁' },
}

const MEDIA_TYPE_CONFIG: Record<MediaType, { icon: string; label: string }> = {
  'anime': { icon: '🎬', label: '动画' },
  'movie': { icon: '🎥', label: '电影' },
  'music': { icon: '🎵', label: '音乐' },
  'game': { icon: '🎮', label: '游戏' },
  'book': { icon: '📚', label: '书籍' },
}

// ─── Rating Stars ───────────────────────────────────────────────────────────────

const RatingStars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 12 }) => {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array(fullStars).fill(0).map((_, i) => (
        <span key={`full-${i}`} style={{ fontSize: size }}>★</span>
      ))}
      {hasHalf && <span key="half" style={{ fontSize: size, opacity: 0.5 }}>★</span>}
      {Array(emptyStars).fill(0).map((_, i) => (
        <span key={`empty-${i}`} style={{ fontSize: size, opacity: 0.2 }}>☆</span>
      ))}
    </span>
  )
}

// ─── MediaList Component ─────────────────────────────────────────────────────────

const MediaList: React.FC<MediaListProps> = ({
  items,
  mediaType = 'anime',
  variant = 'grid',
  columns = 3,
  showRating = true,
  theme = 'sakura',
  title,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const colors = THEME_COLORS[theme]
  const typeConfig = MEDIA_TYPE_CONFIG[mediaType]

  const getPlatformStyle = (platform?: string) => {
    const config = platform ? (PLATFORM_CONFIG[platform] || PLATFORM_CONFIG['default']) : PLATFORM_CONFIG['default']
    return config
  }

  // Grid 布局
  if (variant === 'grid') {
    return (
      <div className="w-full">
        {/* 标题 */}
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{typeConfig.icon}</span>
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {title}
            </span>
          </div>
        )}

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {items.map((item, i) => {
            const platformStyle = getPlatformStyle(item.platform)
            const isHovered = hoveredIndex === i

            return (
              <div
                key={i}
                className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200"
                style={{
                  transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: isHovered ? `0 4px 12px rgba(0,0,0,0.15)` : '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* 封面 */}
                <div
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative"
                >
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                      {typeConfig.icon}
                    </div>
                  )}

                  {/* 平台标签 */}
                  {item.platform && (
                    <span
                      className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: platformStyle.color,
                        color: 'white',
                      }}
                    >
                      {platformStyle.icon} {item.platform}
                    </span>
                  )}
                </div>

                {/* 信息区 */}
                <div className="p-2 bg-white">
                  <div
                    className="text-xs font-medium truncate mb-1"
                    style={{ color: colors.text }}
                  >
                    {item.title}
                  </div>

                  {/* 评分 */}
                  {showRating && item.rating && (
                    <div className="text-xs" style={{ color: colors.primary }}>
                      <RatingStars rating={item.rating} size={10} />
                    </div>
                  )}

                  {/* 简评 */}
                  {item.comment && (
                    <div className="text-xs text-gray-400 truncate mt-1">
                      {item.comment}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* 空状态 */}
          {items.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 text-xs">
              添加你喜欢的{typeConfig.label}
            </div>
          )}
        </div>
      </div>
    )
  }

  // List 布局
  if (variant === 'list') {
    return (
      <div className="w-full">
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{typeConfig.icon}</span>
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {title}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item, i) => {
            const platformStyle = getPlatformStyle(item.platform)

            return (
              <div
                key={i}
                className="flex gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                {/* 封面缩略 */}
                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.cover ? (
                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      {typeConfig.icon}
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {item.platform && (
                      <span
                        className="px-1 py-0.5 rounded text-xs"
                        style={{
                          background: platformStyle.color + '20',
                          color: platformStyle.color,
                        }}
                      >
                        {item.platform}
                      </span>
                    )}
                    {showRating && item.rating && (
                      <span className="text-xs" style={{ color: colors.primary }}>
                        <RatingStars rating={item.rating} size={10} />
                      </span>
                    )}
                  </div>
                  {item.comment && (
                    <div className="text-xs text-gray-400 truncate mt-1">
                      {item.comment}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Carousel 布局（横向滚动）
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{typeConfig.icon}</span>
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {title}
          </span>
        </div>
      )}

      <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
        {items.map((item, i) => {
          const platformStyle = getPlatformStyle(item.platform)

          return (
            <div
              key={i}
              className="w-32 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              <div className="aspect-square bg-gray-100 relative">
                {item.cover ? (
                  <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                    {typeConfig.icon}
                  </div>
                )}
                {item.platform && (
                  <span
                    className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-xs font-medium"
                    style={{ background: platformStyle.color, color: 'white' }}
                  >
                    {item.platform}
                  </span>
                )}
              </div>
              <div className="p-1.5 bg-white">
                <div className="text-xs font-medium truncate">{item.title}</div>
                {showRating && item.rating && (
                  <div className="text-xs" style={{ color: colors.primary }}>
                    <RatingStars rating={item.rating} size={10} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MediaList