import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Github, Linkedin, Mail, ExternalLink, Heart } from 'lucide-react'

const socialLinks = [
  { icon: Github, href: 'https://github.com/laoxu', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/laoxu', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:laoxu@example.com', label: 'Email' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-dark-950 border-t border-dark-800/50">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">徐</span>
              </div>
              <span className="text-lg font-semibold text-dark-100">Lao Xu</span>
            </Link>
            <p className="text-dark-400 text-sm max-w-xs">
              AI 产品经理，专注于语音 AI 和智能交互产品。用 AI 重新定义产品工作方式。
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-3"
          >
            <h4 className="text-dark-100 font-semibold mb-2">快速链接</h4>
            <Link to="/projects" className="text-dark-400 hover:text-accent-primary transition-colors text-sm flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              项目作品
            </Link>
            <Link to="/knowledge" className="text-dark-400 hover:text-accent-primary transition-colors text-sm flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              AI 知识体系
            </Link>
            <Link to="/contact" className="text-dark-400 hover:text-accent-primary transition-colors text-sm flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              联系我
            </Link>
          </motion.div>

          {/* Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <h4 className="text-dark-100 font-semibold mb-2">社交媒体</h4>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-dark-800/50 border border-dark-700/50 flex items-center justify-center text-dark-400 hover:text-accent-primary hover:border-accent-primary/30 transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="divider my-8" />

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-dark-500"
        >
          <p>
            © {currentYear} Lao Xu. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  )
}