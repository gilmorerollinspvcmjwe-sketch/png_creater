import React, { useState } from 'react'
import { ThemeId, MediaType } from '@/types'

interface MediaCardProps {
  title: string
  mediaType: MediaType
  coverUrl?: string
  rating?: number
  review?: string
  tags?: string[]
  theme?: ThemeId
  width?: number
  height?: number
}

const mediaTypeIcons = {
  anime: '📺',
  movie: '🎬',
  game: '🎮',
  book: '📚',
  music: '🎵',
}

const mediaTypeLabels = {
  anime: '番剧',
  movie: '电影',
  game: '游戏',
  book: '书籍',
  music: '音乐',
}

const mediaTypeColors = {
  anime: 'from-blue-100 to-indigo-50',
  movie: 'from-orange-100 to-red-50',
  game: 'from-green-100 to-teal-50',
  book: 'from-yellow-100 to-amber-50',
  music: 'from-purple-100 to-pink-50',
}

const MediaCard: React.FC<MediaCardProps> = ({
  title,
  mediaType = 'anime',
  coverUrl,
  rating = 0,
  review,
  tags = [],
  theme: _theme = 'sakura',
  width = 340,
  height = 200,
}) => {
  const [hovered, setHovered] = useState(false)
  // _theme reserved for future styling

  // 星星评分渲染
  const renderStars = (score: number) => {
    const fullStars = Math.floor(score / 2)
    const halfStar = score % 2 === 1
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <span key={i} className="text-yellow-400 text-sm">★</span>
        ))}
        {halfStar && <span className="text-yellow-400 text-sm">☆</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={i} className="text-gray-300 text-sm">☆</span>
        ))}
        <span className="text-xs text-gray-500 ml-1">{score}/10</span>
      </div>
    )
  }

  return (
    <div 
      className={`w-full h-full rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
        hovered ? 'shadow-lg scale-[1.02]' : ''
      }`}
      style={{ width, minHeight: height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 封面图片 */}
      <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${mediaTypeColors[mediaType]}`}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {mediaTypeIcons[mediaType]}
          </div>
        )}
        {/* 类型标签 */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
          <span>{mediaTypeIcons[mediaType]}</span>
          <span>{mediaTypeLabels[mediaType]}</span>
        </div>
        {/* 评分标签 */}
        {rating > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-white text-xs px-2 py-0.5 rounded font-medium">
            ⭐ {rating}
          </div>
        )}
      </div>
      
      {/* 内容区域 */}
      <div className="p-3 bg-white border-t border-gray-100">
        {/* 标题 */}
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
          {title}
        </h3>
        
        {/* 评分星星 */}
        {rating > 0 && (
          <div className="mb-2">
            {renderStars(rating)}
          </div>
        )}
        
        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 4).map((tag, i) => (
              <span 
                key={i}
                className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* 简评 */}
        {review && (
          <p className="text-xs text-gray-500 italic line-clamp-2">
            "{review}"
          </p>
        )}
      </div>
    </div>
  )
}

export default MediaCard