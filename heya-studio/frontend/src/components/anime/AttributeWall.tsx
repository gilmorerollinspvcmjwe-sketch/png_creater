import React from 'react'
import { UserAttribute, THEME_COLORS } from '@/types'

interface AttributeWallProps {
  attributes: UserAttribute[]
  theme?: keyof typeof THEME_COLORS
}

// 星座图标映射
const ZODIAC_ICONS: Record<string, string> = {
  '白羊座': '♈', '金牛座': '♉', '双子座': '♊', '巨蟹座': '♋',
  '狮子座': '♌', '处女座': '♍', '天秤座': '♎', '天蝎座': '♏',
  '射手座': '♐', '摩羯座': '♑', '水瓶座': '♒', '双鱼座': '♓',
}

// MBTI 中文映射
const MBTI_NAMES: Record<string, string> = {
  'INTJ': '建筑师', 'INTP': '逻辑学家', 'ENTJ': '指挥官', 'ENTP': '辩论家',
  'INFJ': '提倡者', 'INFP': '调停者', 'ENFJ': '主人公', 'ENFP': '竞选者',
  'ISTJ': '检查员', 'ISFJ': '守卫者', 'ESTJ': '总经理', 'ESFJ': '执政官',
  'ISTP': '鉴赏家', 'ISFP': '探险家', 'ESTP': '企业家', 'ESFP': '表演者',
}

const AttributeWall: React.FC<AttributeWallProps> = ({
  attributes,
  theme = 'sakura',
}) => {
  const colors = THEME_COLORS[theme]
  
  const formatAttribute = (attr: UserAttribute) => {
    if (attr.type === 'zodiac') {
      return {
        icon: ZODIAC_ICONS[attr.value] || '',
        display: attr.value,
      }
    }
    if (attr.type === 'mbti') {
      return {
        icon: '',
        display: `${attr.value} / ${MBTI_NAMES[attr.value] || ''}`,
      }
    }
    return {
      icon: attr.icon || '',
      display: attr.value,
    }
  }
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {attributes.map((attr, i) => {
        const formatted = formatAttribute(attr)
        return (
          <div key={i} className="attribute-item">
            <span className="attribute-label">{formatted.icon} {attr.label}</span>
            <span className="attribute-value" style={{ color: colors.text }}>
              {formatted.display}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default AttributeWall