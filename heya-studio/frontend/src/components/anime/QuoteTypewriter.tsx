import React, { useState, useEffect, useRef } from 'react'

interface QuoteTypewriterProps {
  text: string
  translation?: string
  typewriterEffect?: boolean
  fontSize?: number
  speed?: number // 打字速度（毫秒/字符）
  loop?: boolean // 是否循环播放
}

const QuoteTypewriter: React.FC<QuoteTypewriterProps> = ({
  text,
  translation,
  typewriterEffect = true,
  fontSize = 12,
  speed = 80,
  loop = false,
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(typewriterEffect)
  const [showCursor, setShowCursor] = useState(true)
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 打字机效果
  useEffect(() => {
    if (!typewriterEffect) {
      setDisplayedText(text)
      setIsTyping(false)
      setShowCursor(false)
      return
    }

    // 开始打字
    setDisplayedText('')
    indexRef.current = 0
    setIsTyping(true)

    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1))
        indexRef.current++
        timerRef.current = setTimeout(typeNextChar, speed)
      } else {
        // 打字完成
        setIsTyping(false)
        if (loop) {
          // 循环模式：等待后重新开始
          timerRef.current = setTimeout(() => {
            setDisplayedText('')
            indexRef.current = 0
            setIsTyping(true)
            typeNextChar()
          }, 3000)
        }
      }
    }

    timerRef.current = setTimeout(typeNextChar, speed)

    // 清理
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [text, typewriterEffect, speed, loop])

  // 光标闪烁（打字完成后继续闪烁）
  useEffect(() => {
    if (!typewriterEffect || !showCursor) return

    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(cursorTimer)
  }, [typewriterEffect, showCursor])

  // 打字完成后停止光标闪烁（可选）
  useEffect(() => {
    if (!isTyping && !loop) {
      // 3秒后隐藏光标
      const hideTimer = setTimeout(() => {
        setShowCursor(false)
      }, 3000)
      return () => clearTimeout(hideTimer)
    }
  }, [isTyping, loop])

  return (
    <div className="text-center p-2">
      {/* 引言文本 */}
      <div 
        className="inline-block"
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
          fontStyle: typewriterEffect && isTyping ? 'normal' : 'italic',
        }}
      >
        <span className="quote-text">{displayedText}</span>
        {/* 打字机光标 */}
        {typewriterEffect && showCursor && (
          <span 
            className="inline-block ml-0.5 text-current opacity-100"
            style={{
              animation: 'cursorBlink 0.8s infinite',
            }}
          >
            |
          </span>
        )}
      </div>

      {/* 翻译/来源 */}
      {translation && (!typewriterEffect || !isTyping) && (
        <div 
          className="text-gray-400 mt-2"
          style={{ fontSize: `${fontSize * 0.8}px` }}
        >
          — {translation}
        </div>
      )}
    </div>
  )
}

export default QuoteTypewriter