import { motion } from 'framer-motion'
import { clsx } from 'clsx'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  secondary: 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30',
  success: 'bg-accent-success/15 text-accent-success border-accent-success/30',
  warning: 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
  error: 'bg-accent-error/15 text-accent-error border-accent-error/30',
  neutral: 'bg-dark-600/50 text-dark-300 border-dark-500/50',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2',
}

export default function Badge({ 
  variant = 'primary', 
  size = 'md',
  icon,
  children,
  className 
}: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'inline-flex items-center rounded-lg font-medium border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.span>
  )
}