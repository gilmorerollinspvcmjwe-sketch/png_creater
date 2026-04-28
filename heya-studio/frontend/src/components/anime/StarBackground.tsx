import React, { useEffect, useRef } from 'react'

interface StarBackgroundProps {
  count?: number
  themeColor?: string
}

const StarBackground: React.FC<StarBackgroundProps> = ({
  count = 8,
  themeColor = '#F2A7B3',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    // 清除现有星星
    container.innerHTML = ''
    
    // 创建星星
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.textContent = '☆'
      star.style.left = `${Math.random() * 100}vw`
      star.style.animationDuration = `${Math.random() * 6 + 10}s`
      star.style.animationDelay = `${Math.random() * 6}s`
      star.style.fontSize = `${Math.random() * 4 + 5}px`
      star.style.color = themeColor
      container.appendChild(star)
    }
  }, [count, themeColor])
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}

export default StarBackground