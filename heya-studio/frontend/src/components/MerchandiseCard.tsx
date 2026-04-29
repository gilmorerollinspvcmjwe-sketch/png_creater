import React from 'react'
import { MerchandiseCardComponentProps } from '../types'

interface MerchandiseCardProps {
  component: MerchandiseCardComponentProps
  isPreview?: boolean
  onEdit?: (id: string) => void
}

const RARITY_COLORS: Record<string, string> = {
  '普通版': 'bg-gray-100 text-gray-600',
  '限定版': 'bg-purple-100 text-purple-600',
  '展会限定': 'bg-orange-100 text-orange-600',
  '景品': 'bg-blue-100 text-blue-600',
}

const CONDITION_COLORS: Record<string, string> = {
  '全新未拆': 'text-green-600',
  '品相完美': 'text-emerald-600',
  '轻微划痕': 'text-yellow-600',
  '轻微使用': 'text-amber-600',
  '全新': 'text-green-600',
}

export const MerchandiseCard: React.FC<MerchandiseCardProps> = ({
  component,
  isPreview = false,
  onEdit,
}) => {
  const { id, name, imageUrl, sourceWork, purchaseDate, price, series, rarity, condition, notes } = component

  const handleClick = () => {
    if (!isPreview && onEdit) {
      onEdit(id)
    }
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-sm border border-gray-100 
        ${isPreview ? '' : 'cursor-pointer hover:shadow-md transition-shadow'}
        bg-gradient-to-br from-white to-gray-50`}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* 图片区域 */}
      {imageUrl ? (
        <div className="relative h-32 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {/* 来源作品标签 */}
          {sourceWork && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {sourceWork}
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-32 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
          <span className="text-4xl">🎁</span>
          {sourceWork && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {sourceWork}
            </div>
          )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-3">
        {/* 名称 */}
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
          {name}
        </h3>

        {/* 元信息 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* 稀有度 */}
          {rarity && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_COLORS[rarity] || 'bg-gray-100 text-gray-600'}`}>
              {rarity}
            </span>
          )}
          {/* 品相 */}
          {condition && (
            <span className={`text-xs ${CONDITION_COLORS[condition] || 'text-gray-500'}`}>
              · {condition}
            </span>
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {/* 购买日期 */}
          {purchaseDate && (
            <span>{purchaseDate}</span>
          )}
          {/* 价格 */}
          {price && (
            <span className="text-pink-500 font-medium">¥{price}</span>
          )}
        </div>

        {/* 系列 */}
        {series && (
          <div className="mt-1.5 text-xs text-gray-400">
            {series}
          </div>
        )}

        {/* 备注 */}
        {notes && (
          <div className="mt-2 text-xs text-gray-600 italic border-t border-gray-100 pt-2">
            "{notes}"
          </div>
        )}
      </div>

      {/* 编辑指示器 */}
      {!isPreview && (
        <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-white/80 rounded-full p-1 shadow-sm">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default MerchandiseCard