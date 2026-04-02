import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  end: number
  start?: number
  duration?: number
  delay?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
}

export function useCountUp({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = '',
}: UseCountUpOptions) {
  const [displayValue, setDisplayValue] = useState(start)
  const [isCounting, setIsCounting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const startCounting = () => {
      setIsCounting(true)
      startTimeRef.current = null
      
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp
        }

        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1)
        
        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        const currentValue = start + (end - start) * easeOut
        setDisplayValue(currentValue)

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayValue(end)
          setIsCounting(false)
          setIsComplete(true)
        }
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    timeoutId = setTimeout(startCounting, delay)

    return () => {
      clearTimeout(timeoutId)
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [end, start, duration, delay])

  const formatValue = (value: number): string => {
    let formatted = value.toFixed(decimals)
    
    if (separator && decimals === 0) {
      const num = Math.round(value)
      formatted = num.toLocaleString('en-US')
    }
    
    return `${prefix}${formatted}${suffix}`
  }

  return {
    value: formatValue(displayValue),
    rawValue: displayValue,
    isCounting,
    isComplete,
  }
}

export default useCountUp