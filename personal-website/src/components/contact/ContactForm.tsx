import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, AlertCircle, User, Mail, MessageSquare } from 'lucide-react'
import Button from '../common/Button'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  subject?: string
  message?: string
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名'
    }

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!formData.subject.trim()) {
      newErrors.subject = '请输入主题'
    }

    if (!formData.message.trim()) {
      newErrors.message = '请输入消息'
    } else if (formData.message.length < 10) {
      newErrors.message = '消息至少需要 10 个字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Simulate form submission (replace with actual Formspree endpoint)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In production, use Formspree:
      // const response = await fetch('https://formspree.io/f/your-form-id', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // })
      
      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm text-dark-400 mb-2">
          姓名
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="你的姓名"
            className={`w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border ${
              errors.name ? 'border-accent-error/50' : 'border-dark-700/50'
            } text-dark-100 placeholder:text-dark-500 focus:border-accent-primary/30 focus:ring-2 focus:ring-accent-primary/10 transition-all`}
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-xs text-accent-error">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm text-dark-400 mb-2">
          邮箱
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            className={`w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border ${
              errors.email ? 'border-accent-error/50' : 'border-dark-700/50'
            } text-dark-100 placeholder:text-dark-500 focus:border-accent-primary/30 focus:ring-2 focus:ring-accent-primary/10 transition-all`}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-accent-error">{errors.email}</p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm text-dark-400 mb-2">
          主题
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="项目合作 / 职位机会 / 其他"
          className={`w-full px-4 py-3 rounded-xl bg-dark-800/50 border ${
            errors.subject ? 'border-accent-error/50' : 'border-dark-700/50'
          } text-dark-100 placeholder:text-dark-500 focus:border-accent-primary/30 focus:ring-2 focus:ring-accent-primary/10 transition-all`}
        />
        {errors.subject && (
          <p className="mt-1 text-xs text-accent-error">{errors.subject}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm text-dark-400 mb-2">
          消息
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-dark-500" />
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="请描述你想聊的内容..."
            rows={5}
            className={`w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border ${
              errors.message ? 'border-accent-error/50' : 'border-dark-700/50'
            } text-dark-100 placeholder:text-dark-500 focus:border-accent-primary/30 focus:ring-2 focus:ring-accent-primary/10 transition-all resize-none`}
          />
        </div>
        {errors.message && (
          <p className="mt-1 text-xs text-accent-error">{errors.message}</p>
        )}
      </div>

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={!isSubmitting && <Send className="w-4 h-4" />}
          className="w-full"
        >
          {isSubmitting ? '发送中...' : '发送消息'}
        </Button>
      </motion.div>

      {/* Status messages */}
      {submitStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-accent-success/10 border border-accent-success/20"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent-success" />
            <p className="text-accent-success">消息发送成功！我会尽快回复你。</p>
          </div>
        </motion.div>
      )}

      {submitStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-accent-error/10 border border-accent-error/20"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent-error" />
            <p className="text-accent-error">发送失败，请稍后再试或直接发送邮件。</p>
          </div>
        </motion.div>
      )}
    </form>
  )
}