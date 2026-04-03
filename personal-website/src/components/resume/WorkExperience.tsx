import { MapPin, Users } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'
import AnimatedSection from '../common/AnimatedSection'
import experienceData from '../../data/experience.json'

export default function WorkExperience() {
  const { work } = experienceData

  return (
    <div className="space-y-6">
      {work.map((exp, index) => (
        <AnimatedSection
          key={exp.id}
          animation="fadeInUp"
          delay={index * 0.1}
        >
          <Card hover className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-dark-100 mb-1">
                  {exp.role}
                </h3>
                <p className="text-accent-primary">
                  {exp.company}
                </p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-dark-800/50 text-dark-400 text-sm">
                  <MapPin className="w-3 h-3" />
                  {exp.location}
                </div>
                <p className="text-dark-500 text-sm mt-2">{exp.period}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-2 mb-4">
              {exp.highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                  <span className="text-dark-400">{highlight}</span>
                </div>
              ))}
            </div>

            {/* Tech & achievements */}
            <div className="flex flex-wrap gap-2 mb-4">
              {exp.tech.map((tech) => (
                <Badge key={tech} variant="secondary" size="sm">
                  {tech}
                </Badge>
              ))}
            </div>

            {/* Team size */}
            <div className="flex items-center gap-4 pt-4 border-t border-dark-700/50">
              <div className="inline-flex items-center gap-2 text-dark-500 text-sm">
                <Users className="w-4 h-4" />
                团队 {exp.team} 人
              </div>
            </div>

            {/* Achievements */}
            {exp.achievements && (
              <div className="mt-4 p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                <p className="text-accent-success text-sm font-medium mb-2">主要成就</p>
                <ul className="space-y-1">
                  {exp.achievements.map((achievement, i) => (
                    <li key={i} className="text-dark-400 text-sm flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-accent-success" />
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </AnimatedSection>
      ))}
    </div>
  )
}