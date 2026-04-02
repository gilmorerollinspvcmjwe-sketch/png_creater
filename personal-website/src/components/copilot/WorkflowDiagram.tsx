import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import copilotData from '../../data/copilot.json'

export default function WorkflowDiagram() {
  const { workflow } = copilotData

  const sections = [
    { key: 'morning', label: '上午', color: 'accent-primary' },
    { key: 'afternoon', label: '下午', color: 'accent-secondary' },
    { key: 'evening', label: '晚上', color: 'accent-success' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {sections.map((section) => (
        <Card key={section.key} glass>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-4 h-4 text-${section.color}`} />
            <h3 className={`text-lg font-semibold text-${section.color}`}>
              {section.label}
            </h3>
          </div>

          {/* Workflow items */}
          <div className="space-y-4">
            {workflow[section.key as keyof typeof workflow].map((item, index) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                {/* Time */}
                <div className="flex-shrink-0 w-14 text-right">
                  <span className="text-sm font-mono text-dark-500">{item.time}</span>
                </div>

                {/* Connector */}
                <div className="relative flex-shrink-0 flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full bg-${section.color} shadow-glow-sm`} />
                  {index < workflow[section.key as keyof typeof workflow].length - 1 && (
                    <div className={`w-0.5 h-8 bg-${section.color}/30`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-dark-100 mb-1">
                    {item.task}
                  </h4>
                  <Badge variant="neutral" size="sm" className="mb-1">
                    {item.aiTool}
                  </Badge>
                  <p className="text-xs text-dark-500">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}