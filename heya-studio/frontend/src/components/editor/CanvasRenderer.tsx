import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useEditorStore, useUIStore } from '@/stores'
import { THEME_COLORS, ComponentInstance } from '@/types'
import DraggableComponent from './DraggableComponent'
import StarBackground from '@/components/anime/StarBackground'
import { useContainerWidth } from '@/hooks/useContainerWidth'

// 🟡 1: 网格间距常量（用于网格吸附功能）
export const GRID_SIZE = 8
// 🔴 P3: 对齐吸附阈值
export const ALIGNMENT_THRESHOLD = 8

const CanvasRenderer: React.FC = () => {
  const { currentPage, selectedComponentId, hoveredComponentId, showGrid, zoom, panX, panY, isPanning, setZoom, setPan, setIsPanning, setSelectedComponentIds } = useEditorStore()
  const { previewMode, previewDevice } = useUIStore()
  
  // 🟡 1: 对齐线状态
  const [alignmentLines, setAlignmentLines] = useState<{horizontal: number[], vertical: number[]}>({horizontal: [], vertical: []})
  // 🔴 P7: 框选状态
  const [marqueeSelection, setMarqueeSelection] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  // 🔴 P2: 平移拖拽起始位置
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  
  // 🔴 2: 画布引用，用于计算相对偏移
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 🔴 2: 动态获取容器宽度
  const containerWidth = useContainerWidth(containerRef)
  
  // 注册画布为 droppable 区域
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  })
  
  // 🔴 2: 合并 refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node)
    if (node) {
      (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
  }, [setNodeRef])
  
  // 🔴 2: 动态计算画布宽度
  const getCanvasWidth = useCallback(() => {
    if (!currentPage) return containerWidth || 680
    
    if (previewMode) {
      switch (previewDevice) {
        case 'mobile':
          return 375
        case 'tablet':
          return 768
        default:
          return containerWidth || currentPage.canvasWidth
      }
    }
    // 🔴 2: 响应式画布宽度 = 容器宽度
    return containerWidth || currentPage.canvasWidth
  }, [previewMode, previewDevice, containerWidth, currentPage])
  
  // 🔴 2: 计算画布高度 = 内容高度 + 200px 底部留白
  const getCanvasHeight = useCallback(() => {
    if (!currentPage) return 600
    
    // 计算内容高度（所有组件的最大 Y + height）
    const contentHeight = currentPage.components.reduce((max, comp) => {
      return Math.max(max, comp.y + comp.height)
    }, 0)
    
    // 🔴 5: 响应式高度 = 内容高度 + 200px 底部留白
    return Math.max(contentHeight + 200, 600) // 最小 600px
  }, [currentPage])
  
  // Bug 2: 获取组件的父容器（如果有）
  const getParentContainer = useCallback((component: ComponentInstance): ComponentInstance | null => {
    if (!currentPage) return null
    // 检查是否有容器包含此组件
    for (const comp of currentPage.components) {
      if (comp.type === 'container' && comp.children?.includes(component.id)) {
        return comp
      }
    }
    return null
  }, [currentPage])
  
  // Bug 2: 递归计算组件的绝对位置（累加父容器偏移）
  const getAbsolutePosition = useCallback((component: ComponentInstance): { x: number; y: number } => {
    let x = component.x
    let y = component.y
    let parent = getParentContainer(component)
    
    // 递归累加父容器偏移
    while (parent) {
      x += parent.x
      y += parent.y
      parent = getParentContainer(parent)
    }
    
    return { x, y }
  }, [getParentContainer])
  
  // 🔴 P1: Ctrl+滚轮缩放画布
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        // 向上滚动放大，向下滚动缩小
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      }
    }
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [zoom, setZoom])
  
  // 🔴 P2: Space 键监听（平移模式）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsPanning(true)
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false)
        setPanStart(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setIsPanning])
  
  // 🔴 P2: 平移鼠标事件处理
  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    if ((isPanning && e.button === 0) || e.button === 1) { // Space+左键 或 中键
      e.preventDefault()
      setPanStart({ x: e.clientX, y: e.clientY, panX, panY })
    }
  }, [isPanning, panX, panY])
  
  useEffect(() => {
    if (!panStart) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      setPan(panStart.panX + deltaX, panStart.panY + deltaY)
    }
    
    const handleMouseUp = () => {
      setPanStart(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [panStart, setPan])
  
  // 🔴 P7: 框选鼠标事件处理
  const handleMarqueeMouseDown = useCallback((e: React.MouseEvent) => {
    // 只在空白区域且未按 Space 时触发框选
    if (e.button === 0 && !isPanning && !previewMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - panX) / zoom
      const y = (e.clientY - rect.top - panY) / zoom
      setMarqueeSelection({ startX: x, startY: y, endX: x, endY: y })
    }
  }, [isPanning, previewMode, zoom, panX, panY])
  
  useEffect(() => {
    if (!marqueeSelection || !currentPage) return
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - panX) / zoom
      const y = (e.clientY - rect.top - panY) / zoom
      setMarqueeSelection(prev => prev ? { ...prev, endX: x, endY: y } : null)
    }
    
    const handleMouseUp = () => {
      if (marqueeSelection && currentPage) {
        // 计算框选区域内的组件
        const minX = Math.min(marqueeSelection.startX, marqueeSelection.endX)
        const maxX = Math.max(marqueeSelection.startX, marqueeSelection.endX)
        const minY = Math.min(marqueeSelection.startY, marqueeSelection.endY)
        const maxY = Math.max(marqueeSelection.startY, marqueeSelection.endY)
        
        // 框选区域需要大于 5px 才触发选中
        if (maxX - minX > 5 && maxY - minY > 5) {
          const selectedIds = currentPage.components
            .filter(comp => {
              const compRight = comp.x + comp.width
              const compBottom = comp.y + comp.height
              // 组件与框选区域有交集
              return comp.x < maxX && compRight > minX && comp.y < maxY && compBottom > minY
            })
            .map(c => c.id)
          
          if (selectedIds.length > 0) {
            setSelectedComponentIds(selectedIds)
          }
        }
      }
      setMarqueeSelection(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [marqueeSelection, currentPage, zoom, panX, panY, setSelectedComponentIds])
  
  // 🟡 1: 计算对齐线（当选中组件边缘接近其他组件时）
  useEffect(() => {
    if (!currentPage || !selectedComponentId) {
      setAlignmentLines({horizontal: [], vertical: []})
      return
    }
    
    const selected = currentPage.components.find(c => c.id === selectedComponentId)
    if (!selected) return
    
    const threshold = ALIGNMENT_THRESHOLD // 🔴 P3: 8px 内显示对齐线
    const horizontalLines: number[] = []
    const verticalLines: number[] = []
    
    currentPage.components.forEach(comp => {
      if (comp.id === selectedComponentId) return
      
      // 检查顶部/底部/中心对齐
      const selectedTop = selected.y
      const selectedBottom = selected.y + selected.height
      const selectedCenterY = selected.y + selected.height / 2
      const compTop = comp.y
      const compBottom = comp.y + comp.height
      const compCenterY = comp.y + comp.height / 2
      
      if (Math.abs(selectedTop - compTop) < threshold) horizontalLines.push(compTop)
      if (Math.abs(selectedBottom - compBottom) < threshold) horizontalLines.push(compBottom)
      if (Math.abs(selectedTop - compBottom) < threshold) horizontalLines.push(compBottom)
      if (Math.abs(selectedBottom - compTop) < threshold) horizontalLines.push(compTop)
      if (Math.abs(selectedCenterY - compCenterY) < threshold) horizontalLines.push(compCenterY) // 🔴 P3: 中心对齐
      
      // 检查左侧/右侧/中心对齐
      const selectedLeft = selected.x
      const selectedRight = selected.x + selected.width
      const selectedCenterX = selected.x + selected.width / 2
      const compLeft = comp.x
      const compRight = comp.x + comp.width
      const compCenterX = comp.x + comp.width / 2
      
      if (Math.abs(selectedLeft - compLeft) < threshold) verticalLines.push(compLeft)
      if (Math.abs(selectedRight - compRight) < threshold) verticalLines.push(compRight)
      if (Math.abs(selectedLeft - compRight) < threshold) verticalLines.push(compRight)
      if (Math.abs(selectedRight - compLeft) < threshold) verticalLines.push(compLeft)
      if (Math.abs(selectedCenterX - compCenterX) < threshold) verticalLines.push(compCenterX) // 🔴 P3: 中心对齐
    })
    
    setAlignmentLines({horizontal: horizontalLines, vertical: verticalLines})
  }, [currentPage, selectedComponentId])
  
  const canvasWidth = useMemo(() => getCanvasWidth(), [getCanvasWidth])
  const canvasHeight = useMemo(() => getCanvasHeight(), [getCanvasHeight])
  
  // Early return if no page (must be after all hooks per React rules)
  if (!currentPage) return null
  
  // Now currentPage is guaranteed non-null, safe to use
  const themeColors = THEME_COLORS[currentPage.theme]
  const scale = previewMode && previewDevice !== 'desktop' 
    ? Math.min(1, currentPage.canvasWidth / canvasWidth) 
    : zoom
  
  // 🔴 P2: 应用缩放和平移的 transform
  const canvasTransform = `translate(${panX}px, ${panY}px) scale(${scale})`
  
  const canvasStyle: React.CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: canvasTransform,
    transformOrigin: 'top left', // 🔴 P2: 平移时从左上角缩放
    background: currentPage.background?.type === 'gradient' 
      ? currentPage.background.value 
      : currentPage.background?.type === 'solid'
        ? currentPage.background.value
        : themeColors.secondary,
    position: 'relative',
    overflow: 'hidden',
    border: previewMode && previewDevice !== 'desktop' 
      ? '2px dashed var(--theme-primary)' 
      : undefined,
  }
  
  return (
    // 🔴 2: 画布容器占满视口宽度
    <div ref={containerRef} className="relative flex items-center justify-center bg-gray-100 rounded-lg flex-1 min-h-[600px]">
      {/* 星星背景装饰 */}
      <StarBackground count={8} />
      
      {/* 设备预览指示器 */}
      {previewMode && previewDevice !== 'desktop' && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-white rounded shadow text-xs text-gray-500 z-10">
          {previewDevice === 'mobile' ? '📱 手机预览 (375px)' : '📱 平板预览 (768px)'}
        </div>
      )}
      
      {/* 🔴 P1/P2/P7: 画布容器 - 添加鼠标事件 */}
      <div 
        ref={setRefs}
        className={`editor-canvas shadow-lg ${isOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${isPanning ? 'cursor-grab' : ''}`}
        style={canvasStyle}
        data-theme={currentPage.theme}
        onMouseDown={(e) => {
          // 🔴 P2: 平移优先（Space+左键 或 中键）
          if ((isPanning && e.button === 0) || e.button === 1) {
            handlePanMouseDown(e)
          } else if (e.button === 0 && !isPanning && !previewMode) {
            // 🔴 P7: 左键点击空白区域触发框选
            handleMarqueeMouseDown(e)
          }
        }}
      >
        {/* 网格层 */}
        {showGrid && !previewMode && <div className="absolute inset-0 editor-grid pointer-events-none z-0" />}
        
        {/* 🔴 P3: 对齐线层 - 紫色对齐线 */}
        {!previewMode && alignmentLines.horizontal.map((y, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 h-0.5 bg-purple-500 pointer-events-none z-50" style={{top: y, opacity: 0.8}} />
        ))}
        {!previewMode && alignmentLines.vertical.map((x, i) => (
          <div key={`v-${i}`} className="absolute top-0 bottom-0 w-0.5 bg-purple-500 pointer-events-none z-50" style={{left: x, opacity: 0.8}} />
        ))}
        
        {/* 🔴 P7: 框选框 */}
        {!previewMode && marqueeSelection && (
          <div 
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-40"
            style={{
              left: Math.min(marqueeSelection.startX, marqueeSelection.endX),
              top: Math.min(marqueeSelection.startY, marqueeSelection.endY),
              width: Math.abs(marqueeSelection.endX - marqueeSelection.startX),
              height: Math.abs(marqueeSelection.endY - marqueeSelection.startY),
            }}
          />
        )}
        
        {/* 组件层 - Bug 2: 传递画布引用和位置计算函数 */}
        {currentPage.components.map((component) => (
          <DraggableComponent
            key={component.id}
            component={component}
            isSelected={selectedComponentId === component.id}
            isHovered={hoveredComponentId === component.id}
            canvasRef={canvasRef}
            getAbsolutePosition={getAbsolutePosition}
          />
        ))}
        
        {/* 空状态提示 - Bug 9: 更友好的提示 */}
        {currentPage.components.length === 0 && !previewMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">✨</div>
              <div className="text-lg text-gray-400 font-medium">
                拖拽组件到这里开始创作
              </div>
              <div className="text-sm text-gray-300">
                从左侧选择组件拖入，或使用 AI 一键生成
              </div>
              <div className="mt-4 flex gap-2">
                <div className="px-3 py-1 bg-white/50 rounded-full text-xs text-gray-500 flex items-center gap-1">
                  <span>👈</span> 从左侧拖入组件
                </div>
                <div className="px-3 py-1 bg-white/50 rounded-full text-xs text-gray-500 flex items-center gap-1">
                  <span>🤖</span> 点击 AI 生成
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CanvasRenderer