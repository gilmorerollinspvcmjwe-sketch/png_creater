import { Repeat } from 'lucide-react'
import Card from '../common/Card'
import Badge from '../common/Badge'

interface CaseStudyProps {
  caseData: {
    id: string
    title: string
    pain: string
    solution: string
    result: string
    improvement: string
    reusable: boolean
    steps: string[]
  }
}

export default function CaseStudy({ caseData }: CaseStudyProps) {
  return (
    <Card hover className="relative overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-100">
          {caseData.title}
        </h3>
        {caseData.reusable && (
          <Badge variant="success" size="sm">
            <Repeat className="w-3 h-3" />
            可复用
          </Badge>
        )}
      </div>

      {/* Pain point */}
      <div className="mb-4">
        <p className="text-xs text-dark-500 mb-1">痛点</p>
        <p className="text-sm text-dark-400">{caseData.pain}</p>
      </div>

      {/* Solution */}
      <div className="mb-4">
        <p className="text-xs text-dark-500 mb-1">解决方案</p>
        <div className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/30">
          <p className="text-sm text-dark-400">{caseData.solution}</p>
        </div>
      </div>

      {/* Result */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent-success/10">
          <p className="text-xs text-dark-500 mb-1">效果</p>
          <p className="text-sm text-accent-success font-medium">{caseData.result}</p>
        </div>
        <div className="p-2 rounded-lg bg-accent-primary/10">
          <p className="text-xs text-dark-500 mb-1">提效</p>
          <p className="text-sm text-accent-primary font-semibold">{caseData.improvement}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <p className="text-xs text-dark-500">实施步骤</p>
        {caseData.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-dark-400">
            <span className="w-5 h-5 rounded bg-dark-800/50 flex items-center justify-center text-xs text-dark-500">
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      {/* Decorative */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tl from-accent-primary/10 to-transparent rounded-tl-full" />
    </Card>
  )
}