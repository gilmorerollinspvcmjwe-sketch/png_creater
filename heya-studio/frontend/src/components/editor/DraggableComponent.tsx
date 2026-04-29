import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ComponentInstance, THEME_COLORS } from '@/types'
import { useEditorStore } from '@/stores'
import { FriendsList, MusicPlayer, QuoteTypewriter, HeroSection, MediaList } from '@/components/anime'
import Gallery from '@/components/Gallery'
import AchievementBadges from '@/components/AchievementBadges'
import MemorialCalendar from '@/components/MemorialCalendar'
import CPCard from '@/components/CPCard'
import MediaCard from '@/components/MediaCard'
import SupportRecord from '@/components/SupportRecord'
import { 
  GripVertical, 
  Trash2, 
  Lock, 
  Unlock,
  Maximize2
} from 'lucide-react'
import ComponentErrorBoundary from './ComponentErrorBoundary' // 🟡 6: ErrorBoundary

// Resize handle types
type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

interface DraggableComponentProps {
  component: ComponentInstance
  isSelected: boolean
  isHovered: boolean
  // Bug 2: 画布引用和位置计算函数
  canvasRef?: React.RefObject<HTMLDivElement | null>
  getAbsolutePosition?: (component: ComponentInstance) => { x: number; y: number }
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({
  component,
  isSelected,
  isHovered,
  canvasRef: _canvasRef, // 保留参数但不使用，未来可能用于计算选中框位置
  getAbsolutePosition,
}) => {
  const { 
    selectComponent, 
    hoverComponent, 
    removeComponent, 
    currentPage,
    setDragging,
    setResizing,
    updateComponentImmediate,
    pushHistory,
  } = useEditorStore()
  
  // 🔴 1: Resize 状态
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const resizeElementRef = useRef<HTMLDivElement>(null)
  
  const elementRef = useRef<HTMLDivElement>(null)
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    disabled: component.locked,
    data: { component },
  })
  
  // 锁定状态：阻止点击选中
  const handleClick = (e: React.MouseEvent) => {
    if (component.locked) return
    e.stopPropagation()
    selectComponent(component.id)
  }
  
  useEffect(() => {
    setNodeRef(elementRef.current!)
  }, [setNodeRef])
  
  // Bug 2: 使用绝对位置（考虑父容器偏移）
  const absolutePosition = getAbsolutePosition ? getAbsolutePosition(component) : { x: component.x, y: component.y }
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: absolutePosition.x,
    top: absolutePosition.y,
    width: component.width,
    height: component.height,
    zIndex: component.zIndex,
    transform: CSS.Translate.toString(transform),
    opacity: component.visible ? 1 : 0.5,
  }
  
  const themeColors = currentPage ? THEME_COLORS[currentPage.theme] : THEME_COLORS.sakura
  
  const handleMouseEnter = () => {
    if (!isSelected) hoverComponent(component.id)
  }
  
  const handleMouseLeave = () => {
    hoverComponent(null)
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeComponent(component.id)
  }
  
  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateComponentImmediate(component.id, { locked: !component.locked })
  }
  
  const handleExpandToFit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // 切换：满宽 ↔ 紧凑尺寸
    if (currentPage) {
      const isFullWidth = component.width >= currentPage.canvasWidth * 0.95
      if (isFullWidth) {
        // 已全屏 → 缩小到紧凑尺寸
        updateComponentImmediate(component.id, { 
          width: 200,
          height: Math.max(component.height, 100),
        })
        pushHistory()
      } else {
        // 未全屏 → 扩大到画布宽度
        updateComponentImmediate(component.id, { 
          width: currentPage.canvasWidth,
          height: Math.max(component.height, 200),
        })
        pushHistory()
      }
    }
  }
  
  // 🔴 P4: Resize 开始 - 增加 Alt 键支持
  const handleResizeStart = useCallback((handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    setResizingHandle(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: component.width,
      height: component.height,
    })
    setResizing(true)
  }, [component.width, component.height, setResizing])
  
  // 🔴 P4: Resize 移动 - Shift 锁定宽高比 + Alt 中心缩放
  useEffect(() => {
    if (!resizingHandle || !resizeStart) return
    
    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      const shiftKey = e.shiftKey // Shift 键锁定宽高比
      const altKey = e.altKey // 🔴 P4: Alt 键以中心为基准缩放
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = component.x
      let newY = component.y
      
      // 根据不同的 handle 计算新尺寸和位置
      const minSize = 20
      
      // 🔴 P4: Alt 键中心缩放逻辑
      if (altKey) {
        // 以中心为基准，两侧同时缩放
        
        if (resizingHandle.includes('e') || resizingHandle.includes('w')) {
          newWidth = Math.max(minSize, resizeStart.width + Math.abs(deltaX) * (resizingHandle.includes('e') ? 1 : -1) * 2)
          newX = component.x - (newWidth - resizeStart.width) / 2
        }
        if (resizingHandle.includes('n') || resizingHandle.includes('s')) {
          newHeight = Math.max(minSize, resizeStart.height + Math.abs(deltaY) * (resizingHandle.includes('s') ? 1 : -1) * 2)
          newY = component.y - (newHeight - resizeStart.height) / 2
        }
        // 角拖拽：宽高同时缩放
        if (resizingHandle.length === 2) {
          newWidth = Math.max(minSize, resizeStart.width + Math.abs(deltaX) * 2)
          newHeight = Math.max(minSize, resizeStart.height + Math.abs(deltaY) * 2)
          newX = component.x - (newWidth - resizeStart.width) / 2
          newY = component.y - (newHeight - resizeStart.height) / 2
        }
      } else {
        // 普通拖拽逻辑
        if (resizingHandle.includes('e')) {
          newWidth = Math.max(minSize, resizeStart.width + deltaX)
        }
        if (resizingHandle.includes('w')) {
          const possibleWidth = resizeStart.width - deltaX
          if (possibleWidth >= minSize) {
            newWidth = possibleWidth
            newX = component.x + deltaX
          }
        }
        if (resizingHandle.includes('s')) {
          newHeight = Math.max(minSize, resizeStart.height + deltaY)
        }
        if (resizingHandle.includes('n')) {
          const possibleHeight = resizeStart.height - deltaY
          if (possibleHeight >= minSize) {
            newHeight = possibleHeight
            newY = component.y + deltaY
          }
        }
      }
      
      // 🔴 P4: Shift 键锁定宽高比（适用于所有组件）
      if (shiftKey) {
        const aspectRatio = resizeStart.width / resizeStart.height
        if (resizingHandle.includes('e') || resizingHandle.includes('w') || altKey) {
          newHeight = newWidth / aspectRatio
          if (altKey) {
            newY = component.y - (newHeight - resizeStart.height) / 2
          }
        } else if (resizingHandle.includes('n') || resizingHandle.includes('s')) {
          newWidth = newHeight * aspectRatio
          if (altKey) {
            newX = component.x - (newWidth - resizeStart.width) / 2
          }
        } else {
          // 角拖拽：以宽度为准
          newHeight = newWidth / aspectRatio
          if (altKey) {
            newY = component.y - (newHeight - resizeStart.height) / 2
          }
        }
      }
      
      // 更新组件尺寸和位置
      updateComponentImmediate(component.id, {
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        x: Math.round(newX),
        y: Math.round(newY),
      })
    }
    
    const handleResizeEnd = () => {
      setResizingHandle(null)
      setResizeStart(null)
      setResizing(false)
      pushHistory()
    }
    
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    
    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizingHandle, resizeStart, component.id, component.x, component.y, component.type, updateComponentImmediate, setResizing, pushHistory])
  
  // 渲染组件内容
  const renderContent = () => {
    switch (component.type) {
      case 'text':
        return (
          <div 
            className="p-2"
            style={{
              fontSize: component.fontSize || 14,
              fontWeight: component.fontWeight || 'normal',
              textAlign: component.textAlign || 'left',
              color: component.color || themeColors.text,
              letterSpacing: component.letterSpacing || 0,
            }}
          >
            {component.content}
          </div>
        )
      
      case 'image':
        return component.src ? (
          <img 
            src={component.src} 
            alt={component.alt || ''}
            className="w-full h-full"
            style={{
              objectFit: component.objectFit || 'cover',
              borderRadius: component.borderRadius || 0,
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
            点击上传图片
          </div>
        )
      
      case 'avatar':
        return (
          <div className="w-full h-full relative">
            {component.src ? (
              <img 
                src={component.src}
                alt=""
                className="w-full h-full rounded-full object-cover border-3 border-white shadow-md"
                style={{
                  animation: component.showGlow ? 'avatar-glow 3s ease-in-out infinite' : 'none',
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                <span className="text-2xl">👤</span>
              </div>
            )}
          </div>
        )
      
      case 'container':
        return (
          <div 
            className="w-full h-full"
            style={{
              background: typeof component.background === 'string' 
                ? component.background 
                : '#FFFFFF',
              borderRadius: component.borderRadius || 8,
              border: component.borderColor ? `1px solid ${component.borderColor}` : '1px solid #EEE',
            }}
          />
        )
      
      case 'tag-group':
        return (
          <div className="p-2 flex flex-wrap gap-1">
            {component.tags.map((tag, i) => (
              <span 
                key={i}
                className="tag"
              >
                {tag}
              </span>
            ))}
            {component.tags.length === 0 && (
              <span className="text-gray-400 text-xs">添加标签</span>
            )}
          </div>
        )
      
      case 'social-links':
        return (
          <div className="p-2 flex gap-2">
            {component.links.map((link, i) => (
              <div 
                key={i}
                className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs"
              >
                {link.platform.slice(0, 2)}
              </div>
            ))}
            {component.links.length === 0 && (
              <span className="text-gray-400 text-xs">添加社交链接</span>
            )}
          </div>
        )
      
      case 'oshi-card':
        return (
          <div className="p-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${component.columns || 4}, 1fr)` }}>
            {component.characters.map((char, i) => (
              <div key={i} className="oshi-card">
                <div className="text-xs font-medium truncate">{char.name}</div>
                <div className="text-tiny text-gray-400 truncate">{char.from}</div>
              </div>
            ))}
            {component.characters.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-xs py-2">
                添加推し角色
              </div>
            )}
          </div>
        )
      
      case 'attribute-wall':
        return (
          <div className="p-2 grid grid-cols-2 gap-2">
            {component.attributes.map((attr, i) => (
              <div key={i} className="attribute-item">
                <span className="attribute-label">{attr.label}</span>
                <span className="attribute-value">{attr.value}</span>
              </div>
            ))}
            {component.attributes.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-xs py-2">
                添加属性标签
              </div>
            )}
          </div>
        )
      
      case 'friends-list':
        return <FriendsList friends={component.friends} variant={component.variant || 'grid'} />
      
      case 'music-player':
        return <MusicPlayer song={component.song} variant={component.variant || 'minimal'} autoplay={component.autoplay || false} />
      
      case 'quote':
        return (
          <QuoteTypewriter 
            text={component.text || '「引言内容」'} 
            translation={component.translation} 
            typewriterEffect={component.typewriterEffect ?? true} 
            fontSize={component.fontSize || 12} 
          />
        )
      
      case 'divider':
        return (
          <div className="w-full h-full flex items-center justify-center">
            {component.variant === 'dots' && (
              <span className="text-gray-300 text-xs tracking-widest">☆ · ☆ · ☆</span>
            )}
            {component.variant === 'line' && (
              <div className="w-full h-px bg-gray-200" />
            )}
            {component.variant === 'stars' && (
              <span className="text-gray-300 text-xs">✦ ✦ ✦</span>
            )}
          </div>
        )
      
      case 'spacer':
        return (
          <div className="w-full h-full bg-transparent border border-dashed border-gray-200" />
        )
      
      case 'hero-section':
        return (
          <HeroSection
            avatar={component.avatar}
            name={component.name || '用户名'}
            signature={component.signature}
            signatureTypewriter={component.signatureTypewriter ?? true}
            mbti={component.mbti}
            bloodType={component.bloodType}
            zodiac={component.zodiac}
            age={component.age}
            customAttributes={component.customAttributes}
            showGlow={component.showGlow ?? true}
            glowColor={component.glowColor}
            backgroundGradient={component.backgroundGradient}
            backgroundImage={component.backgroundImage}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'media-list':
        return (
          <MediaList
            items={component.items || []}
            mediaType={component.mediaType || 'anime'}
            variant={component.variant || 'grid'}
            columns={component.columns || 3}
            showRating={component.showRating ?? true}
            title={component.title}
            theme={currentPage?.theme}
          />
        )
      
      // 新增组件渲染
      case 'merchandise-card':
        return (
          <div className="w-full h-full bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-100">
            {/* 图片区域 */}
            {component.imageUrl ? (
              <div className="relative h-32 overflow-hidden">
                <img
                  src={component.imageUrl}
                  alt={component.name}
                  className="w-full h-full object-cover"
                />
                {component.sourceWork && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {component.sourceWork}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative h-32 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                <span className="text-4xl">🎁</span>
                {component.sourceWork && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {component.sourceWork}
                  </div>
                )}
              </div>
            )}
            {/* 内容区域 */}
            <div className="p-2">
              <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                {component.name || '我的谷子'}
              </h3>
              {/* 元信息 */}
              <div className="flex flex-wrap gap-1 mb-1">
                {component.rarity && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                    {component.rarity}
                  </span>
                )}
                {component.condition && (
                  <span className="text-xs text-green-600">· {component.condition}</span>
                )}
              </div>
              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                {component.purchaseDate && <span>{component.purchaseDate}</span>}
                {component.price && <span className="text-pink-500 font-medium">¥{component.price}</span>}
              </div>
              {component.notes && (
                <div className="mt-1 text-xs text-gray-600 italic">"{component.notes}"</div>
              )}
            </div>
          </div>
        )
      
      case 'guestbook':
        return (
          <div className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-3 py-2 border-b border-gray-100">
              <h2 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <span>💬</span>
                {component.title || '留言板'}
                {component.messages && component.messages.length > 0 && (
                  <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                    {component.messages.length}
                  </span>
                )}
              </h2>
            </div>
            {/* 留言列表 */}
            <div className="p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {!component.messages || component.messages.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <span className="text-2xl mb-1">🌸</span>
                  <p className="text-xs">还没有留言~</p>
                </div>
              ) : (
                component.messages.slice(0, 5).map((msg: any) => (
                  <div key={msg.id} className={`bg-gray-50 rounded-lg p-2 ${msg.isOwnerReply ? 'ml-4 bg-gradient-to-r from-pink-50 to-purple-50' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.avatar ? (
                        <img src={msg.avatar} alt={msg.author} className="w-4 h-4 rounded-full" />
                      ) : (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${msg.isOwnerReply ? 'bg-gradient-to-br from-pink-400 to-purple-400 text-white' : 'bg-gray-200'}`}
                        >
                          {msg.author.charAt(0)}
                        </div>
                      )}
                      <span className={`font-medium text-xs ${msg.isOwnerReply ? 'text-purple-600' : 'text-gray-700'}`}>
                        {msg.isOwnerReply ? '✨ 主人' : msg.author}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      
      case 'watchlist':
        return (
          <div className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm p-3">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <span>📺</span>
                {component.title || '我的追番'}
              </h2>
              {component.items && (
                <span className="text-xs text-gray-500">共 {component.items.length} 部</span>
              )}
            </div>
            {/* 番剧列表 */}
            <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
              {!component.items || component.items.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <span className="text-2xl mb-1">🎬</span>
                  <p className="text-xs">还没有追番记录</p>
                </div>
              ) : (
                component.items.slice(0, 6).map((item: any) => (
                  <div key={item.title} className="flex items-center gap-2 bg-gray-50 rounded-lg p-1.5">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-8 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-10 rounded bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-xs">📀</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{item.titleCn || item.title}</div>
                      {item.watchedEpisodes && item.episodes && (
                        <div className="text-xs text-gray-500">{item.watchedEpisodes}/{item.episodes}</div>
                      )}
                    </div>
                    {component.showScore && item.score && (
                      <div className={`text-xs font-medium ${item.score >= 8 ? 'text-green-500' : item.score >= 6 ? 'text-blue-500' : 'text-gray-400'}`}>
                        {item.score}
                      </div>
                    )}
                    {component.groupByStatus && item.status && (
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        item.status === 'watching' ? 'bg-blue-100 text-blue-600' :
                        item.status === 'completed' ? 'bg-green-100 text-green-600' :
                        item.status === 'dropped' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status === 'watching' ? '👀' : item.status === 'completed' ? '✅' : item.status === 'dropped' ? '❌' : '💭'}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      
      // Phase 2 新增组件渲染
      case 'gallery':
        return (
          <Gallery
            title={component.title}
            images={component.images || []}
            layout={component.layout || 'grid'}
            columns={component.columns || 3}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'achievement-badges':
        return (
          <AchievementBadges
            title={component.title}
            badges={component.badges || []}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'memorial-calendar':
        return (
          <MemorialCalendar
            title={component.title}
            events={component.events || []}
            showCountdown={component.showCountdown ?? true}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'cp-card':
        return (
          <CPCard
            character1={component.character1 || { name: '角色1' }}
            character2={component.character2 || { name: '角色2' }}
            relationship={component.relationship}
            sourceWork={component.sourceWork}
            tags={component.tags}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'media-card':
        return (
          <MediaCard
            title={component.title || '作品标题'}
            mediaType={component.mediaType || 'anime'}
            coverUrl={component.coverUrl}
            rating={component.rating || 0}
            review={component.review}
            tags={component.tags}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      case 'support-record':
        return (
          <SupportRecord
            title={component.title}
            records={component.records || []}
            theme={currentPage?.theme}
            width={component.width}
            height={component.height}
          />
        )
      
      default:
        // TypeScript exhaustive check
        return (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            未知组件
          </div>
        )
    }
  }
  
  return (
    <ComponentErrorBoundary 
      componentId={component.id} 
      componentType={component.type} 
      onDelete={removeComponent}
    >
    <div
      ref={elementRef}
      style={style}
      className={`absolute-component cursor-move ${
        isSelected ? 'component-selected' : ''
      } ${isHovered && !isSelected ? 'component-hover' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 组件内容 */}
      <div className="w-full h-full overflow-hidden">
        {renderContent()}
      </div>
      
      {/* 控制层 - 仅选中时显示 */}
      {isSelected && (
        <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2">
          {/* 拖拽手柄 */}
          <div 
            {...listeners} 
            {...attributes}
            className="flex items-center gap-1 px-2 py-1 bg-white rounded shadow text-xs cursor-grab"
            onMouseDown={() => setDragging(true)}
          >
            <GripVertical size={12} />
            <span className="text-gray-500">{component.type}</span>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandToFit}
              className="p-1 bg-white rounded shadow hover:bg-gray-50"
              title={component.width >= (currentPage?.canvasWidth || 680) * 0.95 ? '缩小到紧凑尺寸' : '扩大到画布宽度'}
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={handleToggleLock}
              className="p-1 bg-white rounded shadow hover:bg-gray-50"
              title={component.locked ? '解锁' : '锁定'}
            >
              {component.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <button
              onClick={handleDelete}
              className="p-1 bg-white rounded shadow hover:bg-red-50 text-red-500"
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
      
      {/* 🔴 1: 8 个 Resize 手柄 */}
      {isSelected && (
        <>
          {/* 四角 */}
          <div 
            ref={resizeElementRef}
            className="resize-handle -left-1 -top-1 cursor-nw-resize" 
            onMouseDown={(e) => handleResizeStart('nw', e)}
          />
          <div 
            className="resize-handle -right-1 -top-1 cursor-ne-resize" 
            onMouseDown={(e) => handleResizeStart('ne', e)}
          />
          <div 
            className="resize-handle -left-1 -bottom-1 cursor-sw-resize" 
            onMouseDown={(e) => handleResizeStart('sw', e)}
          />
          <div 
            className="resize-handle -right-1 -bottom-1 cursor-se-resize" 
            onMouseDown={(e) => handleResizeStart('se', e)}
          />
          {/* 四边中点 */}
          <div 
            className="resize-handle left-1/2 -top-1 -translate-x-1/2 cursor-n-resize" 
            onMouseDown={(e) => handleResizeStart('n', e)}
          />
          <div 
            className="resize-handle left-1/2 -bottom-1 -translate-x-1/2 cursor-s-resize" 
            onMouseDown={(e) => handleResizeStart('s', e)}
          />
          <div 
            className="resize-handle -left-1 top-1/2 -translate-y-1/2 cursor-w-resize" 
            onMouseDown={(e) => handleResizeStart('w', e)}
          />
          <div 
            className="resize-handle -right-1 top-1/2 -translate-y-1/2 cursor-e-resize" 
            onMouseDown={(e) => handleResizeStart('e', e)}
          />
        </>
      )}
    </div>
    </ComponentErrorBoundary>
  )
}

export default DraggableComponent