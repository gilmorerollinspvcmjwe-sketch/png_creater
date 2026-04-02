import { motion } from 'framer-motion'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import ProfileCard from '../components/about/ProfileCard'
import Timeline from '../components/about/Timeline'
import ValueProposition from '../components/about/ValueProposition'
import SocialLinks from '../components/about/SocialLinks'
import profileData from '../data/profile.json'

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
            </div>
          </AnimatedSection>
        </div>
      </Section>

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