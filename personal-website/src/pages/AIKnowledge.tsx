import { motion } from 'framer-motion'
import { Brain, Database, Bot, MessageSquare, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import ConceptCard from '../components/knowledge/ConceptCard'
import knowledgeData from '../data/knowledge.json'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain: Brain,
  Database: Database,
  Bot: Bot,
  MessageSquare: MessageSquare,
}

export default function AIKnowledge() {
  const [expandedSection, setExpandedSection] = useState<string | null>('llm-basics')

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
                AI 知识体系
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                系统整理 LLM、RAG、Agent 等核心技术概念，面试必备知识图谱
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Knowledge Sections */}
      <Section>
        <div className="space-y-4">
          {knowledgeData.sections.map((section, index) => {
            const IconComponent = iconMap[section.icon] || Brain
            const isExpanded = expandedSection === section.id

            return (
              <AnimatedSection
                key={section.id}
                animation="fadeInUp"
                delay={index * 0.1}
              >
                <Card
                  hover
                  className="cursor-pointer"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-accent-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-dark-100">
                          {section.title}
                        </h2>
                        <p className="text-dark-400 text-sm">
                          {section.description}
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

                  {/* Concepts (expanded) */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6 pt-6 border-t border-dark-700/50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.concepts.map((concept) => (
                          <ConceptCard key={concept.name} concept={concept} />
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
    </motion.div>
  )
}