import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
}

export default function CodeBlock({ code, language = 'javascript', showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple syntax highlighting (basic)
  const highlightCode = (code: string): string => {
    return code
      // Keywords
      .replace(/(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|async|await|type|interface|enum)/g, '<span class="text-accent-primary">$1</span>')
      // Strings
      .replace(/(['"`])([^'"`]*)(['"`])/g, '<span class="text-accent-success">$1$2$3</span>')
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="text-dark-500">$1</span>')
      // Function names
      .replace(/(\w+)(\s*\()/g, '<span class="text-accent-secondary">$1</span>$2')
      // Numbers
      .replace(/(\d+)/g, '<span class="text-accent-warning">$1</span>')
  }

  return (
    <div className="relative">
      {/* Language badge & copy button */}
      {showCopy && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="text-xs text-dark-500 font-mono">{language}</span>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-6 h-6 rounded bg-dark-700/50 flex items-center justify-center hover:bg-dark-600/50 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-accent-success" />
            ) : (
              <Copy className="w-3 h-3 text-dark-400" />
            )}
          </motion.button>
        </div>
      )}

      {/* Code */}
      <pre className="overflow-x-auto">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
        />
      </pre>
    </div>
  )
}