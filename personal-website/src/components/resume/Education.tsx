import { GraduationCap, Award } from 'lucide-react'
import Card from '../common/Card'
import AnimatedSection from '../common/AnimatedSection'
import experienceData from '../../data/experience.json'

export default function Education() {
  const { education, certifications } = experienceData

  return (
    <div className="space-y-6">
      {/* Education */}
      <div>
        <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-accent-primary" />
          教育经历
        </h3>
        {education.map((edu, index) => (
          <AnimatedSection
            key={edu.id}
            animation="fadeInUp"
            delay={index * 0.1}
          >
            <Card hover>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-dark-100 mb-1">
                    {edu.school}
                  </h4>
                  <p className="text-accent-secondary">
                    {edu.major} · {edu.degree}
                  </p>
                  <p className="text-dark-400 text-sm mt-2">
                    {edu.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-dark-500 text-sm">{edu.period}</p>
                </div>
              </div>
            </Card>
          </AnimatedSection>
        ))}
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent-primary" />
            专业认证
          </h3>
          {certifications.map((cert, index) => (
            <AnimatedSection
              key={cert.name}
              animation="fadeInUp"
              delay={index * 0.1 + 0.2}
            >
              <Card hover className="flex items-center justify-between">
                <div>
                  <h4 className="text-dark-100 font-medium">{cert.name}</h4>
                  <p className="text-dark-500 text-sm">{cert.issuer}</p>
                </div>
                <p className="text-dark-500 text-sm">{cert.year}</p>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      )}
    </div>
  )
}