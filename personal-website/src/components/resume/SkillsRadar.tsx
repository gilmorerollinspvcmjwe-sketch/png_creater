import { motion } from 'framer-motion'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import AnimatedSection from '../common/AnimatedSection'
import skillsData from '../../data/skills.json'

export default function SkillsRadar() {
  const radarData = skillsData.categories.map((cat) => ({
    category: cat.name,
    level: cat.level,
    fullMark: 100,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Radar Chart */}
      <AnimatedSection animation="fadeInLeft">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-dark-900/50 rounded-2xl p-6 border border-dark-700/50"
        >
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            能力雷达图
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#343541" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fill: '#8e8ea0', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: '#565869', fontSize: 10 }}
              />
              <Radar
                name="能力"
                dataKey="level"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatedSection>

      {/* Skills Detail */}
      <AnimatedSection animation="fadeInRight">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-dark-100 mb-4">
            技能详情
          </h3>
          {skillsData.categories.map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-dark-900/50 border border-dark-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-dark-100 font-medium">{cat.name}</h4>
                <div className="inline-flex items-center gap-1">
                  <span className="text-accent-primary font-semibold">{cat.level}%</span>
                </div>
              </div>
              
              {/* Description */}
              {cat.description && (
                <p className="text-dark-400 text-sm mb-3">{cat.description}</p>
              )}
              
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-dark-800/50 mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${cat.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                />
              </div>

              {/* Skills list */}
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span 
                    key={skill}
                    className="text-xs px-2 py-1 rounded-lg bg-dark-800/30 text-dark-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  )
}