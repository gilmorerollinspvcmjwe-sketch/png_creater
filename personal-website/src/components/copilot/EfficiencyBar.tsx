import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

interface EfficiencyItem {
  label: string
  before: string
  after: string
  improvement: number // 提效倍数
  beforePercent: number // Before 占比
  afterPercent: number // After 占比
}

const efficiencyData: EfficiencyItem[] = [
  {
    label: 'PRD 撰写',
    before: '3小时',
    after: '30分钟',
    improvement: 6,
    beforePercent: 100,
    afterPercent: 17, // 30分钟 / 3小时 = 1/6
  },
  {
    label: '代码开发',
    before: '2天',
    after: '4小时',
    improvement: 4,
    beforePercent: 100,
    afterPercent: 25, // 4小时 / 2天 = 1/8，但实际是 4倍提效
  },
  {
    label: '测试覆盖',
    before: '20%',
    after: '80%',
    improvement: 4,
    beforePercent: 20,
    afterPercent: 80,
  },
]

export default function EfficiencyBar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <div ref={ref} className="space-y-8">
      {efficiencyData.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: index * 0.15 }}
          className="glass rounded-xl p-6"
        >
          {/* 标题和时间对比 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-100">{item.label}</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-dark-500">
                Before: <span className="text-dark-400 font-medium">{item.before}</span>
              </span>
              <span className="text-accent-success">
                After: <span className="font-medium">{item.after}</span>
              </span>
            </div>
          </div>

          {/* 进度条容器 */}
          <div className="relative h-8 rounded-full overflow-hidden bg-dark-800/50">
            {/* Before 背景（灰色） */}
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: `${item.beforePercent}%` } : { width: 0 }}
              transition={{ duration: 1, delay: index * 0.15 + 0.3, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-dark-600 to-dark-500"
            />

            {/* After 进度条（渐变彩色） */}
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: `${item.afterPercent}%` } : { width: 0 }}
              transition={{ duration: 1, delay: index * 0.15 + 0.5, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-success"
            />

            {/* 提效倍数标签 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: index * 0.15 + 1.3 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-accent-success/20 border border-accent-success/30 text-accent-success text-sm font-bold"
            >
              {item.improvement}x 提效
            </motion.div>
          </div>

          {/* 说明文字 */}
          <p className="text-dark-500 text-sm mt-3">
            {item.label === 'PRD 撰写' && 'AI 生成 PRD 草稿，人工审核补充细节'}
            {item.label === '代码开发' && 'OpenClaw + Claude Code 辅助前后端开发'}
            {item.label === '测试覆盖' && 'AI 自动生成测试用例，覆盖率大幅提升'}
          </p>
        </motion.div>
      ))}
    </div>
  )
}