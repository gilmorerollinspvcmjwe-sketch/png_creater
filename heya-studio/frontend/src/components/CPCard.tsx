import React, { useState } from 'react'
import { THEME_COLORS, ThemeId } from '@/types'

interface CPCharacter {
  name: string
  imageUrl?: string
  color?: string
}

interface CPCardProps {
  character1: CPCharacter
  character2: CPCharacter
  relationship?: string
  sourceWork?: string
  tags?: string[]
  theme?: ThemeId
  width?: number
  height?: number
}

const CPCard: React.FC<CPCardProps> = ({
  character1,
  character2,
  relationship = 'CP',
  sourceWork,
  tags = [],
  theme = 'sakura',
  width = 680,
  height = 200,
}) => {
  const [hoveredChar, setHoveredChar] = useState<'char1' | 'char2' | null>(null)
  const themeColors = THEME_COLORS[theme]

  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm relative"
      style={{ width, minHeight: height }}
    >
      {/* 背景 CP 连接效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 opacity-50" />
      
      {/* 来源作品 */}
      {sourceWork && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          {sourceWork}
        </div>
      )}
      
      {/* 双角色展示 */}
      <div className="relative flex items-center justify-center gap-8 py-6 px-4">
        {/* 角色1 */}
        <div
          className="flex flex-col items-center cursor-pointer"
          onMouseEnter={() => setHoveredChar('char1')}
          onMouseLeave={() => setHoveredChar(null)}
        >
          <div 
            className={`w-20 h-20 rounded-full overflow-hidden border-3 transition-all duration-300 ${
              hoveredChar === 'char1' ? 'scale-110 shadow-lg' : ''
            }`}
            style={{
              borderColor: character1.color || themeColors.primary,
              boxShadow: hoveredChar === 'char1' ? `0 0 20px ${character1.color || themeColors.primary}40` : 'none',
            }}
          >
            {character1.imageUrl ? (
              <img 
                src={character1.imageUrl} 
                alt={character1.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: character1.color || themeColors.primary + '20' }}
              >
                👤
              </div>
            )}
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900">
            {character1.name}
          </div>
          {/* 心形动画 */}
          {hoveredChar === 'char1' && (
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse">
              💕
            </div>
          )}
        </div>
        
        {/* 关系连接 */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-0.5 bg-gradient-to-r from-pink-300 to-purple-300" />
          <div className="text-xs font-medium px-2 py-0.5 rounded bg-white/80 text-gray-700">
            {relationship}
          </div>
          <div className="w-16 h-0.5 bg-gradient-to-r from-purple-300 to-pink-300" />
        </div>
        
        {/* 角色2 */}
        <div
          className="flex flex-col items-center cursor-pointer"
          onMouseEnter={() => setHoveredChar('char2')}
          onMouseLeave={() => setHoveredChar(null)}
        >
          <div 
            className={`w-20 h-20 rounded-full overflow-hidden border-3 transition-all duration-300 ${
              hoveredChar === 'char2' ? 'scale-110 shadow-lg' : ''
            }`}
            style={{
              borderColor: character2.color || themeColors.accent,
              boxShadow: hoveredChar === 'char2' ? `0 0 20px ${character2.color || themeColors.accent}40` : 'none',
            }}
          >
            {character2.imageUrl ? (
              <img 
                src={character2.imageUrl} 
                alt={character2.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: character2.color || themeColors.accent + '20' }}
              >
                👤
              </div>
            )}
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900">
            {character2.name}
          </div>
          {hoveredChar === 'char2' && (
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse">
              💕
            </div>
          )}
        </div>
      </div>
      
      {/* 标签 */}
      {tags.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {tags.slice(0, 5).map((tag, i) => (
            <span 
              key={i}
              className="text-xs bg-white/80 px-2 py-0.5 rounded text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default CPCard