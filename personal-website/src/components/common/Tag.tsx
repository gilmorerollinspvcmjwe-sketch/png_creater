import { clsx } from 'clsx'

type TagVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'outline'

interface TagProps {
  variant?: TagVariant
  children?: React.ReactNode
  className?: string
}

const variantStyles: Record<TagVariant, string> = {
  primary: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
  secondary: 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20',
  success: 'bg-accent-success/10 text-accent-success border-accent-success/20',
  warning: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  outline: 'bg-transparent text-dark-400 border-dark-500',
}

export default function Tag({ 
  variant = 'primary', 
  children,
  className 
}: TagProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
      'transition-colors duration-200',
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}