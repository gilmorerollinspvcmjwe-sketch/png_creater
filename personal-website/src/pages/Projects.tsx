import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import ProjectGrid from '../components/projects/ProjectGrid'
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

// 从所有分类中提取项目
const allProjects = typedProjectsData.categories.flatMap(cat => cat.projects)

const allTags = [
  'React', 'TypeScript', 'Python', 'FastAPI', 'AI', 'LLM', 'OpenClaw', 'Vite'
]

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filteredProjects = useMemo(() => {
    return allProjects.filter((project) => {
      const matchesSearch = searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag => project.tech.some(t => t.toLowerCase().includes(tag.toLowerCase())))
      
      return matchesSearch && matchesTags
    })
  }, [searchQuery, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
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
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
                项目作品
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                从需求分析到产品落地，每个项目都是 AI 产品思维的实践
              </p>
            </div>
          </AnimatedSection>

          {/* Search & Filter */}
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <div className="mb-8">
              {/* Search */}
              <div className="relative max-w-md mx-auto mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  placeholder="搜索项目..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700/50 text-dark-100 placeholder:text-dark-500 focus:border-accent-primary/30 focus:ring-2 focus:ring-accent-primary/10 transition-all"
                />
              </div>

              {/* Tags filter */}
              <div className="flex flex-wrap justify-center gap-2">
                {allTags.map((tag) => (
                  <motion.button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                        : 'bg-dark-800/30 text-dark-400 border border-dark-700/30 hover:border-dark-600/50'
                    }`}
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Projects */}
      <Section>
        {filteredProjects.length > 0 ? (
          <ProjectGrid projects={filteredProjects} />
        ) : (
          <AnimatedSection>
            <div className="text-center py-12">
              <p className="text-dark-400">没有找到匹配的项目</p>
            </div>
          </AnimatedSection>
        )}
      </Section>
    </motion.div>
  )
}