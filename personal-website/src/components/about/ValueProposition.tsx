import { motion } from 'framer-motion'
import { Cpu, Heart, Rocket } from 'lucide-react'
import Card from '../common/Card'
import AnimatedSection from '../common/AnimatedSection'
import profileData from '../../data/profile.json'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu: Cpu,
  Heart: Heart,
  Rocket: Rocket,
}

export default function ValueProposition() {
  const { values } = profileData

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {values.map((value, index) => {
        const IconComponent = iconMap[value.icon] || Cpu
        
        return (
          <AnimatedSection
            key={value.title}
            animation="scaleIn"
            delay={index * 0.1}
          >
            <Card glass className="relative overflow-hidden">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mb-4"
              >
                <IconComponent className="w-6 h-6 text-accent-primary" />
              </motion.div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-dark-100 mb-2">
                {value.title}
              </h3>

              {/* Description */}
              <p className="text-dark-400">
                {value.description}
              </p>

              {/* Decorative gradient */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-tl from-accent-primary/5 to-transparent rounded-tl-full" />
            </Card>
          </AnimatedSection>
        )
      })}
    </div>
  )
}