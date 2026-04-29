import { useState, useEffect, useCallback, RefObject } from 'react'

/**
 * 🔴 2: 动态获取容器宽度的 hook
 * 使用 ResizeObserver 监听容器尺寸变化
 */
export function useContainerWidth(containerRef: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0)

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth)
    }
  }, [containerRef])

  useEffect(() => {
    updateWidth()

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      updateWidth()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // 监听窗口 resize 事件作为兜底
    window.addEventListener('resize', updateWidth)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [containerRef, updateWidth])

  return width
}