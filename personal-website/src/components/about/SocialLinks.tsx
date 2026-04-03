import { motion } from 'framer-motion'
import { Github, Linkedin, Mail } from 'lucide-react'
import profileData from '../../data/profile.json'

interface SocialLinks {
  github: string
  linkedin: string
}

interface ProfileData {
  name: string
  email: string
  social: SocialLinks
}

const typedProfileData = profileData as ProfileData

export default function SocialLinks() {
  const { social, email } = typedProfileData

  const socialItems = [
    { name: 'GitHub', icon: Github, url: social.github },
    { name: 'LinkedIn', icon: Linkedin, url: social.linkedin },
    { name: '邮箱', icon: Mail, url: `mailto:${email}` },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {socialItems.map((item, index) => (
        <motion.a
          key={item.name}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl glass border border-dark-700/50 text-dark-100 hover:border-accent-primary/30 hover:text-accent-primary transition-colors"
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.name}</span>
        </motion.a>
      ))}
    </div>
  )
}