import { useState, useEffect, useCallback } from 'react'

interface UseTypewriterOptions {
  text: string
  speed?: number
  delay?: number
  loop?: boolean
  loopDelay?: number
  onComplete?: () => void
}

export function useTypewriter({
  text,
  speed = 50,
  delay = 0,
  loop = false,
  loopDelay = 2000,
  onComplete,
}: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const startTyping = useCallback(() => {
    setIsTyping(true)
    setIsComplete(false)
    setDisplayText('')
  }, [])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let currentIndex = 0

    const startDelay = () => {
      timeoutId = setTimeout(() => {
        setIsTyping(true)
        typeCharacter()
      }, delay)
    }

    const typeCharacter = () => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex))
        currentIndex++
        timeoutId = setTimeout(typeCharacter, speed)
      } else {
        setIsTyping(false)
        setIsComplete(true)
        if (onComplete) onComplete()
        
        if (loop) {
          timeoutId = setTimeout(() => {
            currentIndex = 0
            setDisplayText('')
            setIsComplete(false)
            setIsTyping(true)
            typeCharacter()
          }, loopDelay)
        }
      }
    }

    startDelay()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [text, speed, delay, loop, loopDelay, onComplete])

  return { displayText, isTyping, isComplete, startTyping }
}

export default useTypewriter