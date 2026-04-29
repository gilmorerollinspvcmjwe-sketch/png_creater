import React, { useEffect, useRef, useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { useEditorStore, useUIStore } from '@/stores'
// 类型导入已移除
import { 
  Toolbar, 
  CanvasRenderer, 
  PropertyPanel, 
  DraggableComponent,
  Onboarding,
} from '@/components/editor'
import { AIChatPanel } from '@/components/agent'
import { LeftPanel } from '@/components/common'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { jingjingProfileDemo } from '@/demos/jingjing-profile'

const App: React.FC = () => {
  const { initPage, setPage, addComponent, currentPage, setDragging, selectedComponentId, lastUpdated, isFullscreen } = useEditorStore()
  const { rightPanelOpen } = useUIStore()
  
  // Bug 8: 使用键盘快捷键 hook
  useKeyboardShortcuts()
  
  // Bug 6: 多标签页冲突检测
  const [showConflictWarning, setShowConflictWarning] = useState(false)
  const localLastUpdatedRef = useRef(lastUpdated)
  
  useEffect(() => {
    // 监听其他标签页的更新
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'heya-editor-store') {
        try {
          const newData = JSON.parse(e.newValue || '{}')
          if (newData.state?.lastUpdated > localLastUpdatedRef.current) {
            // 其他标签页有更新，显示冲突提示
            setShowConflictWarning(true)
          }
        } catch (err) {
          console.error('解析存储数据失败:', err)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  // 更新本地时间戳
  useEffect(() => {
    localLastUpdatedRef.current = lastUpdated
  }, [lastUpdated])
  
  // 🔴 1. 拖拽放置预览状态
  const [dragPreview, setDragPreview] = useState<{ type: string; x: number; y: number } | null>(null)
  
  // 追踪鼠标位置，用于计算拖拽放置位置
  const mousePositionRef = useRef({ x: 0, y: 0 })
  
  // 初始化页面
  useEffect(() => {
    // 检查 URL 参数，加载演示配置
    const params = new URLSearchParams(window.location.search)
    const demo = params.get('demo')
    if (demo === 'jingjing') {
      setPage(jingjingProfileDemo)
      return
    }
    initPage()
  }, [])
  
  // 追踪鼠标位置
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )
  
  // 🔴 1. 处理拖拽开始 - 显示预览
  const handleDragStart = (event: any) => {
    setDragging(true)
    
    // 从组件库拖入时显示预览
    if (event.active.data.current?.isNew) {
      const type = event.active.data.current.type
      setDragPreview({ type, x: 0, y: 0 })
    } else {
      setDragPreview(null)
    }
  }
  
  // 🔴 1. 处理拖拽移动 - 更新预览位置
  const handleDragMove = () => {
    if (dragPreview && currentPage) {
      const canvasElement = document.querySelector('.editor-canvas')
      if (canvasElement) {
        const canvasRect = canvasElement.getBoundingClientRect()
        const scale = canvasRect.width / currentPage.canvasWidth
        const x = Math.round((mousePositionRef.current.x - canvasRect.left) / scale)
        const y = Math.round((mousePositionRef.current.y - canvasRect.top) / scale)
        setDragPreview({ ...dragPreview, x, y })
      }
    }
  }
  
  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event
    
    // Bug 1 Fix: 处理画布内已有组件的位置移动（优先处理，不依赖 over）
    if (!active.data.current?.isNew && active.data.current?.component) {
      const component = active.data.current.component as { id: string; x: number; y: number }
      const newX = component.x + delta.x
      const newY = component.y + delta.y
      
      // 确保位置在画布范围内
      if (currentPage) {
        const clampedX = Math.max(0, Math.min(currentPage.canvasWidth - 50, newX))
        const clampedY = Math.max(0, Math.min(currentPage.canvasHeight - 50, newY))
        useEditorStore.getState().moveComponent(component.id, clampedX, clampedY)
      }
      
      setDragging(false)
      setDragPreview(null)
      useEditorStore.getState().pushHistory()
      return
    }
    
    setDragging(false)
    setDragPreview(null)
    useEditorStore.getState().pushHistory()
    
    // 检查是否放置到画布上（仅对新组件需要 over 判断）
    if (!over || over.id !== 'canvas') return
    
    // 从组件库拖拽新组件到画布
    if (active.data.current?.isNew) {
      const type = active.data.current.type
      
      // 获取画布的位置
      const canvasElement = document.querySelector('.editor-canvas')
      if (canvasElement && currentPage) {
        const canvasRect = canvasElement.getBoundingClientRect()
        
        // 使用当前鼠标位置计算相对画布的位置
        const scale = canvasRect.width / currentPage.canvasWidth
        const x = Math.round((mousePositionRef.current.x - canvasRect.left) / scale)
        const y = Math.round((mousePositionRef.current.y - canvasRect.top) / scale)
        
        // 确保位置在画布范围内
        const clampedX = Math.max(0, Math.min(currentPage.canvasWidth - 50, x - 50)) // 偏移让组件居中放置
        const clampedY = Math.max(0, Math.min(currentPage.canvasHeight - 50, y - 50))
        
        addComponent(type, clampedX, clampedY)
      } else {
        addComponent(type)
      }
    }
  }
  
  // 键盘快捷键已移至 useKeyboardShortcuts hook
  
  const selectedComponent = currentPage?.components.find(c => c.id === selectedComponentId)
  
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
    >
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* 🔴 3: 工具栏 - 全屏时仍显示 */}
        <Toolbar />
        
        {/* 🔴 3: 主内容区 - 全屏时隐藏左右面板和 AI 面板 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧面板 - 组件库 */}
          {!isFullscreen && <LeftPanel />}
          
          {/* 🔴 2: 中间画布 - 占满视口宽度 */}
          <div className="flex-1 flex overflow-hidden">
            <CanvasRenderer />
          </div>
          
          {/* 右侧属性面板 */}
          {!isFullscreen && rightPanelOpen && <PropertyPanel />}
          
          {/* AI 对话面板 */}
          {!isFullscreen && <AIChatPanel />}
        </div>
        
        {/* Bug 7: 新手引导 */}
        <Onboarding />
        
        {/* Bug 6: 多标签页冲突提示 */}
        {showConflictWarning && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-yellow-700 text-sm">检测到其他标签页更新，页面可能已同步</span>
            <button
              onClick={() => setShowConflictWarning(false)}
              className="ml-2 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-xs"
            >
              关闭
            </button>
          </div>
        )}
        
        {/* 🔴 1. 拖拽放置预览 - 组件库拖入时显示虚线占位符 */}
        {dragPreview && currentPage && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: mousePositionRef.current.x - 50,
              top: mousePositionRef.current.y - 50,
              width: 100,
              height: 100,
              border: '2px dashed #F2A7B3',
              borderRadius: 8,
              background: 'rgba(242,167,179,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#F2A7B3',
            }}
          >
            {dragPreview.type}
          </div>
        )}
        
        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {selectedComponent && (
            <div 
              className="opacity-50 pointer-events-none"
              style={{
                width: selectedComponent.width,
                height: selectedComponent.height,
              }}
            >
              <DraggableComponent
                component={selectedComponent}
                isSelected={false}
                isHovered={false}
              />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

export default App