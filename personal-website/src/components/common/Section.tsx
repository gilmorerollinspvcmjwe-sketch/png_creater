import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface SectionProps {
  title?: string
  subtitle?: string
  className?: string
  children?: React.ReactNode
  id?: string
}

export default function Section({ 
  title, 
  subtitle, 
  className,
  children,
  id 
}: SectionProps) {
  return (
    <section 
      id={id}
      className={clsx('py-20 lg:py-28', className)}
    >
      <div className="container-custom">
        {(title || subtitle) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 lg:mb-16"
          >
            {title && (
              <h2 className="text-3xl lg:text-4xl font-bold text-dark-100 mb-3">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  )
}