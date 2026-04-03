import { motion } from 'framer-motion'
import { Building2, Cpu, Users, MapPin, Sparkles } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import ProfileCard from '../components/about/ProfileCard'
import Timeline from '../components/about/Timeline'
import ValueProposition from '../components/about/ValueProposition'
import SocialLinks from '../components/about/SocialLinks'
import profileData from '../data/profile.json'
import skillsData from '../data/skills.json'

export default function About() {
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
                关于我
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                7 年 B 端产品经理 | AI 产品专家 | 哈工大 985
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Profile */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <AnimatedSection animation="fadeInLeft">
            <ProfileCard />
          </AnimatedSection>
          <AnimatedSection animation="fadeInRight">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-dark-100">
                个人简介
              </h2>
              <div className="text-dark-400 leading-relaxed whitespace-pre-line">
                {profileData.bio.full}
              </div>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-dark-700/30">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/30">
                  <span className="text-accent-primary font-medium">{profileData.age}岁</span>
                  <span className="text-dark-500 text-sm">/{profileData.stats.yearsExperience}年经验</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-success/10">
                  <span className="text-accent-success font-medium">{profileData.stats.projectsDelivered}+</span>
                  <span className="text-dark-500 text-sm">项目交付</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-primary/10">
                  <span className="text-accent-primary font-medium">{profileData.stats.efficiencyGain}</span>
                  <span className="text-dark-500 text-sm">效率提升</span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </Section>

      {/* Job Preference */}
      <Section title="求职偏好" subtitle="期望的工作环境与发展方向">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { icon: Building2, label: '期望行业', value: profileData.jobPreference.industry },
            { icon: Users, label: '公司规模', value: profileData.jobPreference.companySize },
            { icon: Cpu, label: '技术栈', value: profileData.jobPreference.techStack },
            { icon: Sparkles, label: '团队文化', value: profileData.jobPreference.culture },
            { icon: MapPin, label: '工作地点', value: profileData.jobPreference.location },
          ].map((item, index) => (
            <AnimatedSection
              key={item.label}
              animation="fadeInUp"
              delay={index * 0.1}
            >
              <Card glass className="text-center p-4">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-3 mx-auto">
                  <item.icon className="w-5 h-5 text-accent-primary" />
                </div>
                <p className="text-xs text-dark-500 mb-2">{item.label}</p>
                <p className="text-sm text-dark-300 font-medium">{item.value}</p>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </Section>

      {/* Hobby Skills */}
      {skillsData.hobbySkills && skillsData.hobbySkills.length > 0 && (
        <Section title="业余技能" subtitle="工作之外的兴趣与能力">
          <div className="flex flex-wrap justify-center gap-4">
            {skillsData.hobbySkills.map((skill, index) => (
              <AnimatedSection
                key={skill.name}
                animation="scaleIn"
                delay={index * 0.1}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-dark-700/50 hover:border-accent-primary/30 transition-colors"
                >
                  <span className="text-lg">{skill.icon}</span>
                  <span className="text-dark-300 font-medium">{skill.name}</span>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </Section>
      )}

      {/* Timeline */}
      <Section title="职业历程" subtitle="从传统互联网到 AI 产品经理的转型之路">
        <Timeline />
      </Section>

      {/* Values */}
      <Section>
        <ValueProposition />
      </Section>

      {/* Social */}
      <Section>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-dark-100 mb-6">
            保持联系
          </h2>
          <p className="text-dark-400 mb-8">
            如果你想了解更多或有机会合作，欢迎联系我
          </p>
          <SocialLinks />
        </div>
      </Section>
    </motion.div>
  )
}