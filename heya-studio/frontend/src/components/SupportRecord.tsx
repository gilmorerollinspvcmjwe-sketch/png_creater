import React, { useState } from 'react'
import { ThemeId } from '@/types'

interface SupportRecordItem {
  id: string
  event: string
  date: string
  location?: string
  notes?: string
  photoUrl?: string
}

interface SupportRecordProps {
  title?: string
  records: SupportRecordItem[]
  theme?: ThemeId
  width?: number
  height?: number
}

const SupportRecord: React.FC<SupportRecordProps> = ({
  title = '我的应援',
  records = [],
  theme: _theme = 'sakura',
  width = 680,
  height = 400,
}) => {
  const [hoveredRecord, setHoveredRecord] = useState<string | null>(null)
  // _theme reserved for future styling

  // 空状态
  if (records.length === 0) {
    return (
      <div 
        className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width, minHeight: height }}
      >
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>📍</span>
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <span className="text-3xl mb-2">🎪</span>
            <p className="text-sm">还没有应援记录</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
      style={{ width }}
    >
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span>📍</span>
          {title}
          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
            {records.length}
          </span>
        </h2>
      </div>
      
      {/* 时间线样式 */}
      <div className="p-4 relative">
        {/* 时间线轴 */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-200 to-purple-200" />
        
        <div className="space-y-4">
          {records.map((record, index) => (
            <div
              key={record.id}
              className="relative flex gap-4 group cursor-pointer"
              onMouseEnter={() => setHoveredRecord(record.id)}
              onMouseLeave={() => setHoveredRecord(null)}
            >
              {/* 时间线节点 */}
              <div className="relative z-10">
                <div 
                  className={`w-4 h-4 rounded-full bg-white border-2 transition-all ${
                    hoveredRecord === record.id ? 'scale-125 border-pink-400 shadow-lg' : 'border-pink-300'
                  }`}
                />
                {/* 序号 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 flex items-center justify-center text-xs text-gray-400">
                  {index + 1}
                </div>
              </div>
              
              {/* 记录卡片 */}
              <div 
                className={`flex-1 bg-gradient-to-r from-gray-50 to-white rounded-lg border transition-all ${
                  hoveredRecord === record.id ? 'border-pink-200 shadow-md' : 'border-gray-100'
                }`}
              >
                {/* 图片 */}
                {record.photoUrl && (
                  <div className="h-20 overflow-hidden rounded-t-lg">
                    <img 
                      src={record.photoUrl} 
                      alt={record.event}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* 内容 */}
                <div className={`p-3 ${record.photoUrl ? 'rounded-b-lg' : 'rounded-lg'}`}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {record.event}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {record.date}
                    </span>
                  </div>
                  
                  {record.location && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <span>📍</span>
                      {record.location}
                    </div>
                  )}
                  
                  {record.notes && (
                    <p className="text-xs text-gray-600 italic line-clamp-2">
                      {record.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SupportRecord