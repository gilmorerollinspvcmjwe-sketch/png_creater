import { ArrowRight, ExternalLink, Github } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import AnimatedSection from '../common/AnimatedSection'
import { Link } from 'react-router-dom'

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

interface ProjectGridProps {
  projects: Project[]
}

export default function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <AnimatedSection
          key={project.id}
          animation="fadeInUp"
          delay={index * 0.1}
        >
          <Link to={`/projects/${project.id}`}>
            <Card hover glow className="h-full relative">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-dark-100 mb-2">
                  {project.name}
                </h3>
                <p className="text-dark-400">
                  {project.description}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={project.status === '已完成' ? 'success' : 'warning'} size="sm">
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

              {/* Highlights preview */}
              {project.highlights && project.highlights.length > 0 && (
                <div className="space-y-2 mb-4">
                  {project.highlights.slice(0, 2).map((highlight, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-1.5" />
                      <span className="text-sm text-dark-400">{highlight}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                <div className="flex gap-3">
                  {project.github && (
                    <span className="text-dark-500 hover:text-accent-primary transition-colors">
                      <Github className="w-4 h-4" />
                    </span>
                  )}
                  {project.link && (
                    <span className="text-dark-500 hover:text-accent-primary transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <span className="text-accent-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
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