import React, { useState, useEffect } from 'react'
import { THEME_COLORS, ThemeId } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroSectionProps {
  // 基本信息
  avatar?: string
  name: string
  signature?: string
  signatureTypewriter?: boolean
  
  // 属性
  mbti?: string
  bloodType?: string
  zodiac?: string
  age?: string
  customAttributes?: Array<{ label: string; value: string }>
  
  // 样式
  theme?: ThemeId
  showGlow?: boolean
  glowColor?: string
  backgroundGradient?: string
  backgroundImage?: string
  
  // 尺寸
  width?: number
  height?: number
}

// ─── MBTI Labels ───────────────────────────────────────────────────────────────

const MBTI_LABELS: Record<string, string> = {
  'INFP': '调停者',
  'INFJ': '提倡者',
  'INTP': '逻辑学家',
  'INTJ': '建筑师',
  'ISFP': '探险家',
  'ISFJ': '守卫者',
  'ISTP': '鉴赏家',
  'ISTJ': '物流师',
  'ENFP': '竞选者',
  'ENFJ': '主人公',
  'ENTP': '辩论家',
  'ENTJ': '指挥官',
  'ESFP': '表演者',
  'ESFJ': '供给者',
  'ESTP': '企业家',
  'ESTJ': '总经理',
}

const ZODIAC_EMOJIS: Record<string, string> = {
  '白羊座': '♈',
  '金牛座': '♉',
  '双子座': '♊',
  '巨蟹座': '♋',
  '狮子座': '♌',
  '处女座': '♍',
  '天秤座': '♎',
  '天蝎座': '♏',
  '射手座': '♐',
  '摩羯座': '♑',
  '水瓶座': '♒',
  '双鱼座': '♓',
}

// ─── HeroSection Component ─────────────────────────────────────────────────────

const HeroSection: React.FC<HeroSectionProps> = ({
  avatar,
  name,
  signature,
  signatureTypewriter = true,
  mbti,
  bloodType,
  zodiac,
  age,
  customAttributes = [],
  theme = 'sakura',
  showGlow = true,
  glowColor,
  backgroundGradient,
  backgroundImage,
  width = 680,
  height = 200,
}) => {
  const [displayedSignature, setDisplayedSignature] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const colors = THEME_COLORS[theme]
  const effectiveGlowColor = glowColor || colors.primary

  // 打字机效果
  useEffect(() => {
    if (!signatureTypewriter || !signature) {
      setDisplayedSignature(signature || '')
      return
    }

    setIsTyping(true)
    setDisplayedSignature('')
    let index = 0

    const timer = setInterval(() => {
      if (index < signature.length) {
        setDisplayedSignature(signature.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [signature, signatureTypewriter])

  // 构建属性列表
  const attributes = [
    ...(mbti ? [{ label: 'MBTI', value: `${mbti}·${MBTI_LABELS[mbti] || ''}` }] : []),
    ...(bloodType ? [{ label: '血型', value: `${bloodType}型` }] : []),
    ...(zodiac ? [{ label: '星座', value: `${ZODIAC_EMOJIS[zodiac] || ''}${zodiac}` }] : []),
    ...(age ? [{ label: '年龄', value: age }] : []),
    ...customAttributes,
  ]

  // 背景样式
  const bgStyle: React.CSSProperties = {
    background: backgroundImage
      ? `url(${backgroundImage}) center/cover`
      : backgroundGradient
      ? backgroundGradient
      : `linear-gradient(135deg, ${colors.secondary} 0%, rgba(255,255,255,0.8) 100%)`,
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        width,
        minHeight: height,
        ...bgStyle,
      }}
    >
      {/* 渐变蒙版 */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 100%)`,
        }}
      />

      {/* 内容区域 */}
      <div className="relative z-10 flex items-center gap-6 p-6">
        {/* 头像区域 */}
        <div className="flex-shrink-0">
          {avatar ? (
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden border-3 border-white shadow-lg"
              style={{
                animation: showGlow ? 'avatar-glow 3s ease-in-out infinite' : 'none',
                boxShadow: showGlow
                  ? `0 2px 12px rgba(0,0,0,0.15), 0 0 20px 4px ${effectiveGlowColor}40`
                  : '0 2px 12px rgba(0,0,0,0.15)',
              }}
            >
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center"
              style={{
                animation: showGlow ? 'avatar-glow 3s ease-in-out infinite' : 'none',
              }}
            >
              <span className="text-3xl text-gray-400">👤</span>
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="flex-1 min-w-0">
          {/* 用户名 */}
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: colors.text }}
          >
            {name || '用户名'}
          </h1>

          {/* 签名 */}
          <div
            className="text-sm mb-3 opacity-80"
            style={{ color: colors.text }}
          >
            <span>{displayedSignature}</span>
            {isTyping && (
              <span className="typewriter-cursor ml-1">|</span>
            )}
          </div>

          {/* 属性标签行 */}
          {attributes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: colors.primary + '20',
                    color: colors.text,
                    border: `1px solid ${colors.primary}40`,
                  }}
                >
                  {attr.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 装饰元素 */}
      <div className="absolute top-2 right-2 text-lg opacity-30">
        ✨
      </div>
    </div>
  )
}

export default HeroSection