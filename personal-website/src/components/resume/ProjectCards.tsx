import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import AnimatedSection from '../common/AnimatedSection'
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

interface Category {
  id: string
  name: string
  description: string
  projects: Project[]
}

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

export default function ProjectCards() {
  // 从所有分类中提取项目
  const projects = typedProjectsData.categories.flatMap(cat => cat.projects)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {projects.map((project, index) => (
        <AnimatedSection
          key={project.id}
          animation="fadeInUp"
          delay={index * 0.1}
        >
          <Link to={`/projects/${project.id}`}>
            <Card hover className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">
                    {project.name}
                  </h3>
                  <p className="text-dark-400 text-sm">
                    {project.tech.slice(0, 2).join(' · ')}
                  </p>
                </div>
                <Badge variant={project.status === '已完成' ? 'success' : 'warning'} size="sm">
                  {project.status === '已完成' ? '已上线' : project.status}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-dark-500 text-sm mb-4">
                {project.description}
              </p>

              {/* Tech tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tech.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="neutral" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Highlights */}
              {project.highlights && project.highlights.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-dark-500 mb-1">亮点</p>
                  <p className="text-sm text-dark-400">{project.highlights.slice(0, 2).join(' · ')}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                <div className="flex gap-3">
                  {project.github && (
                    <a 
                      href={project.github} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-500 hover:text-accent-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <span className="text-accent-primary text-sm font-medium flex items-center gap-1">
                  详情
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Card>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  )
}