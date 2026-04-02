// Application constants

// Navigation items
export const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/about', label: '关于' },
  { path: '/resume', label: '简历' },
  { path: '/knowledge', label: 'AI 知识' },
  { path: '/copilot', label: '协同办公' },
  { path: '/vibe-coding', label: 'Vibe Coding' },
  { path: '/projects', label: '项目' },
  { path: '/prompts', label: '提示词' },
  { path: '/contact', label: '联系' },
]

// Social links
export const SOCIAL_LINKS = [
  { name: 'GitHub', icon: 'github', url: 'https://github.com/laoxu' },
  { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/in/laoxu' },
  { name: 'Blog', icon: 'blog', url: 'https://blog.laoxu.com' },
]

// Breakpoints (matching Tailwind config)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// Animation durations
export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  page: 0.4,
}

// Color palette
export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  tertiary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
}

// API endpoints (for future use)
export const API_ENDPOINTS = {
  formspree: 'https://formspree.io/f/your-form-id',
}

// Meta tags
export const SITE_META = {
  title: '老徐 | AI 产品经理',
  description: 'AI 语音机器人产品经理 - 用 AI 重新定义产品工作方式',
  keywords: 'AI产品经理,语音机器人,LLM,RAG,Agent,产品经理简历',
  author: '老徐',
  ogImage: '/og-image.png',
}

// External links
export const EXTERNAL_LINKS = {
  github: 'https://github.com/laoxu',
  linkedin: 'https://linkedin.com/in/laoxu',
  blog: 'https://blog.laoxu.com',
  email: 'mailto:laoxu@example.com',
}