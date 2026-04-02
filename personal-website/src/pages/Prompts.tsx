import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, BarChart2, Search, Code, ChevronDown, Check } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import PromptCard from '../components/prompts/PromptCard'
import promptsData from '../data/prompts.json'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText: FileText,
  BarChart: BarChart2,
  Search: Search,
  Code: Code,
}

export default function Prompts() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('prd')

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
                提示词库
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                高效提示词模板，让 AI 成为你的工作助手
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Categories */}
      <Section>
        <div className="space-y-4">
          {promptsData.categories.map((category, index) => {
            const IconComponent = iconMap[category.icon] || FileText
            const isExpanded = expandedCategory === category.id

            return (
              <AnimatedSection
                key={category.id}
                animation="fadeInUp"
                delay={index * 0.1}
              >
                <Card
                  hover
                  className="cursor-pointer"
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-accent-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-dark-100">
                          {category.name}
                        </h2>
                        <p className="text-dark-400 text-sm">
                          {category.templates.length} 个模板
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-dark-500" />
                    </motion.div>
                  </div>

                  {/* Templates (expanded) */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6 pt-6 border-t border-dark-700/50"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {category.templates.map((template) => (
                          <PromptCard key={template.id} template={template} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </Card>
              </AnimatedSection>
            )
          })}
        </div>
      </Section>

      {/* Usage Tips */}
      <Section title="使用技巧" subtitle="如何更好地使用这些提示词模板">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedSection animation="fadeInLeft">
            <Card glass>
              <div className="text-center">
                <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-4 h-4 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">
                  替换变量
                </h3>
                <p className="text-dark-400 text-sm">
                  将 {'{{input}}'} 替换为你的具体内容
                </p>
              </div>
            </Card>
          </AnimatedSection>
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <Card glass>
              <div className="text-center">
                <div className="w-8 h-8 rounded-lg bg-accent-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-4 h-4 text-accent-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">
                  定制调整
                </h3>
                <p className="text-dark-400 text-sm">
                  根据具体场景调整输出格式
                </p>
              </div>
            </Card>
          </AnimatedSection>
          <AnimatedSection animation="fadeInRight" delay={0.2}>
            <Card glass>
              <div className="text-center">
                <div className="w-8 h-8 rounded-lg bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-4 h-4 text-accent-success" />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">
                  持续迭代
                </h3>
                <p className="text-dark-400 text-sm">
                  根据效果反馈不断优化
                </p>
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </Section>
    </motion.div>
  )
}