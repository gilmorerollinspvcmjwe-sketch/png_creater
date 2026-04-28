import React from 'react'
import { ThemeId } from '@/types'

interface MemorialEvent {
  id: string
  name: string
  date: string  // YYYY-MM-DD
  type: 'birthday' | 'anniversary' | 'debut' | 'event'
  character?: string
  sourceWork?: string
  location?: string
  isMe?: boolean
}

interface MemorialCalendarProps {
  title?: string
  events: MemorialEvent[]
  showCountdown?: boolean
  theme?: ThemeId
  width?: number
  height?: number
}

// 计算距离日期的天数
function getDaysUntil(dateStr: string): number {
  const targetDate = new Date(dateStr)
  const today = new Date()
  
  // 设置为今年或明年
  targetDate.setFullYear(today.getFullYear())
  if (targetDate < today) {
    targetDate.setFullYear(today.getFullYear() + 1)
  }
  
  const diff = targetDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

const eventTypeIcons = {
  birthday: '🎂',
  anniversary: '🎉',
  debut: '✨',
  event: '🎪',
}

const eventTypeColors = {
  birthday: 'from-pink-100 to-pink-50 border-pink-200',
  anniversary: 'from-purple-100 to-purple-50 border-purple-200',
  debut: 'from-blue-100 to-blue-50 border-blue-200',
  event: 'from-green-100 to-green-50 border-green-200',
}

const MemorialCalendar: React.FC<MemorialCalendarProps> = ({
  title = '重要纪念日',
  events = [],
  showCountdown = true,
  theme: _theme = 'sakura',
  width = 680,
  height = 300,
}) => {
  // _theme reserved for future styling

  // 按日期排序
  const sortedEvents = [...events].sort((a, b) => {
    const daysA = getDaysUntil(a.date)
    const daysB = getDaysUntil(b.date)
    return daysA - daysB
  })

  // 空状态
  if (events.length === 0) {
    return (
      <div 
        className="w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
        style={{ width, minHeight: height }}
      >
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <span>📅</span>
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <span className="text-3xl mb-2">📆</span>
            <p className="text-sm">还没有添加纪念日</p>
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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span>📅</span>
          {title}
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
            {events.length}
          </span>
        </h2>
      </div>
      <div className="p-3 space-y-2">
        {sortedEvents.map((event) => {
          const daysUntil = getDaysUntil(event.date)
          const isNear = daysUntil <= 30
          const isToday = daysUntil === 0
          
          return (
            <div
              key={event.id}
              className={`relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r border ${eventTypeColors[event.type]} ${
                isToday ? 'ring-2 ring-pink-400 ring-offset-1' : ''
              }`}
            >
              {/* 类型图标 */}
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center text-xl shadow-sm">
                {eventTypeIcons[event.type]}
              </div>
              
              {/* 事件信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm truncate">
                    {event.name}
                  </span>
                  {event.isMe && (
                    <span className="text-xs bg-pink-200 text-pink-700 px-1.5 py-0.5 rounded">
                      我
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(event.date)}</span>
                  {event.character && (
                    <span className="text-gray-400">· {event.character}</span>
                  )}
                  {event.sourceWork && (
                    <span className="text-gray-400 truncate">· {event.sourceWork}</span>
                  )}
                  {event.location && (
                    <span className="text-gray-400 truncate">· {event.location}</span>
                  )}
                </div>
              </div>
              
              {/* 倒计时 */}
              {showCountdown && (
                <div className={`text-right ${
                  isToday ? 'text-pink-500 font-bold' :
                  isNear ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {isToday ? (
                    <div className="text-lg animate-pulse">🎉 今天!</div>
                  ) : (
                    <div>
                      <div className="text-lg font-medium">{daysUntil}</div>
                      <div className="text-xs">天后</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MemorialCalendar