import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import profile from '../../data/profile.json'
import { 
  Home, 
  User, 
  FileText, 
  Brain, 
  Bot, 
  Code2, 
  FolderKanban, 
  MessageSquareQuote,
  Mail,
  Menu,
  X
} from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/about', label: '关于', icon: User },
  { path: '/resume', label: '简历', icon: FileText },
  { path: '/knowledge', label: 'AI 知识', icon: Brain },
  { path: '/copilot', label: '协同办公', icon: Bot },
  { path: '/vibe-coding', label: 'Vibe Coding', icon: Code2 },
  { path: '/projects', label: '项目', icon: FolderKanban },
  { path: '/prompts', label: '提示词', icon: MessageSquareQuote },
  { path: '/contact', label: '联系', icon: Mail },
]

export default function Navbar() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-dark-950/90 backdrop-blur-xl border-b border-dark-800/50' 
          : 'bg-transparent'
      )}
    >
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">徐</span>
              </div>
              <span className="text-lg font-semibold text-dark-100 group-hover:text-accent-primary transition-colors">
                {profile.name}
              </span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative px-3 py-2 text-sm font-medium transition-colors"
                >
                  <motion.span
                    className={clsx(
                      'flex items-center gap-1.5',
                      isActive ? 'text-accent-primary' : 'text-dark-400 hover:text-dark-100'
                    )}
                    whileHover={{ y: -1 }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </motion.span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-accent-primary/10 border border-accent-primary/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-dark-800/50 text-dark-100 hover:bg-dark-700 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 border-t border-dark-800/50">
                {navItems.map((item, index) => {
                  const isActive = location.pathname === item.path
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={item.path}
                        className={clsx(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                          isActive 
                            ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20' 
                            : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  )
}