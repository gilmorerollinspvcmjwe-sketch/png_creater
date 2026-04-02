import { motion } from 'framer-motion'
import { Mail, MapPin, CheckCircle2 } from 'lucide-react'
import Section from '../components/common/Section'
import AnimatedSection from '../components/common/AnimatedSection'
import Card from '../components/common/Card'
import ContactForm from '../components/contact/ContactForm'
import SocialLinks from '../components/about/SocialLinks'
import profileData from '../data/profile.json'

export default function Contact() {
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
                联系我
              </h1>
              <p className="text-lg text-dark-400 max-w-2xl mx-auto">
                如果你有项目合作、职位机会，或者只是想聊聊 AI，欢迎联系我
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Info & Form */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <AnimatedSection animation="fadeInLeft">
            <div className="space-y-6">
              {/* Info Cards */}
              <Card glass>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div>
                    <h3 className="text-dark-100 font-semibold">邮箱</h3>
                    <a href={`mailto:${profileData.email}`} className="text-dark-400 hover:text-accent-primary transition-colors">
                      {profileData.email}
                    </a>
                  </div>
                </div>
              </Card>

              <Card glass>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-secondary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent-secondary" />
                  </div>
                  <div>
                    <h3 className="text-dark-100 font-semibold">位置</h3>
                    <p className="text-dark-400">{profileData.location}</p>
                  </div>
                </div>
              </Card>

              {/* Social */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">
                  社交媒体
                </h3>
                <SocialLinks />
              </div>

              {/* Availability */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-accent-success/10 border border-accent-success/20"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-success" />
                  <div>
                    <h4 className="text-accent-success font-medium">当前状态</h4>
                    <p className="text-dark-400 text-sm">开放新机会和项目合作</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>

          {/* Contact Form */}
          <AnimatedSection animation="fadeInRight">
            <Card glass className="relative overflow-hidden">
              <h2 className="text-xl font-semibold text-dark-100 mb-6">
                发送消息
              </h2>
              <ContactForm />
              
              {/* Decorative */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-tl from-accent-primary/10 to-transparent rounded-tl-full" />
            </Card>
          </AnimatedSection>
        </div>
      </Section>
    </motion.div>
  )
}