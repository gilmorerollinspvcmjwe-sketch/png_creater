import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const ONBOARDING_KEY = 'heya-studio-onboarding-completed'

interface OnboardingStep {
  title: string
  description: string
  icon: string
  highlight?: string // 高亮的区域 ID
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: '欢迎来到 Heya Studio！',
    description: '这是一个二次元个人主页编辑器，让我们开始创作吧！',
    icon: '✨',
  },
  {
    title: '从左侧拖入组件',
    description: '点击左侧组件库中的组件，拖拽到画布上即可添加',
    icon: '📦',
    highlight: 'left-panel',
  },
  {
    title: '使用 AI 一键生成',
    description: '点击右侧 AI 按钮，输入描述即可自动生成完整页面',
    icon: '🤖',
    highlight: 'ai-panel',
  },
  {
    title: '预览和导出',
    description: '使用顶部工具栏可以预览不同设备效果，导出为图片或代码',
    icon: '🚀',
    highlight: 'toolbar',
  },
]

const Onboarding: React.FC = () => {
  const [show, setShow] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  
  useEffect(() => {
    // 检查是否已完成引导
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setShow(true)
    }
  }, [])
  
  const handleClose = () => {
    setShow(false)
    localStorage.setItem(ONBOARDING_KEY, 'true')
  }
  
  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSkip = () => {
    handleClose()
  }
  
  if (!show) return null
  
  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleSkip} />
      
      {/* 引导卡片 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>
        
        {/* 内容 */}
        <div className="p-8 text-center">
          {/* 图标 */}
          <div className="text-6xl mb-4">{step.icon}</div>
          
          {/* 标题 */}
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {step.title}
          </h2>
          
          {/* 描述 */}
          <p className="text-gray-500 mb-6">
            {step.description}
          </p>
          
          {/* 进度指示 */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep 
                    ? 'bg-pink-400 w-4' 
                    : i < currentStep 
                      ? 'bg-pink-300' 
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {/* 按钮 */}
          <div className="flex justify-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
                上一步
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all shadow-md"
            >
              {isLastStep ? '开始创作' : '下一步'}
              {!isLastStep && <ChevronRight size={16} />}
            </button>
          </div>
          
          {/* 跳过提示 */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="mt-4 text-sm text-gray-400 hover:text-gray-500"
            >
              跳过引导
            </button>
          )}
        </div>
      </div>
      
      {/* 高亮指示（可选） */}
      {step.highlight && (
        <div className="absolute animate-pulse">
          {/* 根据 highlight ID 定位高亮框 */}
          {/* 这里可以添加更复杂的高亮逻辑 */}
        </div>
      )}
    </div>
  )
}

export default Onboarding