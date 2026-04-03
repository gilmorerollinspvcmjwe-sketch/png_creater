import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, FileText, MapPin, Mail } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import experienceData from '../data/experience.json'
import profile from '../data/profile.json'

export default function Resume() {
  const [isExpanded, setIsExpanded] = useState(false)

  const { work, education } = experienceData

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
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
                专业简历
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                7 年 B 端产品经验，专注大模型语音智能体、Agent 架构、企业级 AI 应用
              </p>
            </div>
          </AnimatedSection>

          {/* 一页纸简历 */}
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <Card className="max-w-4xl mx-auto p-8">
              {/* Header - 个人信息 */}
              <div className="flex items-start justify-between mb-6 border-b border-dark-700/50 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-dark-100 mb-2">{profile.name}</h2>
                  <p className="text-accent-primary font-medium mb-3">AI 产品经理 · 7年B端经验</p>
                  <div className="flex flex-wrap gap-4 text-sm text-dark-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {profile.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {profile.email}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="success">在职</Badge>
                </div>
              </div>

              {/* 核心能力标签 */}
              <div className="mb-6">
                <h3 className="text-sm text-dark-500 mb-2">核心能力</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI 产品设计', 'LLM/TTS/ASR', 'Agent 架构', 'RAG 知识库', 'React/TS', 'FastAPI'].map((skill) => (
                    <Badge key={skill} variant="primary" size="sm">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* 一页纸工作经历（紧凑版） */}
              <div className="mb-6">
                <h3 className="text-sm text-dark-500 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  工作经历
                </h3>
                <div className="space-y-4">
                  {/* 当前工作 - 突出显示 */}
                  <div className="p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-dark-100 font-medium">{work[0].role}</p>
                        <p className="text-accent-primary text-sm">{work[0].company}</p>
                      </div>
                      <p className="text-dark-500 text-sm">{work[0].period}</p>
                    </div>
                    <p className="text-dark-400 text-sm mt-2 line-clamp-2">
                      {work[0].highlights[0]}
                    </p>
                  </div>

                  {/* 其他工作经历 - 紧凑展示 */}
                  {work.slice(1, 3).map((exp) => (
                    <div key={exp.id} className="flex items-start justify-between py-2 border-b border-dark-700/30 last:border-0">
                      <div>
                        <p className="text-dark-100 font-medium text-sm">{exp.role}</p>
                        <p className="text-dark-500 text-xs">{exp.company}</p>
                      </div>
                      <p className="text-dark-600 text-xs">{exp.period}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 教育 */}
              <div className="mb-6">
                <h3 className="text-sm text-dark-500 mb-2">教育背景</h3>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-dark-100 font-medium text-sm">{education[0].school}</p>
                    <p className="text-dark-500 text-xs">{education[0].major} · {education[0].degree}</p>
                  </div>
                  <p className="text-dark-600 text-xs">{education[0].period}</p>
                </div>
              </div>

              {/* 核心成果 */}
              <div className="mb-6">
                <h3 className="text-sm text-dark-500 mb-2">核心成果</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-dark-800/30">
                    <p className="text-accent-primary font-bold">300%</p>
                    <p className="text-dark-500 text-xs">效率提升</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-dark-800/30">
                    <p className="text-accent-secondary font-bold">100+</p>
                    <p className="text-dark-500 text-xs">页面升级</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-dark-800/30">
                    <p className="text-accent-success font-bold">10+</p>
                    <p className="text-dark-500 text-xs">AI应用</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-dark-800/30">
                    <p className="text-accent-warning font-bold">30+</p>
                    <p className="text-dark-500 text-xs">客户服务</p>
                  </div>
                </div>
              </div>

              {/* 展开/收起按钮 */}
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-dark-100 hover:border-accent-primary/30 transition-all flex items-center justify-center gap-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    收起详情
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    查看完整经历详情
                  </>
                )}
              </motion.button>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* 展开的详细内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden"
          >
            <Section>
              <div className="max-w-4xl mx-auto space-y-8">
                {/* 详细工作经历 */}
                <div>
                  <h3 className="text-lg font-semibold text-dark-100 mb-4">完整工作经历</h3>
                  <div className="space-y-4">
                    {work.map((exp, index) => (
                      <motion.div
                        key={exp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card hover className="relative">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-xl font-semibold text-dark-100 mb-1">
                                {exp.role}
                              </h4>
                              <p className="text-accent-primary">
                                {exp.company}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-dark-800/50 text-dark-400 text-sm">
                                <MapPin className="w-3 h-3" />
                                {exp.location}
                              </div>
                              <p className="text-dark-500 text-sm mt-2">{exp.period}</p>
                            </div>
                          </div>

                          {/* Highlights */}
                          <div className="space-y-2 mb-4">
                            {exp.highlights.map((highlight, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                                <span className="text-dark-400">{highlight}</span>
                              </div>
                            ))}
                          </div>

                          {/* Tech */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {exp.tech.map((tech) => (
                              <Badge key={tech} variant="secondary" size="sm">
                                {tech}
                              </Badge>
                            ))}
                          </div>

                          {/* Achievements */}
                          {exp.achievements && (
                            <div className="p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                              <p className="text-accent-success text-sm font-medium mb-2">主要成就</p>
                              <ul className="space-y-1">
                                {exp.achievements.map((achievement, i) => (
                                  <li key={i} className="text-dark-400 text-sm flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-accent-success" />
                                    {achievement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* 详细项目经历（精选） */}
                <div>
                  <h3 className="text-lg font-semibold text-dark-100 mb-4">代表性项目</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'AI Voice Agent', desc: '大模型语音智能体平台', tech: ['LLM', 'TTS', 'ASR', 'RAG'] },
                      { name: 'CRM UI 升级', desc: '100+ 页面现代化重构', tech: ['React', 'TS', 'Design Tokens'] },
                      { name: 'Excel Farm', desc: '伪装成 Excel 的农场 RPG', tech: ['React', 'Supabase', 'AI'] },
                      { name: 'PM Superpowers', desc: '12 个 PM AI 技能包', tech: ['OpenClaw', 'Agent'] },
                    ].map((project, index) => (
                      <motion.div
                        key={project.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card glass className="p-4">
                          <h4 className="text-dark-100 font-medium mb-1">{project.name}</h4>
                          <p className="text-dark-500 text-sm mb-2">{project.desc}</p>
                          <div className="flex flex-wrap gap-1">
                            {project.tech.map((t) => (
                              <Badge key={t} variant="neutral" size="sm">{t}</Badge>
                            ))}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}