import { motion } from 'framer-motion'
import { Code2, Sparkles, Zap, ExternalLink } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import CodeBlock from '../components/prompts/CodeBlock'
import vibeCoding from '../data/vibe-coding.json'

const tools = vibeCoding.tools

const codeExample = `
// 使用 OpenClaw 生成组件的示例
// Prompt: "创建一个带动画效果的卡片组件"

import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export function AnimatedCard({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'rounded-xl p-4 bg-dark-900/50 border border-dark-700/50',
        'hover:border-accent-primary/30 transition-colors',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
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

      {/* Code Example */}
      <Section title="代码示例" subtitle="AI 生成的代码示例">
        <AnimatedSection animation="fadeInUp">
          <Card glass className="overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-accent-primary" />
                <span className="text-sm text-dark-400">React + Framer Motion</span>
              </div>
              <Badge variant="success" size="sm">
                AI 生成
              </Badge>
            </div>
            <CodeBlock code={codeExample} language="tsx" />
          </Card>
        </AnimatedSection>
      </Section>

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