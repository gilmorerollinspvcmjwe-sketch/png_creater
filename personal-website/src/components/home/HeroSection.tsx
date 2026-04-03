import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'
import { useTypewriter } from '../../hooks/useTypewriter'
import profile from '../../data/profile.json'

// 有记忆点的具体描述（更有个性）
const roles = [
  { title: '用 AI 把产品经理效率提升 3 倍', gradient: 'from-accent-primary to-accent-secondary' },
  { title: '独立开发了 10+ AI 应用的游戏宅', gradient: 'from-accent-secondary to-accent-warning' },
  { title: '让 Excel 变成农场 RPG 的 PM', gradient: 'from-accent-warning to-accent-success' },
  { title: '服务过中信/民生/平安/建行的金融 PM', gradient: 'from-accent-success to-accent-primary' },
  { title: '7年B端产品，专注 AI 语音智能体', gradient: 'from-accent-primary to-accent-secondary' },
]

export default function HeroSection() {
  const currentIndex = Math.floor(Date.now() / 3000) % roles.length
  const currentRole = roles[currentIndex]
  
  const { displayText, isTyping } = useTypewriter({
    text: currentRole.title,
    speed: 100,
    delay: 500,
    loop: true,
    loopDelay: 2000,
  })

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-dark-900/50 to-dark-950" />
      
      {/* Animated background orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent-primary/20 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent-secondary/20 blur-3xl"
      />

      <div className="container-custom relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {profile.tagline}
            </span>
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4"
          >
            <span className="text-dark-100">你好，我是</span>
            <span className="gradient-text ml-2">{profile.name}</span>
          </motion.h1>

          {/* Typewriter role - 渐变大字，更显眼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-16 mb-8"
          >
            <span className={`text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r ${currentRole.gradient} bg-clip-text text-transparent`}>
              {displayText}
              {isTyping && (
                <span className="inline-block w-1 h-10 ml-2 bg-gradient-to-b from-accent-primary to-accent-secondary animate-blink" />
              )}
            </span>
          </motion.div>

          {/* Description - 精简版，1 行搞定 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base md:text-lg text-dark-400 max-w-2xl mx-auto mb-8"
          >
            {profile.bio.short}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/projects">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                查看项目作品
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="secondary" size="lg">
                联系我
              </Button>
            </Link>
          </motion.div>

          {/* 向下滚动提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-[-80px] left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-dark-500"
            >
              <span className="text-sm">向下滚动探索更多</span>
              <div className="w-6 h-10 rounded-full border-2 border-dark-500 flex items-start justify-center pt-2">
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-accent-primary"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}