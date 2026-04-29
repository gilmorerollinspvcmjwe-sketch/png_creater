import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Sparkles, Heart, SkipForward, Loader2, RefreshCw, ArrowRight } from 'lucide-react'
import { ThemeId, THEME_COLORS, PageConfig } from '@/types'
import { api, backendConfigToFrontend, APIClientError, getStoredSessionId, storeSessionId } from '@/services/api'
import { useEditorStore } from '@/stores'
import MiniPreview from './MiniPreview'

// ─── Types ────────────────────────────────────────────────────────────────────

// 🟡 7: AI 组件映射白名单 - 只允许已实现的组件类型
const ALLOWED_COMPONENT_TYPES = [
  'container', 'text', 'image', 'avatar', 'tag-group', 'social-links',
  'oshi-card', 'attribute-wall', 'friends-list', 'music-player', 'quote',
  'divider', 'spacer', 'hero-section', 'media-list'
] as const

// 检查组件类型是否有效
function isValidComponentType(type: string): boolean {
  return ALLOWED_COMPONENT_TYPES.includes(type as any)
}

interface GuidedData {
  // Step 1: 风格
  theme: ThemeId | null
  // Step 2: 推し
  oshiName: string
  oshiFrom: string
  // Step 3: 属性
  mbti: string
  bloodType: string
  zodiac: string
  hobbies: string[]
  // Step 4: 社交账号
  bilibili: string
  weibo: string
  twitter: string
  pixiv: string
  github: string
}

interface GuidedWizardProps {
  onComplete: (config: any) => void
  onCancel: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MBTI_TYPES = [
  'INFP', 'INFJ', 'INTP', 'INTJ',
  'ISFP', 'ISFJ', 'ISTP', 'ISTJ',
  'ENFP', 'ENFJ', 'ENTP', 'ENTJ',
  'ESFP', 'ESFJ', 'ESTP', 'ESTJ',
]

const MBTI_LABELS: Record<string, string> = {
  'INFP': '调停者 / 梦想家',
  'INFJ': '提倡者 / 咨询师',
  'INTP': '逻辑学家 / 思考者',
  'INTJ': '建筑师 / 战略家',
  'ISFP': '探险家 / 艺术家',
  'ISFJ': '守卫者 / 保护者',
  'ISTP': '鉴赏家 / 工匠',
  'ISTJ': '物流师 / 检查员',
  'ENFP': '竞选者 / 启发者',
  'ENFJ': '主人公 / 教育家',
  'ENTP': '辩论家 / 创新者',
  'ENTJ': '指挥官 / 领导者',
  'ESFP': '表演者 / 外向者',
  'ESFJ': '供给者 / 支持者',
  'ESTP': '企业家 / 冒险家',
  'ESTJ': '总经理 / 管理者',
}

const BLOOD_TYPES = ['A', 'B', 'O', 'AB']

const ZODIAC_SIGNS = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座',
]

const HOBBY_OPTIONS = [
  { id: 'anime', label: '动画', emoji: '🎬' },
  { id: 'game', label: '游戏', emoji: '🎮' },
  { id: 'music', label: '音乐', emoji: '🎵' },
  { id: 'book', label: '书籍', emoji: '📚' },
  { id: 'food', label: '美食', emoji: '🍰' },
  { id: 'sport', label: '运动', emoji: '🏃' },
  { id: 'art', label: '绘画', emoji: '🎨' },
  { id: 'coding', label: '编程', emoji: '💻' },
]

const THEME_INFO: Record<ThemeId, { name: string; emoji: string; desc: string }> = {
  sakura: { name: '樱粉萌系', emoji: '🌸', desc: '温柔可爱，最受欢迎' },
  lavender: { name: '薰衣草紫', emoji: '💜', desc: '梦幻浪漫，治愈风格' },
  mint: { name: '薄荷清新', emoji: '🌿', desc: '清爽自然，文艺感' },
  cream: { name: '奶油暖黄', emoji: '🧸', desc: '温暖治愈，舒适感' },
  night: { name: '夜空深蓝', emoji: '🌌', desc: '神秘暗黑，高级感' },
  pixel: { name: '复古像素', emoji: '👾', desc: '赛博朋克，科技感' },
  mono: { name: '极简黑白', emoji: '🖤', desc: '简洁干练，专业感' },
  millennial: { name: '千禧粉蓝', emoji: '💖', desc: 'Y2K复古，潮流感' },
}

// ─── GuidedWizard Component ────────────────────────────────────────────────────

const GuidedWizard: React.FC<GuidedWizardProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<GuidedData>({
    theme: null,
    oshiName: '',
    oshiFrom: '',
    mbti: '',
    bloodType: '',
    zodiac: '',
    hobbies: [],
    bilibili: '',
    weibo: '',
    twitter: '',
    pixiv: '',
    github: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewConfig, setPreviewConfig] = useState<PageConfig | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [regenerateFeedback, setRegenerateFeedback] = useState('')
  const { setPage } = useEditorStore()

  const updateData = (updates: Partial<GuidedData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const toggleHobby = (hobbyId: string) => {
    setData(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(hobbyId)
        ? prev.hobbies.filter(h => h !== hobbyId)
        : [...prev.hobbies, hobbyId],
    }))
  }

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      handleGenerate()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSkip = () => {
    handleNext()
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // 构建结构化消息发送给后端 Agent
      const themeInfo = data.theme ? THEME_INFO[data.theme] : null
      const hobbiesText = data.hobbies.map(h => {
        const opt = HOBBY_OPTIONS.find(o => o.id === h)
        return opt ? `${opt.emoji}${opt.label}` : h
      }).join('、')

      const message = `请帮我生成一个二次元个人主页。我的信息如下：

【风格偏好】${themeInfo ? `${themeInfo.emoji}${themeInfo.name}` : '未指定'}
【推し角色】${data.oshiName || '未填写'}${data.oshiFrom ? `（来自《${data.oshiFrom}》）` : ''}
【性格属性】${data.mbti ? `${data.mbti}（${MBTI_LABELS[data.mbti]}）` : ''}${data.bloodType ? ` / ${data.bloodType}型血` : ''}${data.zodiac ? ` / ${data.zodiac}` : ''}
【兴趣爱好】${hobbiesText || '未填写'}
【社交账号】${data.bilibili ? `B站：${data.bilibili} ` : ''}${data.weibo ? `微博：${data.weibo} ` : ''}${data.twitter ? `Twitter：${data.twitter} ` : ''}${data.pixiv ? `Pixiv：${data.pixiv}` : ''}

请根据这些信息生成完整的 PageConfig JSON 配置。`

      const sessionId = getStoredSessionId() || undefined

      const response = await api.agentChat(message, sessionId)

      if (response.sessionId) {
        storeSessionId(response.sessionId)
      }

      // 应用生成的配置 - 先展示预览
      if (response.currentConfig && response.currentConfig.components && response.currentConfig.components.length > 0) {
        // 🟡 7: AI 组件映射白名单检查 - 过滤无效组件类型
        const filteredComponents = response.currentConfig.components.filter((comp: any) => {
          const isValid = isValidComponentType(comp.type)
          if (!isValid) {
            console.warn(`[GuidedWizard] 跳过无效组件类型: ${comp.type}，降级为 text`)
            // 降级为 text 组件
            comp.type = 'text'
            comp.content = comp.content || '组件内容'
            return true
          }
          return true
        })
        
        response.currentConfig.components = filteredComponents
        
        const frontendConfig = backendConfigToFrontend(
          response.currentConfig,
          undefined,
          'AI生成主页',
        )
        
        // 如果用户选择了主题，覆盖配置中的主题
        if (data.theme) {
          frontendConfig.theme = data.theme
        }
        
        // 显示预览，而不是直接应用
        setPreviewConfig(frontendConfig)
        setShowPreview(true)
      } else {
        setError('生成失败，请尝试重新生成或使用自由对话模式')
      }
    } catch (err) {
      if (err instanceof APIClientError) {
        if (err.status === 401) {
          setError('需要登录才能使用 AI 生成功能')
        } else {
          setError(`生成失败：${err.message}`)
        }
      } else {
        setError('网络错误，请检查后端服务是否已启动')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.theme !== null
      case 2:
        return true // 推し可以跳过
      case 3:
        return true // 属性可以跳过
      case 4:
        return true // 社交账号可以跳过
      default:
        return true
    }
  }

  // 确认并进入编辑器
  const handleConfirmPreview = () => {
    if (previewConfig) {
      setPage(previewConfig)
      onComplete(previewConfig)
    }
  }

  // 重新生成
  const handleRegenerate = async () => {
    setShowPreview(false)
    setIsGenerating(true)
    setError(null)

    try {
      const message = regenerateFeedback
        ? `请重新生成主页。用户反馈：${regenerateFeedback}`
        : '请重新生成一个不同的主页配置。'

      const sessionId = getStoredSessionId() || undefined
      const response = await api.agentChat(message, sessionId)

      if (response.sessionId) {
        storeSessionId(response.sessionId)
      }

      if (response.currentConfig && response.currentConfig.components && response.currentConfig.components.length > 0) {
        // 🟡 7: AI 组件映射白名单检查
        const filteredComponents = response.currentConfig.components.filter((comp: any) => {
          const isValid = isValidComponentType(comp.type)
          if (!isValid) {
            console.warn(`[GuidedWizard] 跳过无效组件类型: ${comp.type}`)
            comp.type = 'text'
            comp.content = comp.content || '组件内容'
            return true
          }
          return true
        })
        response.currentConfig.components = filteredComponents
        
        const frontendConfig = backendConfigToFrontend(
          response.currentConfig,
          undefined,
          'AI生成主页',
        )
        if (data.theme) {
          frontendConfig.theme = data.theme
        }
        setPreviewConfig(frontendConfig)
        setShowPreview(true)
      } else {
        setError('重新生成失败，请尝试调整描述')
      }
    } catch (err) {
      if (err instanceof APIClientError) {
        setError(`生成失败：${err.message}`)
      } else {
        setError('网络错误，请检查后端服务')
      }
    } finally {
      setIsGenerating(false)
      setRegenerateFeedback('')
    }
  }

  // 渲染预览确认界面
  if (showPreview && previewConfig) {
    return (
      <div className="fixed right-0 top-12 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col z-50">
        {/* 头部 */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <span className="text-sm font-medium">预览确认</span>
          </div>
        </div>

        {/* 预览内容 */}
        <div className="flex-1 p-3 overflow-y-auto flex flex-col items-center justify-center">
          <div className="mb-2">
            <MiniPreview config={previewConfig} />
          </div>
          <p className="text-xs text-gray-500 text-center mb-2">
            这是 AI 生成的预览效果，确认后进入编辑器调整细节
          </p>
        </div>

        {/* 重新生成反馈输入 */}
        <div className="p-3 border-t border-gray-100">
          <input
            type="text"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
            placeholder="如需调整，输入反馈意见（如：换个更粉的颜色）..."
            value={regenerateFeedback}
            onChange={(e) => setRegenerateFeedback(e.target.value)}
          />
        </div>

        {/* 操作按钮 */}
        <div className="p-3 border-t border-gray-200 flex gap-2">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 disabled:opacity-40"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {regenerateFeedback ? '重新生成' : '换一个'}
          </button>
          <button
            onClick={handleConfirmPreview}
            className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-1"
          >
            <ArrowRight size={16} />
            确认进入编辑器
          </button>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <Sparkles size={24} className="mx-auto text-purple-400 mb-2" />
              <p className="text-sm text-gray-600">选择你喜欢的主题风格</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEME_COLORS) as ThemeId[]).map((themeId) => {
                const info = THEME_INFO[themeId]
                const colors = THEME_COLORS[themeId]
                const isSelected = data.theme === themeId
                
                return (
                  <button
                    key={themeId}
                    onClick={() => updateData({ theme: themeId })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full mx-auto mb-2"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                    />
                    <div className="text-xs font-medium">{info.emoji} {info.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{info.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <Heart size={24} className="mx-auto text-pink-400 mb-2" />
              <p className="text-sm text-gray-600">你最喜欢的角色是谁？</p>
              <p className="text-xs text-gray-400">（推し / Oshi）</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">角色名</label>
                <input
                  type="text"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                  placeholder="例如：芙莉莲、后藤一里..."
                  value={data.oshiName}
                  onChange={(e) => updateData({ oshiName: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">作品名</label>
                <input
                  type="text"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                  placeholder="例如：葬送的芙莉莲、孤独摇滚..."
                  value={data.oshiFrom}
                  onChange={(e) => updateData({ oshiFrom: e.target.value })}
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-400 text-center">
              可以填写多个推し，生成后在编辑器中添加更多
            </p>
          </div>
        )

      case 3:
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <div className="text-lg mb-1">🏷️</div>
              <p className="text-sm text-gray-600">填写你的属性标签</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">MBTI</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                  value={data.mbti}
                  onChange={(e) => updateData({ mbti: e.target.value })}
                >
                  <option value="">不显示</option>
                  {MBTI_TYPES.map((mbti) => (
                    <option key={mbti} value={mbti}>
                      {mbti} - {MBTI_LABELS[mbti]}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">血型</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                  value={data.bloodType}
                  onChange={(e) => updateData({ bloodType: e.target.value })}
                >
                  <option value="">不显示</option>
                  {BLOOD_TYPES.map((type) => (
                    <option key={type} value={type}>{type}型</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">星座</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                  value={data.zodiac}
                  onChange={(e) => updateData({ zodiac: e.target.value })}
                >
                  <option value="">不显示</option>
                  {ZODIAC_SIGNS.map((sign) => (
                    <option key={sign} value={sign}>{sign}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-2 block">兴趣爱好</label>
              <div className="flex flex-wrap gap-2">
                {HOBBY_OPTIONS.map((hobby) => {
                  const isSelected = data.hobbies.includes(hobby.id)
                  return (
                    <button
                      key={hobby.id}
                      onClick={() => toggleHobby(hobby.id)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        isSelected
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {hobby.emoji} {hobby.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <div className="text-lg mb-1">🔗</div>
              <p className="text-sm text-gray-600">添加社交账号链接</p>
              <p className="text-xs text-gray-400">可选，可以跳过</p>
            </div>
            
            <div className="space-y-2">
              {[
                { key: 'bilibili', label: 'B站', icon: '📺', placeholder: 'https://space.bilibili.com/...' },
                { key: 'weibo', label: '微博', icon: '🔴', placeholder: 'https://weibo.com/...' },
                { key: 'twitter', label: 'Twitter/X', icon: '🐦', placeholder: 'https://twitter.com/...' },
                { key: 'pixiv', label: 'Pixiv', icon: '🎨', placeholder: 'https://www.pixiv.net/users/...' },
                { key: 'github', label: 'GitHub', icon: '🐙', placeholder: 'https://github.com/...' },
              ].map((social) => (
                <div key={social.key}>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {social.icon} {social.label}
                  </label>
                  <input
                    type="text"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-300 focus:outline-none"
                    placeholder={social.placeholder}
                    value={data[social.key as keyof GuidedData] as string}
                    onChange={(e) => updateData({ [social.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed right-0 top-12 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col z-50">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          <span className="text-sm font-medium">引导模式</span>
        </div>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">
          切换到自由对话
        </button>
      </div>

      {/* 进度指示器 */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                s === step
                  ? 'bg-purple-500 text-white'
                  : s < step
                  ? 'bg-purple-100 text-purple-500'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <Check size={14} /> : s}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 text-center">
          步骤 {step}/4：{
            step === 1 ? '选择风格' :
            step === 2 ? '填写推し' :
            step === 3 ? '填写属性' :
            '添加社交链接'
          }
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderStep()}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="p-3 border-t border-gray-200 flex gap-2">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <ChevronLeft size={16} />
            上一步
          </button>
        )}
        
        {step < 4 && (
          <button
            onClick={handleSkip}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <SkipForward size={14} className="inline mr-1" />
            跳过
          </button>
        )}
        
        <button
          onClick={handleNext}
          disabled={!canProceed() || isGenerating}
          className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              正在生成...
            </>
          ) : step === 4 ? (
            <>
              <Sparkles size={16} />
              生成主页
            </>
          ) : (
            <>
              下一步
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default GuidedWizard