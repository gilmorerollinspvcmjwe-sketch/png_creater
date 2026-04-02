import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
import Badge from '../common/Badge'

interface PromptCardProps {
  template: {
    id: string
    name: string
    scenario: string
    prompt: string
    usage?: string
  }
}

export default function PromptCard({ template }: PromptCardProps) {
  const [copied, setCopied] = useState(false)
  const [showFullPrompt, setShowFullPrompt] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Truncate prompt for preview
  const truncatedPrompt = template.prompt.length > 200
    ? template.prompt.slice(0, 200) + '...'
    : template.prompt

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-accent-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-dark-100 mb-1">
            {template.name}
          </h3>
          <p className="text-dark-400 text-sm">
            {template.scenario}
          </p>
        </div>
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-dark-700/50 border border-dark-600/30 flex items-center justify-center hover:bg-accent-primary/10 hover:border-accent-primary/30 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-accent-success" />
          ) : (
            <Copy className="w-4 h-4 text-dark-400" />
          )}
        </motion.button>
      </div>

      {/* Usage */}
      {template.usage && (
        <div className="mb-3">
          <Badge variant="neutral" size="sm">
            {template.usage}
          </Badge>
        </div>
      )}

      {/* Prompt preview */}
      <div className="relative">
        <div className="p-3 rounded-lg bg-dark-900/50 border border-dark-700/30">
          <pre className="text-xs text-dark-400 whitespace-pre-wrap overflow-hidden">
            {showFullPrompt ? template.prompt : truncatedPrompt}
          </pre>
        </div>
        
        {/* Toggle expand */}
        {template.prompt.length > 200 && (
          <motion.button
            onClick={() => setShowFullPrompt(!showFullPrompt)}
            whileHover={{ scale: 1.02 }}
            className="mt-2 text-xs text-accent-primary hover:underline"
          >
            {showFullPrompt ? (
              <span className="flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                收起
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                展开
              </span>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}