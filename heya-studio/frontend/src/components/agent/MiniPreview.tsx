import React from 'react'
import { PageConfig, THEME_COLORS, ComponentInstance } from '@/types'

interface MiniPreviewProps {
  config: PageConfig
}

const MiniPreview: React.FC<MiniPreviewProps> = ({ config }) => {
  const themeColors = THEME_COLORS[config.theme]
  const scale = 0.35 // 缩略比例

  const canvasStyle: React.CSSProperties = {
    width: config.canvasWidth * scale,
    height: config.canvasHeight * scale,
    background: config.background?.type === 'gradient'
      ? config.background.value
      : themeColors.secondary,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  }

  // 渲染单个组件的缩略版本
  const renderMiniComponent = (comp: ComponentInstance) => {
    const miniStyle: React.CSSProperties = {
      position: 'absolute',
      left: comp.x * scale,
      top: comp.y * scale,
      width: comp.width * scale,
      height: comp.height * scale,
      zIndex: comp.zIndex,
      overflow: 'hidden',
    }
    
    // 根据类型添加特定样式
    if ('fontSize' in comp) {
      miniStyle.fontSize = Math.max(8, (comp.fontSize || 14) * scale)
    }

    switch (comp.type) {
      case 'avatar':
        return (
          <div key={comp.id} style={miniStyle}>
            {comp.src ? (
              <img
                src={comp.src}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200" />
            )}
          </div>
        )

      case 'text':
        return (
          <div
            key={comp.id}
            style={{
              ...miniStyle,
              padding: '4px',
              textAlign: comp.textAlign || 'left',
              color: comp.color || themeColors.text,
            }}
          >
            <span className="truncate">{comp.content}</span>
          </div>
        )

      case 'oshi-card':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${comp.columns || 4}, 1fr)` }}>
              {comp.characters.slice(0, 8).map((char, i) => (
                <div key={i} className="text-xs text-center truncate">
                  {char.name}
                </div>
              ))}
            </div>
          </div>
        )

      case 'attribute-wall':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="flex flex-wrap gap-1">
              {comp.attributes.slice(0, 6).map((attr, i) => (
                <span key={i} className="text-xs px-1 bg-gray-100 rounded truncate">
                  {attr.value}
                </span>
              ))}
            </div>
          </div>
        )

      case 'tag-group':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="flex flex-wrap gap-0.5">
              {comp.tags.slice(0, 8).map((tag, i) => (
                <span key={i} className="text-xs px-1 rounded bg-gray-100 truncate">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )

      case 'music-player':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="flex items-center gap-1">
              <span className="text-lg">🎵</span>
              <span className="text-xs truncate">{comp.song.name || '音乐'}</span>
            </div>
          </div>
        )

      case 'friends-list':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="flex gap-1">
              {comp.friends.slice(0, 4).map((friend, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden"
                >
                  {friend.avatar && (
                    <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case 'quote':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <span className="text-xs italic truncate">{comp.text?.slice(0, 20)}...</span>
          </div>
        )

      case 'image':
        return (
          <div key={comp.id} style={miniStyle}>
            {comp.src ? (
              <img src={comp.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
        )

      case 'container':
        return (
          <div
            key={comp.id}
            style={{
              ...miniStyle,
              background: typeof comp.background === 'string' ? comp.background : '#FFF',
              borderRadius: comp.borderRadius ? comp.borderRadius * scale : 4,
            }}
          />
        )

      case 'divider':
        return (
          <div key={comp.id} style={miniStyle}>
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-gray-300">☆</span>
            </div>
          </div>
        )

      case 'spacer':
        return null // 不渲染 spacer

      case 'social-links':
        return (
          <div key={comp.id} style={{ ...miniStyle, padding: '2px' }}>
            <div className="flex gap-0.5">
              {comp.links.slice(0, 5).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-gray-200" />
              ))}
            </div>
          </div>
        )

      default:
        return (
          <div key={comp.id} style={miniStyle} className="bg-gray-100" />
        )
    }
  }

  return (
    <div style={canvasStyle} data-theme={config.theme}>
      {/* 渲染所有组件 */}
      {config.components.map(renderMiniComponent)}

      {/* 空状态 */}
      {config.components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
          空白页面
        </div>
      )}
    </div>
  )
}

export default MiniPreview