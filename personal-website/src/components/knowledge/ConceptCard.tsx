import { motion } from 'framer-motion'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import Badge from '../common/Badge'

interface Concept {
  name: string
  definition: string
  keyPoints?: string[]
  application?: string
  interviewQuestion?: string
  interviewAnswer?: string
}

export default function ConceptCard({ concept }: { concept: Concept }) {
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-accent-primary/30 transition-colors"
    >
      {/* Name */}
      <h3 className="text-lg font-semibold text-dark-100 mb-2 flex items-center gap-2">
        {concept.name}
        {concept.interviewQuestion && (
          <Badge variant="warning" size="sm" className="ml-auto">
            面试高频
          </Badge>
        )}
      </h3>

      {/* Definition */}
      <p className="text-dark-400 mb-3">
        {concept.definition}
      </p>

      {/* Key Points */}
      {concept.keyPoints && (
        <div className="mb-3">
          <p className="text-xs text-dark-500 mb-1">关键点</p>
          <ul className="space-y-1">
            {concept.keyPoints.slice(0, 3).map((point, i) => (
              <li key={i} className="text-sm text-dark-400 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-accent-primary mt-1.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Application */}
      {concept.application && (
        <div className="mb-3 p-2 rounded-lg bg-dark-900/50">
          <p className="text-xs text-dark-500 mb-1">应用场景</p>
          <p className="text-sm text-dark-400">{concept.application}</p>
        </div>
      )}

      {/* Interview Question */}
      {concept.interviewQuestion && (
        <div className="mt-4 pt-4 border-t border-dark-700/30">
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-2 text-accent-primary text-sm font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            {concept.interviewQuestion}
          </button>
          
          {showAnswer && concept.interviewAnswer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20"
            >
              <p className="text-sm text-dark-300">
                {concept.interviewAnswer}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}