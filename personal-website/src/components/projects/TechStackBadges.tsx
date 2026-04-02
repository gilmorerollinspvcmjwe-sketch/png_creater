import { motion } from 'framer-motion'
import AnimatedSection from '../common/AnimatedSection'

interface TechStackBadgesProps {
  techs: string[]
}

const techCategories: Record<string, string[]> = {
  'Frontend': ['React', 'TypeScript', 'JavaScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Next.js', 'Vue', 'Angular'],
  'Backend': ['Node.js', 'Python', 'Go', 'Java', 'Rust'],
  'AI/ML': ['LLM', 'TTS', 'ASR', 'RAG', 'Agent', 'Gemini', 'GPT-4', 'OpenAI', 'Claude', 'LangChain'],
  'Database': ['Pinecone', 'PostgreSQL', 'MongoDB', 'Redis', '向量数据库'],
  'Tools': ['Git', 'Docker', 'Kubernetes', 'AWS', 'Vercel'],
}

const techColors: Record<string, string> = {
  'Frontend': 'accent-primary',
  'Backend': 'accent-secondary',
  'AI/ML': 'accent-success',
  'Database': 'accent-warning',
  'Tools': 'accent-error',
}

export default function TechStackBadges({ techs }: TechStackBadgesProps) {
  // Group techs by category
  const groupedTechs = techs.reduce((acc, tech) => {
    for (const [category, items] of Object.entries(techCategories)) {
      if (items.some(item => tech.includes(item) || item.includes(tech))) {
        if (!acc[category]) acc[category] = []
        acc[category].push(tech)
        break
      }
    }
    if (!acc['Other']) acc['Other'] = []
    if (!Object.values(techCategories).flat().some(item => tech.includes(item) || item.includes(tech))) {
      acc['Other'].push(tech)
    }
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedTechs).map(([category, items], catIndex) => (
        <AnimatedSection
          key={category}
          animation="fadeInUp"
          delay={catIndex * 0.1}
        >
          <div>
            <h3 className="text-sm font-medium text-dark-500 mb-3">
              {category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {items.map((tech, index) => (
                <motion.div
                  key={tech}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                  className={`px-4 py-2 rounded-lg bg-${techColors[category] || 'accent-primary'}/10 border border-${techColors[category] || 'accent-primary'}/30 text-${techColors[category] || 'accent-primary'} font-medium`}
                >
                  {tech}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      ))}
    </div>
  )
}