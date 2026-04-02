import { motion } from 'framer-motion'
import { Briefcase, GraduationCap } from 'lucide-react'
import Card from '../common/Card'
import profileData from '../../data/profile.json'

export default function Timeline() {
  const { timeline } = profileData

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-accent-primary/50 via-accent-secondary/50 to-accent-primary/50" />

      {/* Timeline items */}
      <div className="space-y-8">
        {timeline.map((item, index) => (
          <motion.div
            key={item.year}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative flex items-center gap-4 ${
              index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* Dot */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', duration: 0.5, delay: index * 0.1 }}
              className="absolute left-0 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent-primary shadow-glow-sm"
            />

            {/* Content */}
            <div className={`flex-1 ml-8 md:ml-0 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
              <Card hover className="relative">
                {/* Year badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-sm font-semibold mb-4">
                  {item.year}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-dark-100 mb-1">
                  {item.title}
                </h3>
                <p className="text-accent-secondary text-sm mb-2">
                  {item.company}
                </p>
                <p className="text-dark-400">
                  {item.description}
                </p>

                {/* Icon */}
                <div className="absolute top-4 right-4">
                  {item.title.includes('学士') || item.title.includes('硕士') ? (
                    <GraduationCap className="w-5 h-5 text-dark-500" />
                  ) : (
                    <Briefcase className="w-5 h-5 text-dark-500" />
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}