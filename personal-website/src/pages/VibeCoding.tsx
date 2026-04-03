import { motion } from 'framer-motion'
import { Code2, Sparkles, Zap, ExternalLink, BookOpen, Lightbulb, ArrowRight, Package, GraduationCap } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import vibeCoding from '../data/vibe-coding.json'

const tools = vibeCoding.tools
const cases = vibeCoding.cases
const principles = vibeCoding.principles
const resources = vibeCoding.resources

// 效果描述（代替代码块）
const efficiencyDescription = `
AI 生成的 AnimatedCard 组件，具备以下特点：
- 进入视口时自动触发淡入 + 上移动画
- 鼠标悬停时轻微放大（scale: 1.02）
- 样式自适应，支持传入自定义 className
- 使用 clsx 进行条件样式组合
- 完全响应式，支持移动端和桌面端

核心技术：React + Framer Motion + Tailwind CSS
`

export default function VibeCoding() {
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <Sparkles className="w-4 h-4 text-accent-primary" />
                <span className="text-sm text-dark-400">AI 驱动的编程方式</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
                Vibe Coding
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                用 AI 编程工具，让想法快速变为代码。产品经理也能写代码了！
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Tools */}
      <Section title="AI 编程工具" subtitle="我日常使用的 AI 编程工具">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, index) => (
            <AnimatedSection
              key={tool.name}
              animation="fadeInUp"
              delay={index * 0.1}
            >
              <Card hover glow className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-dark-100">
                    {tool.name}
                  </h3>
                  <div className="flex gap-1">
                    {[...Array(tool.proficiency)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full bg-${tool.color}`} />
                    ))}
                    {[...Array(5 - tool.proficiency)].map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-dark-600" />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-dark-400 text-sm mb-4">
                  {tool.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {tool.features.map((feature) => (
                    <Badge key={feature} variant="neutral" size="sm">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </Section>

      {/* Code Example / 效果截图 */}
      <Section title="效果展示" subtitle="AI 生成的代码实际效果">
        <AnimatedSection animation="fadeInUp">
          <Card glass className="overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-accent-primary" />
                <span className="text-sm text-dark-400">React + Framer Motion 卡片动画效果</span>
              </div>
              <Badge variant="success" size="sm">
                AI 生成
              </Badge>
            </div>
            
            {/* 效果截图占位区域 */}
            {/* TODO: 需要提供素材 */}
            <div className="bg-dark-800/30 border-2 border-dashed border-dark-600 rounded-lg p-8 text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-dark-500" />
                <p className="text-dark-500">AnimatedCard 效果截图</p>
              </div>
              <p className="text-red-400 text-sm font-medium">
                📸 [需要截图素材：卡片动画效果 GIF 或视频]
              </p>
              <p className="text-dark-600 text-xs mt-2">
                建议：展示卡片进入视口时的淡入动画和悬停放大效果
              </p>
            </div>

            {/* 效果描述 */}
            <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700/30">
              <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-line">
                {efficiencyDescription}
              </p>
            </div>
          </Card>
        </AnimatedSection>
      </Section>

      {/* Cases */}
      {cases && cases.length > 0 && (
        <Section title="实践案例" subtitle="真实的 AI 编程项目案例">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((caseItem, index) => (
              <AnimatedSection
                key={caseItem.id}
                animation="fadeInUp"
                delay={index * 0.1}
              >
                <Card hover className="relative overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-dark-100">
                      {caseItem.title}
                    </h3>
                    <Badge variant="primary" size="sm">{caseItem.time}</Badge>
                  </div>

                  {/* Tool */}
                  <div className="mb-3 p-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                    <p className="text-xs text-dark-500 mb-1">使用工具</p>
                    <p className="text-sm text-accent-primary font-medium">{caseItem.tool}</p>
                  </div>

                  {/* Workflow */}
                  {caseItem.workflow && caseItem.workflow.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="w-4 h-4 text-accent-secondary" />
                        <p className="text-xs text-dark-500">工作流程</p>
                      </div>
                      <div className="space-y-2">
                        {caseItem.workflow.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-dark-400">
                            <span className="w-5 h-5 rounded bg-dark-800/50 flex items-center justify-center text-xs text-dark-500">
                              {i + 1}
                            </span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {caseItem.deliverables && caseItem.deliverables.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-accent-success" />
                        <p className="text-xs text-dark-500">交付物</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {caseItem.deliverables.map((deliverable) => (
                          <Badge key={deliverable} variant="success" size="sm">
                            {deliverable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learnings */}
                  {caseItem.learnings && caseItem.learnings.length > 0 && (
                    <div className="pt-4 border-t border-dark-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-4 h-4 text-accent-warning" />
                        <p className="text-xs text-dark-500">学习收获</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {caseItem.learnings.map((learning) => (
                          <span key={learning} className="text-xs px-2 py-1 rounded-lg bg-accent-warning/10 text-dark-400 border border-accent-warning/20">
                            {learning}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </Section>
      )}

      {/* Principles */}
      {principles && principles.length > 0 && (
        <Section title="使用原则" subtitle="高效使用 AI 编程工具的核心原则">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((principle, index) => (
              <AnimatedSection
                key={principle.name}
                animation="fadeInUp"
                delay={index * 0.1}
              >
                <Card glass className="p-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-3">
                    <Lightbulb className="w-5 h-5 text-accent-primary" />
                  </div>
                  <h3 className="text-dark-100 font-semibold mb-2">{principle.name}</h3>
                  <p className="text-dark-400 text-sm mb-3">{principle.description}</p>
                  
                  {/* Tips */}
                  {principle.tips && principle.tips.length > 0 && (
                    <div className="space-y-1">
                      {principle.tips.map((tip, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-dark-500">
                          <div className="w-1 h-1 rounded-full bg-accent-secondary" />
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </Section>
      )}

      {/* Resources */}
      {resources && resources.length > 0 && (
        <Section title="工具资源" subtitle="官方文档与学习资源">
          <div className="flex flex-wrap justify-center gap-4">
            {resources.map((resource, index) => (
              <AnimatedSection
                key={resource.name}
                animation="scaleIn"
                delay={index * 0.1}
              >
                <motion.a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="inline-flex items-center gap-3 px-4 py-3 rounded-xl glass border border-dark-700/50 hover:border-accent-primary/30 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-accent-primary" />
                  <div>
                    <p className="text-dark-100 font-medium">{resource.name}</p>
                    <p className="text-xs text-dark-500">{resource.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400" />
                </motion.a>
              </AnimatedSection>
            ))}
          </div>
        </Section>
      )}

      {/* Benefits */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedSection animation="fadeInLeft">
            <Card glass className="text-center">
              <Zap className="w-8 h-8 text-accent-success mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-dark-100 mb-2">
                10x 开发效率
              </h3>
              <p className="text-dark-400 text-sm">
                AI 生成代码，快速迭代，缩短开发周期
              </p>
            </Card>
          </AnimatedSection>
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <Card glass className="text-center">
              <Sparkles className="w-8 h-8 text-accent-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-dark-100 mb-2">
                专业级质量
              </h3>
              <p className="text-dark-400 text-sm">
                AI 遵循最佳实践，生成高质量代码
              </p>
            </Card>
          </AnimatedSection>
          <AnimatedSection animation="fadeInRight" delay={0.2}>
            <Card glass className="text-center">
              <ExternalLink className="w-8 h-8 text-accent-secondary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-dark-100 mb-2">
                跨领域协作
              </h3>
              <p className="text-dark-400 text-sm">
                产品经理与开发者协作无界限
              </p>
            </Card>
          </AnimatedSection>
        </div>
      </Section>
    </motion.div>
  )
}