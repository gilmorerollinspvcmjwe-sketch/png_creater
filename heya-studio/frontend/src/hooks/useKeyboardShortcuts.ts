import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '@/stores'
import { ComponentInstance } from '@/types'

/**
 * 键盘快捷键 Hook
 * Bug 8: 实现完整快捷键支持
 * 🔴 2: 修复删除不稳定问题
 */
export function useKeyboardShortcuts() {
  const {
    selectedComponentId,
    currentPage,
    removeComponent,
    selectComponent,
    addComponent,
    updateComponentImmediate,
    pushHistory,
    undo,
    redo,
    setDragging,
    // 🔴 P8: 多选支持
    selectAll,
    clearSelection,
    selectedComponentIds,
  } = useEditorStore()
  
  // 复制的组件缓存（使用深拷贝）
  const clipboardRef = useRef<ComponentInstance | null>(null)
  
  // 🔴 2: 使用 useCallback 确保删除函数稳定
  const handleDelete = useCallback(() => {
    if (!selectedComponentId || !currentPage) return
    
    const componentToDelete = currentPage.components.find(c => c.id === selectedComponentId)
    if (componentToDelete) {
      // 先复制到剪贴板
      clipboardRef.current = JSON.parse(JSON.stringify(componentToDelete)) as ComponentInstance
      // 执行删除
      removeComponent(selectedComponentId)
      console.log('已删除组件:', componentToDelete.type)
    }
  }, [selectedComponentId, currentPage, removeComponent])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框中（不触发快捷键）
      const activeElement = document.activeElement
      const isInputFocused = 
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      
      // 🔴 5: Escape 键取消选中 + 取消拖拽
      if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedComponentId) {
          selectComponent(null)
          pushHistory() // 取消选中时记录历史
        }
        setDragging(false) // 取消拖拽状态
        return
      }
      
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      
      // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      
      // 输入框中不触发以下快捷键
      if (isInputFocused) return
      
      // 🔴 P8: Ctrl/Cmd + A: 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && currentPage) {
        e.preventDefault()
        selectAll()
        return
      }
      
      const selectedComponent = currentPage?.components.find(c => c.id === selectedComponentId)
      
      // 🔴 2: Delete 或 Backspace: 删除选中组件（100% 稳定）
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        e.preventDefault()
        handleDelete()
        return
      }
      
      // 🔴 5: Ctrl/Cmd + C: 复制选中组件（深拷贝）
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedComponent) {
        e.preventDefault()
        clipboardRef.current = JSON.parse(JSON.stringify(selectedComponent)) as ComponentInstance
        console.log('已复制组件:', selectedComponent.type)
        return
      }
      
      // 🔴 5: Ctrl/Cmd + V: 粘贴组件（保留所有属性）
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current && currentPage) {
        e.preventDefault()
        const pastedComponent = clipboardRef.current
        // 在原位置偏移 20px 粘贴
        const newId = addComponent(
          pastedComponent.type,
          Math.min(pastedComponent.x + 20, currentPage.canvasWidth - pastedComponent.width),
          Math.min(pastedComponent.y + 20, currentPage.canvasHeight - pastedComponent.height)
        )
        // 🔴 8: 复制粘贴属性完整 - 深拷贝所有属性
        if (newId) {
          const updates: Partial<ComponentInstance> = JSON.parse(JSON.stringify(pastedComponent))
          delete (updates as any).id
          delete (updates as any).x
          delete (updates as any).y
          updateComponentImmediate(newId, updates)
          pushHistory()
          selectComponent(newId)
        }
        console.log('已粘贴组件')
        return
      }
      
      // 🔴 5: Ctrl/Cmd + D: 复制并选中（快捷复制）
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedComponent && currentPage) {
        e.preventDefault()
        const duplicatedComponent = JSON.parse(JSON.stringify(selectedComponent)) as ComponentInstance
        const newId = addComponent(
          duplicatedComponent.type,
          Math.min(duplicatedComponent.x + 20, currentPage.canvasWidth - duplicatedComponent.width),
          Math.min(duplicatedComponent.y + 20, currentPage.canvasHeight - duplicatedComponent.height)
        )
        if (newId) {
          const updates: Partial<ComponentInstance> = duplicatedComponent
          delete (updates as any).id
          delete (updates as any).x
          delete (updates as any).y
          updateComponentImmediate(newId, updates)
          pushHistory()
          selectComponent(newId)
        }
        console.log('已复制并选中')
        return
      }
      
      // 🔴 5: 方向键: 微调位置（Shift + 方向键移动 10px）
      if (selectedComponentId && selectedComponent) {
        const step = e.shiftKey ? 10 : 1
        
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          updateComponentImmediate(selectedComponentId, { y: Math.max(0, selectedComponent.y - step) })
          setTimeout(() => pushHistory(), 300)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          updateComponentImmediate(selectedComponentId, { y: Math.min(currentPage!.canvasHeight - selectedComponent.height, selectedComponent.y + step) })
          setTimeout(() => pushHistory(), 300)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          updateComponentImmediate(selectedComponentId, { x: Math.max(0, selectedComponent.x - step) })
          setTimeout(() => pushHistory(), 300)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          updateComponentImmediate(selectedComponentId, { x: Math.min(currentPage!.canvasWidth - selectedComponent.width, selectedComponent.x + step) })
          setTimeout(() => pushHistory(), 300)
        }
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedComponentId,
    currentPage,
    handleDelete, // 🔴 2: 使用稳定的删除函数
    selectComponent,
    addComponent,
    updateComponentImmediate,
    pushHistory,
    undo,
    redo,
    setDragging, // 🔴 5: 添加 setDragging
    // 🔴 P8: 多选支持
    selectAll,
    clearSelection,
    selectedComponentIds,
  ])
}