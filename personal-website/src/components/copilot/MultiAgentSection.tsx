import { motion } from 'framer-motion'
import { Users, Cpu, ArrowRight, TrendingUp } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import AnimatedSection from '../common/AnimatedSection'
import copilotData from '../../data/copilot.json'

export default function MultiAgentSection() {
  const { multiAgentSystem } = copilotData

  if (!multiAgentSystem) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <AnimatedSection>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Users className="w-4 h-4 text-accent-primary" />
            <span className="text-sm text-dark-400">核心亮点</span>
          </div>
          <h2 className="text-3xl font-bold text-dark-100 mb-2">
            {multiAgentSystem.name}
          </h2>
          <p className="text-dark-400">
            {multiAgentSystem.description}
          </p>
        </div>
      </AnimatedSection>

      {/* Metrics - 效率对比 */}
      <AnimatedSection animation="fadeInUp">
        <Card glass className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent-success" />
            <h3 className="text-lg font-semibold text-dark-100">效率提升数据</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PRD */}
            <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
              <p className="text-xs text-dark-500 mb-2">PRD 撰写</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-dark-400 text-sm">{multiAgentSystem.metrics.prdTime.before}</span>
                <ArrowRight className="w-4 h-4 text-accent-success" />
                <span className="text-accent-success font-semibold">{multiAgentSystem.metrics.prdTime.after}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-700">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '85%' }}
                  viewport={{ once: true }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-success to-accent-primary"
                />
              </div>
              <p className="text-accent-success text-sm mt-2 font-medium">
                {multiAgentSystem.metrics.prdTime.improvement}
              </p>
            </div>

            {/* Code */}
            <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
              <p className="text-xs text-dark-500 mb-2">代码开发</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-dark-400 text-sm">{multiAgentSystem.metrics.codeTime.before}</span>
                <ArrowRight className="w-4 h-4 text-accent-success" />
                <span className="text-accent-success font-semibold">{multiAgentSystem.metrics.codeTime.after}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-700">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '75%' }}
                  viewport={{ once: true }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                />
              </div>
              <p className="text-accent-success text-sm mt-2 font-medium">
                {multiAgentSystem.metrics.codeTime.improvement}
              </p>
            </div>

            {/* Test */}
            <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
              <p className="text-xs text-dark-500 mb-2">测试覆盖</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-dark-400 text-sm">{multiAgentSystem.metrics.testCoverage.before}</span>
                <ArrowRight className="w-4 h-4 text-accent-success" />
                <span className="text-accent-success font-semibold">{multiAgentSystem.metrics.testCoverage.after}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-700">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '80%' }}
                  viewport={{ once: true }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-secondary to-accent-warning"
                />
              </div>
              <p className="text-accent-success text-sm mt-2 font-medium">
                {multiAgentSystem.metrics.testCoverage.improvement}
              </p>
            </div>
          </div>

          {/* Overall */}
          <div className="mt-6 p-4 rounded-xl bg-accent-success/10 border border-accent-success/20 text-center">
            <p className="text-accent-success font-bold text-xl">
              {multiAgentSystem.metrics.overallEfficiency}
            </p>
          </div>
        </Card>
      </AnimatedSection>

      {/* Roles */}
      <AnimatedSection animation="fadeInUp" delay={0.1}>
        <Card glass className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-accent-primary" />
            <h3 className="text-lg font-semibold text-dark-100">五角色协作系统</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {multiAgentSystem.roles.map((role, index) => {
              const colors = ['accent-primary', 'accent-secondary', 'accent-success', 'accent-warning', 'accent-error']
              const color = colors[index % colors.length]
              
              return (
                <motion.div
                  key={role.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-${color}/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center mb-3`}>
                    <Cpu className={`w-5 h-5 text-${color}`} />
                  </div>
                  <h4 className="text-dark-100 font-medium text-sm mb-1">{role.name}</h4>
                  <p className="text-xs text-dark-500 mb-2">{role.model}</p>
                  <p className="text-xs text-dark-400 mb-2">{role.role}</p>
                  <div className="flex flex-wrap gap-1">
                    {role.responsibilities.slice(0, 2).map((resp) => (
                      <span key={resp} className="text-xs px-1.5 py-0.5 rounded bg-dark-900/50 text-dark-500">
                        {resp}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Card>
      </AnimatedSection>

      {/* Workflow */}
      <AnimatedSection animation="fadeInUp" delay={0.2}>
        <Card glass className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <ArrowRight className="w-5 h-5 text-accent-secondary" />
            <h3 className="text-lg font-semibold text-dark-100">协作流程</h3>
          </div>
          
          <div className="space-y-4">
            {multiAgentSystem.workflow.map((step, index) => {
              const colors = ['accent-primary', 'accent-secondary', 'accent-success', 'accent-warning', 'accent-error']
              const color = colors[index % colors.length]
              
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-8 h-8 rounded-full bg-${color}/20 flex items-center justify-center`}>
                    <span className={`text-${color} font-bold text-sm`}>{step.step}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-dark-800/50 border border-dark-700/50">
                    <div className="flex items-center justify-between">
                      <p className="text-dark-100 font-medium text-sm">{step.agent}</p>
                      <Badge variant="neutral" size="sm">{step.output}</Badge>
                    </div>
                    <p className="text-xs text-dark-400 mt-1">{step.action}</p>
                  </div>
                  {index < multiAgentSystem.workflow.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-dark-500" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </Card>
      </AnimatedSection>
    </div>
  )
}