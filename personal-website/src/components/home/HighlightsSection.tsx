import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Card from '../common/Card'
import AnimatedSection from '../common/AnimatedSection'
import profile from '../../data/profile.json'

// 默认备用能力（当 profile.coreSkillsHighlight 未填充时使用）
const defaultHighlights = [
  {
    icon: '⚡',
    title: 'AI 技术理解',
    description: '深入理解 LLM、RAG、Agent 等核心技术，能将复杂技术转化为产品方案',
    link: '/knowledge',
  },
  {
    icon: '🎙️',
    title: '语音 AI 实践',
    description: '主导语音机器人产品从 0 到 1，覆盖 10 万+用户，实战经验丰富',
    link: '/projects',
  },
  {
    icon: '🚀',
    title: '效率导向',
    description: '通过 AI 协同办公，实现 300% 效率提升，探索产品经理新工作方式',
    link: '/copilot',
  },
  {
    icon: '🧠',
    title: '产品思维',
    description: '用户价值至上，用数据和用户驱动产品决策，持续迭代优化',
    link: '/resume',
  },
  {
    icon: '💡',
    title: 'AI 工具链',
    description: '精通 OpenClaw/Claude Code，搭建 AI 工具链，开发 10+ AI 应用',
    link: '/copilot',
  },
]

const highlights = profile.coreSkillsHighlight && profile.coreSkillsHighlight.length > 0
  ? profile.coreSkillsHighlight.map((skill: { title: string; icon: string; description: string }) => ({
      icon: skill.icon,
      title: skill.title,
      description: skill.description,
      link: '/projects',
    }))
  : defaultHighlights

const COLORS = ['accent-primary', 'accent-secondary', 'accent-success', 'accent-warning', 'accent-error']

export default function HighlightsSection() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-100 mb-4">
              核心能力
            </h2>
            <p className="text-lg text-dark-400 max-w-2xl mx-auto">
              作为 AI 产品经理，我具备技术理解、产品落地、效率优化的综合能力
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {highlights.map((item, index) => (
            <AnimatedSection
              key={item.title}
              animation="fadeInUp"
              delay={index * 0.1}
            >
              <Link to={item.link}>
                <Card hover className="h-full">
                  <div className="flex flex-col items-start">
                    {/* Icon - emoji 或 Lucide 图标 */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-${COLORS[index % COLORS.length]}/10 mb-4 text-2xl`}>
                      {item.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-dark-100 mb-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-dark-400 text-xs leading-relaxed mb-3 line-clamp-3">
                      {item.description}
                    </p>

                    {/* Link */}
                    <div className={`inline-flex items-center gap-1 text-${COLORS[index % COLORS.length]} text-xs font-medium`}>
                      了解更多
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Card>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}