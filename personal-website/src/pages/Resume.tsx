import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Briefcase, GraduationCap, BarChart3 } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import WorkExperience from '../components/resume/WorkExperience'
import ProjectCards from '../components/resume/ProjectCards'
import Education from '../components/resume/Education'
import SkillsRadar from '../components/resume/SkillsRadar'

const tabs = [
  { id: 'work', label: '工作经历', icon: Briefcase },
  { id: 'projects', label: '项目经历', icon: FileText },
  { id: 'education', label: '教育背景', icon: GraduationCap },
  { id: 'skills', label: '技能雷达', icon: BarChart3 },
]

export default function Resume() {
  const [activeTab, setActiveTab] = useState('work')

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
                专业简历
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                7 年 B 端产品经验，专注大模型语音智能体、Agent 架构、企业级 AI 应用
              </p>
            </div>
          </AnimatedSection>

          {/* Tabs */}
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <div className="flex justify-center mb-8">
              <div className="inline-flex gap-2 p-1 rounded-xl bg-dark-900/50 border border-dark-700/50">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                        : 'text-dark-400 hover:text-dark-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Content */}
      <Section>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'work' && <WorkExperience />}
          {activeTab === 'projects' && <ProjectCards />}
          {activeTab === 'education' && <Education />}
          {activeTab === 'skills' && <SkillsRadar />}
        </motion.div>
      </Section>
    </motion.div>
  )
}