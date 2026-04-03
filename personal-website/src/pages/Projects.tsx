import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Star, Briefcase, Wrench, Gamepad2, BookOpen } from 'lucide-react'
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

// 精选项目 ID
const FEATURED_PROJECT_IDS = [
  'excel-farm',
  'ai-voice-bot',
  'pm-superpowers',
  'rag-saas-mvp',
  'hr-resume-screener',
  'voice-vault',
  'personal-website',
  'opencli-core', // multi-agent-system 替换为 opencli-core
]

// 从所有分类中提取项目
const allProjects = typedProjectsData.categories.flatMap(cat => cat.projects)

// 分类 Tab 配置
const categoryTabs = [
  { id: 'featured', label: '精选', icon: Star, description: '最亮眼的项目作品' },
  { id: 'all', label: '全部', icon: Search, description: '所有项目' },
  { id: 'work', label: '主业产品', icon: Briefcase, description: '正式工作相关' },
  { id: 'tools', label: '提效工具', icon: Wrench, description: '效率提升工具' },
  { id: 'games', label: '游戏项目', icon: Gamepad2, description: '游戏开发作品' },
  { id: 'skills', label: '技能库', icon: BookOpen, description: 'OpenClaw 技能' },
]

const allTags = [
  'React', 'TypeScript', 'Python', 'FastAPI', 'AI', 'LLM', 'OpenClaw', 'Vite'
]

export default function Projects() {
  const [activeCategory, setActiveCategory] = useState('featured') // 默认选中「精选」
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filteredProjects = useMemo(() => {
    let projects = allProjects

    // 按 Tab 筛选
    if (activeCategory === 'featured') {
      projects = projects.filter(p => FEATURED_PROJECT_IDS.includes(p.id))
    } else if (activeCategory !== 'all') {
      const category = typedProjectsData.categories.find(c => c.id === activeCategory)
      if (category) {
        projects = category.projects
      }
    }

    // 搜索和标签筛选
    return projects.filter((project) => {
      const matchesSearch = searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag => project.tech.some(t => t.toLowerCase().includes(tag.toLowerCase())))
      
      return matchesSearch && matchesTags
    })
  }, [activeCategory, searchQuery, selectedTags])

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

          {/* Category Tabs */}
          <AnimatedSection animation="fadeInUp" delay={0.1}>
            <div className="flex justify-center mb-8">
              <div className="inline-flex gap-2 p-1 rounded-xl bg-dark-900/50 border border-dark-700/50 flex-wrap">
                {categoryTabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeCategory === tab.id
                        ? tab.id === 'featured'
                          ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                          : 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20'
                        : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/30'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === 'featured' && (
                      <span className="text-xs bg-accent-primary/30 px-1.5 py-0.5 rounded">
                        {FEATURED_PROJECT_IDS.length}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Search & Filter */}
          <AnimatedSection animation="fadeInUp" delay={0.2}>
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

          {/* Category Description */}
          <AnimatedSection animation="fadeInUp" delay={0.3}>
            <p className="text-center text-dark-500 text-sm mb-6">
              {categoryTabs.find(t => t.id === activeCategory)?.description}
              {activeCategory === 'featured' && ' · 用 AI 编程工具打造的代表作'}
            </p>
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