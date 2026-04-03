import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gamepad2 } from 'lucide-react'
import Button from '../common/Button'

export default function ExcelFarmHighlight() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-12 relative">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* 大卡片 */}
          <div className="rounded-2xl border border-dark-700/50 bg-gradient-to-br from-dark-900/80 to-dark-950/80 shadow-xl overflow-hidden">
            {/* 内容区域 */}
            <div className="p-8 md:p-12">
              {/* 标题区域 */}
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-block mb-4"
                >
                  <span className="text-5xl">🎮</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-2xl md:text-3xl font-bold text-dark-100 mb-3"
                >
                  "正经人谁用 Excel 农场摸鱼？"
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-lg text-dark-400"
                >
                  "这是我的摸鱼神器，也是我的 AI 编程作品"
                </motion.p>
              </div>

              {/* 特性列表 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-3 mb-8"
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5 text-accent-primary" />
                  <span className="text-dark-300">极致 Excel 伪装，菜单都是 Excel 样式</span>
                </div>
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5 text-accent-secondary" />
                  <span className="text-dark-300">4 大系统：种植/畜牧/员工管理/地下城</span>
                </div>
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5 text-accent-success" />
                  <span className="text-dark-300">用 OpenClaw + Claude Code 开发，3天完成</span>
                </div>
              </motion.div>

              {/* 截图占位区域 */}
              {/* TODO: 需要提供素材 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mb-8"
              >
                <div className="bg-dark-800/30 border-2 border-dashed border-dark-600 rounded-xl p-12 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Gamepad2 className="w-6 h-6 text-dark-500" />
                    <p className="text-dark-500">效果截图预览</p>
                  </div>
                  {/* 红色注释标注 */}
                  <p className="text-red-400 text-sm font-medium">
                    📸 [需要截图素材：Excel界面但实际是农场RPG的效果截图]
                  </p>
                  <p className="text-dark-600 text-xs mt-2">
                    建议：展示游戏界面和 Excel 伪装模式的对比效果
                  </p>
                </div>
              </motion.div>

              {/* CTA 按钮 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="flex items-center gap-4"
              >
                <Link to="/projects/excel-farm">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    查看项目详情
                  </Button>
                </Link>
                <Link to="/projects/games">
                  <Button variant="secondary">
                    更多游戏作品
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-secondary/5 rounded-full blur-3xl" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}