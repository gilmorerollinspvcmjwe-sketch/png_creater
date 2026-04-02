import { motion } from 'framer-motion'
import { useCountUp } from '../../hooks/useCountUp'
import { Clock, Zap, ListChecks, Wrench } from 'lucide-react'
import AnimatedSection from '../common/AnimatedSection'
import copilotData from '../../data/copilot.json'

export default function EfficiencyStats() {
  const { stats } = copilotData

  const statItems = [
    { icon: Zap, label: '效率提升', value: stats.efficiencyGain.replace('%', ''), suffix: '%', color: 'accent-success' },
    { icon: Clock, label: '每月节省', value: stats.hoursSavedPerMonth, suffix: '小时', color: 'accent-primary' },
    { icon: ListChecks, label: '自动化任务', value: stats.tasksAutomated, suffix: '项', color: 'accent-secondary' },
    { icon: Wrench, label: 'AI 工具', value: stats.aiToolsUsed, suffix: '个', color: 'accent-warning' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat, index) => {
        const { value } = useCountUp({
          end: parseInt(String(stat.value)),
          duration: 2000,
          delay: index * 100,
          suffix: stat.suffix,
        })

        return (
          <AnimatedSection
            key={stat.label}
            animation="scaleIn"
            delay={index * 0.05}
          >
            <motion.div
              whileHover={{ y: -4 }}
              className="p-6 rounded-xl glass border border-dark-700/50 hover:border-accent-primary/30 transition-colors text-center"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-${stat.color}/10 mb-4`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-dark-100 mb-1">
                {value}
              </div>
              <p className="text-sm text-dark-500">
                {stat.label}
              </p>
            </motion.div>
          </AnimatedSection>
        )
      })}
    </div>
  )
}