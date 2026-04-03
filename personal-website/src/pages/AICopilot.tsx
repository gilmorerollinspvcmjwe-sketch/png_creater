import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import WorkflowDiagram from '../components/copilot/WorkflowDiagram'
import CaseStudy from '../components/copilot/CaseStudy'
import EfficiencyStats from '../components/copilot/EfficiencyStats'
import EfficiencyBar from '../components/copilot/EfficiencyBar'
import MultiAgentSection from '../components/copilot/MultiAgentSection'
import copilotData from '../data/copilot.json'

export default function AICopilot() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pt-16"
    >
      {/* Hero */}
      <section className="py-12">
        <div className="container-custom">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
                AI 协同办公
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                用 AI 重新定义产品经理的工作方式，实现效率的倍数级提升
              </p>
            </div>
          </AnimatedSection>

          {/* Stats highlight */}
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <motion.div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass mx-auto"
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
            >
              <TrendingUp className="w-5 h-5 text-accent-success" />
              <span className="text-accent-success font-semibold">
                效率提升 {copilotData.stats.efficiencyGain}
              </span>
              <span className="text-dark-400 text-sm">
                每月节省 {copilotData.stats.hoursSavedPerMonth}+ 小时
              </span>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Multi-Agent System */}
      <Section>
        <MultiAgentSection />
      </Section>

      {/* Workflow */}
      <Section title="日常工作流" subtitle="AI 融入每一个工作环节">
        <WorkflowDiagram />
      </Section>

      {/* Case Studies */}
      <Section title="提效案例" subtitle="真实场景的效率提升实践">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copilotData.cases.map((caseItem, index) => (
            <AnimatedSection
              key={caseItem.id}
              animation="fadeInUp"
              delay={index * 0.1}
            >
              <CaseStudy caseData={caseItem} />
            </AnimatedSection>
          ))}
        </div>
      </Section>

      {/* Stats */}
      <Section>
        <EfficiencyStats />
      </Section>

      {/* Efficiency Visualization - Before/After */}
      <Section title="效率提升可视化" subtitle="AI 协作带来的真实效率改变">
        <EfficiencyBar />
      </Section>

      {/* Tools */}
      <Section title="常用 AI 工具" subtitle="让 AI 成为工作伙伴">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {copilotData.tools.map((tool, index) => (
            <AnimatedSection
              key={tool.name}
              animation="scaleIn"
              delay={index * 0.05}
            >
              <motion.div
                whileHover={{ y: -4 }}
                className="p-4 rounded-xl glass border border-dark-700/50 hover:border-accent-primary/30 transition-colors text-center"
              >
                <h3 className="text-dark-100 font-semibold mb-2">{tool.name}</h3>
                <p className="text-xs text-dark-500 mb-2">{tool.category}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {tool.useCases.slice(0, 2).map((useCase) => (
                    <span key={useCase} className="text-xs px-2 py-0.5 rounded bg-dark-800/30 text-dark-400">
                      {useCase}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </Section>
    </motion.div>
  )
}