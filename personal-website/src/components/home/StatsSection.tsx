import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Clock, TrendingUp } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'

const stats = [
  {
    icon: Users,
    label: '产品用户',
    value: 10,
    suffix: '万+',
    color: 'accent-primary',
  },
  {
    icon: Clock,
    label: '日均通话时长',
    value: 5,
    suffix: '万+分钟',
    color: 'accent-secondary',
  },
  {
    icon: TrendingUp,
    label: '工作效率提升',
    value: 300,
    suffix: '%',
    color: 'accent-success',
  },
]

export default function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-20 relative">
      <div className="container-custom">
        {/* Divider */}
        <div className="divider mb-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {stats.map((stat, index) => {
            const { value } = useCountUp({
              end: stat.value,
              duration: 2000,
              delay: index * 200,
              suffix: stat.suffix,
            })

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-6 text-center card-hover">
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-${stat.color}/10 mb-4`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>

                  {/* Value */}
                  <div className="text-4xl font-bold mb-2">
                    <span className={`text-${stat.color}`}>
                      {isInView ? value : '0'}
                    </span>
                  </div>

                  {/* Label */}
                  <p className="text-dark-400">{stat.label}</p>

                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-${stat.color}/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}