import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Github, Globe } from 'lucide-react'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Section from '../components/common/Section'
import projectsData from '../data/projects.json'

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
const allProjects = typedProjectsData.categories.flatMap(cat => cat.projects)

export default function ProjectDetail() {
  // Get project ID from URL
  const projectId = window.location.pathname.split('/projects/')[1]
  const project = allProjects.find(p => p.id === projectId)

  if (!project) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16 container-custom py-12"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-dark-100 mb-4">项目未找到</h1>
          <Link to="/projects" className="text-accent-primary hover:underline">
            返回项目列表
          </Link>
        </div>
      </motion.div>
    )
  }

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
            <div className="mb-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-dark-500 mb-4">
                <Link to="/projects" className="hover:text-accent-primary transition-colors">
                  项目作品
                </Link>
                <ArrowRight className="w-3 h-3" />
                <span className="text-dark-100">{project.name}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
                {project.name}
              </h1>

              {/* Description */}
              <p className="text-lg text-dark-400 mb-6">
                {project.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Badge variant={project.status === '已完成' ? 'success' : 'warning'}>
                  {project.status === '已完成' ? '已上线' : project.status}
                </Badge>
              </div>

              {/* Links */}
              <div className="flex gap-4">
                {project.github && (
                  <motion.a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-100 hover:border-accent-primary/30 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </motion.a>
                )}
                {project.link && (
                  <motion.a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Demo
                  </motion.a>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Content */}
      <div className="container-custom">
        {/* Full description */}
        <Section>
          <AnimatedSection animation="fadeInUp">
            <Card glass>
              <h2 className="text-xl font-semibold text-dark-100 mb-4">项目概述</h2>
              <div className="text-dark-400 whitespace-pre-line leading-relaxed">
                {project.description}
              </div>
            </Card>
          </AnimatedSection>
        </Section>

        {/* Tech Stack */}
        <Section title="技术栈" subtitle="项目使用的技术和工具">
          <div className="flex flex-wrap gap-2">
            {project.tech.map((tech) => (
              <Badge key={tech} variant="neutral" size="md">
                {tech}
              </Badge>
            ))}
          </div>
        </Section>

        {/* Highlights */}
        {project.highlights && project.highlights.length > 0 && (
          <Section title="核心亮点" subtitle="产品的主要特色">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.highlights.map((highlight, index) => (
                <AnimatedSection
                  key={highlight}
                  animation="fadeInUp"
                  delay={index * 0.1}
                >
                  <Card hover>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent-primary flex-shrink-0 mt-2" />
                      <span className="text-dark-100">{highlight}</span>
                    </div>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </Section>
        )}

        {/* Back link */}
        <AnimatedSection animation="fadeInUp" className="py-12">
          <div className="text-center">
            <Link to="/projects">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-100 hover:border-accent-primary/30 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                返回项目列表
              </motion.button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </motion.div>
  )
}
