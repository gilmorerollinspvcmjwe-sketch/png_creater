import React, { useState } from 'react'
import { ThemeId } from '@/types'

interface AchievementBadge {
  id: string
  name: string
  icon?: string
  source?: string
  date?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  description?: string
}

interface AchievementBadgesProps {
  title?: string
  badges: AchievementBadge[]
  theme?: ThemeId
  width?: number
  height?: number
}

const rarityColors = {
  common: {
    border: '#9CA3AF',
    bg: 'from-gray-100 to-gray-50',
    text: '#6B7280',
    glow: 'rgba(156, 163, 175, 0.3)',
  },
  rare: {
    border: '#3B82F6',
    bg: 'from-blue-100 to-blue-50',
    text: '#2563EB',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  epic: {
    border: '#8B5CF6',
    bg: 'from-purple-100 to-purple-50',
    text: '#7C3AED',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  legendary: {
    border: '#F59E0B',
    bg: 'from-amber-100 to-amber-50',
    text: '#D97706',
    glow: 'rgba(245, 158, 11, 0.6)',
  },
}

const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  title = '我的成就',
  badges = [],
  theme: _theme = 'sakura',
  width = 680,
  height = 200,
}) => {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)
  // _theme reserved for future styling

  // 空状态
  if (badges.length === 0) {
    return (
      <div 
        className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width, minHeight: height }}
      >
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>🏆</span>
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-400">
          <div className="text-center">
            <span className="text-3xl mb-2">🏅</span>
            <p className="text-sm">还没有获得徽章</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
      style={{ width }}
    >
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span>🏆</span>
          {title}
          <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
            {badges.length}
          </span>
        </h2>
      </div>
      <div className="p-3 flex flex-wrap gap-3">
        {badges.map((badge) => {
          const rarityStyle = rarityColors[badge.rarity || 'common']
          return (
            <div
              key={badge.id}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              {/* 徽章主体 */}
              <div 
                className={`w-20 h-20 rounded-xl bg-gradient-to-br ${rarityStyle.bg} border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                  hoveredBadge === badge.id ? 'scale-105 shadow-lg' : ''
                }`}
                style={{ 
                  borderColor: rarityStyle.border,
                  boxShadow: hoveredBadge === badge.id ? `0 0 20px ${rarityStyle.glow}` : 'none',
                }}
              >
                {/* 图标 */}
                <span className="text-2xl mb-1">
                  {badge.icon || '🏅'}
                </span>
                {/* 名称 */}
                <span 
                  className="text-xs font-medium text-center line-clamp-1 px-1"
                  style={{ color: rarityStyle.text }}
                >
                  {badge.name}
                </span>
              </div>
              {/* Hover 详情 */}
              {hoveredBadge === badge.id && (
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg px-3 py-2 w-48 border">
                  <div className="text-xs font-medium text-gray-900 mb-1">{badge.name}</div>
                  {badge.source && (
                    <div className="text-xs text-gray-500 mb-1">来源: {badge.source}</div>
                  )}
                  {badge.date && (
                    <div className="text-xs text-gray-500 mb-1">获得: {badge.date}</div>
                  )}
                  {badge.description && (
                    <div className="text-xs text-gray-600 italic">{badge.description}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AchievementBadges