import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import AnimatedSection from '../common/AnimatedSection'
import Section from '../common/Section'
import projectsData from '../../data/projects.json'

// 定义项目类型
interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  status: string
  highlights: string[]
  link: string
  github: string
}

// 定义分类类型
interface Category {
  id: string
  name: string
  description: string
  projects: Project[]
}

// 定义 JSON 数据类型
interface ProjectsData {
  categories: Category[]
  metadata: {
    generatedAt: string
    totalProjects: number
    categories: number
    workspace: string
  }
}

const typedProjectsData = projectsData as ProjectsData

export default function FeaturedProjects() {
  // 从所有分类中提取项目
  const allProjects = typedProjectsData.categories.flatMap(cat => cat.projects)
  
  // 筛选精选项目：优先选择已完成的重点项目
  const featuredProjects = allProjects
    .filter(p => p.status === '已完成' || p.status === '进行中')
    .slice(0, 3)

  return (
    <Section
      title="精选项目"
      subtitle="从需求分析到产品落地，每个项目都体现了我对 AI 产品的思考和实践"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredProjects.map((project, index) => (
          <AnimatedSection
            key={project.id}
            animation="fadeInUp"
            delay={index * 0.1}
          >
            <Link to={`/projects/${project.id}`}>
              <Card hover glow className="h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-dark-100 mb-1">
                      {project.name}
                    </h3>
                    <p className="text-dark-400 text-sm">
                      {project.description}
                    </p>
                  </div>
                  <Badge variant="success" size="sm">
                    {project.status === '已完成' ? '已上线' : project.status}
                  </Badge>
                </div>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Features preview */}
                <div className="space-y-2 mb-4">
                  {project.highlights.slice(0, 2).map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-1.5" />
                      <span className="text-sm text-dark-400">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                  <span className="text-sm text-dark-500">
                    {project.tech.slice(0, 2).join(' · ')}
                  </span>
                  <div className="flex items-center gap-2 text-accent-primary text-sm font-medium">
                    查看详情
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </Link>
          </AnimatedSection>
        ))}
      </div>

      {/* View all link */}
      <AnimatedSection animation="fadeInUp" delay={0.4}>
        <div className="text-center mt-12">
          <Link to="/projects">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-100 font-medium hover:border-accent-primary/30 transition-colors"
            >
              查看全部项目
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </div>
      </AnimatedSection>
    </Section>
  )
}