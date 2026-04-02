import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

type AnimationType = 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideIn'

interface AnimatedSectionProps {
  animation?: AnimationType
  delay?: number
  duration?: number
  className?: string
  children?: ReactNode
}

const animations: Record<AnimationType, { initial: { opacity: number; y?: number; x?: number; scale?: number }; animate: { opacity: number; y?: number; x?: number; scale?: number } }> = {
  fadeInUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
  },
  fadeInLeft: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
  },
  fadeInRight: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
  },
  slideIn: {
    initial: { opacity: 0, x: 50, y: 20 },
    animate: { opacity: 1, x: 0, y: 0 },
  },
}

export default function AnimatedSection({
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.5,
  className,
  children,
}: AnimatedSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const { initial, animate } = animations[animation]

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isInView ? animate : initial}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}