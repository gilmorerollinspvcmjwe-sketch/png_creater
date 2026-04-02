import { motion, HTMLMotionProps } from 'framer-motion'
import { clsx } from 'clsx'
import { forwardRef } from 'react'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  hover?: boolean
  glow?: boolean
  glass?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    hover = true, 
    glow = false, 
    glass = false,
    padding = 'md',
    children,
    className,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        className={clsx(
          'rounded-2xl border transition-all duration-300',
          glass 
            ? 'bg-dark-900/70 backdrop-blur-xl border-white/10' 
            : 'bg-dark-900/80 border-dark-700/50',
          glow && 'shadow-glow-sm hover:shadow-glow-md',
          hover && 'hover:border-accent-primary/30 hover:shadow-lg hover:shadow-dark-950/50',
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export default Card