import React from 'react'
import { WatchlistComponentProps, WatchlistItem, WatchStatus } from '../types'

interface WatchlistCardProps {
  component: WatchlistComponentProps
  isPreview?: boolean
  onEdit?: (id: string) => void
}

const STATUS_CONFIG: Record<WatchStatus, { label: string; color: string; bg: string; icon: string }> = {
  watching: {
    label: '在看',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: '👀',
  },
  completed: {
    label: '看完',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: '✅',
  },
  dropped: {
    label: '弃坑',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: '❌',
  },
  on_hold: {
    label: '暂停',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    icon: '⏸️',
  },
  plan_to_watch: {
    label: '想看',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: '💭',
  },
}

const SCORE_COLORS: Record<number, string> = {
  10: 'text-green-500',
  9: 'text-emerald-500',
  8: 'text-blue-500',
  7: 'text-cyan-500',
  6: 'text-yellow-500',
  5: 'text-orange-500',
}

const getScoreColor = (score?: number) => {
  if (!score) return 'text-gray-400'
  return SCORE_COLORS[Math.min(score, 10)] || 'text-gray-400'
}

export const WatchlistCard: React.FC<WatchlistCardProps> = ({
  component,
  isPreview = false,
  onEdit,
}) => {
  const { id, items, title = '我的追番', showScore = true, groupByStatus = true } = component

  const handleClick = () => {
    if (!isPreview && onEdit) {
      onEdit(id)
    }
  }

  // 按状态分组
  const groupedItems = groupByStatus
    ? items.reduce((acc: Record<WatchStatus, WatchlistItem[]>, item) => {
        const status = item.status
        if (!acc[status]) acc[status] = []
        acc[status].push(item)
        return acc
      }, {} as Record<WatchStatus, WatchlistItem[]>)
    : { watching: items } as Record<WatchStatus, WatchlistItem[]>

  const statusOrder: WatchStatus[] = ['watching', 'completed', 'on_hold', 'plan_to_watch', 'dropped']

  return (
    <div
      className={`rounded-xl overflow-hidden border border-gray-100 shadow-sm
        ${isPreview ? 'bg-gradient-to-br from-white to-gray-50' : 'bg-white cursor-pointer hover:shadow-md transition-shadow'}
        p-4`}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-900 flex items-center gap-2">
          <span className="text-lg">📺</span>
          {title}
        </h2>
        <span className="text-xs text-gray-500">
          共 {items.length} 部
        </span>
      </div>

      {/* 番剧列表 */}
      <div className="space-y-3 overflow-y-auto max-h-52">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl mb-2">🎬</span>
            <p className="text-sm">还没有追番记录</p>
            <p className="text-xs mt-1">导入 Bangumi 数据试试吧~</p>
          </div>
        ) : (
          groupByStatus ? (
            // 分组显示
            statusOrder.map((status) => {
              const group = groupedItems[status]
              if (!group || group.length === 0) return null
              const config = STATUS_CONFIG[status]

              return (
                <div key={status} className="space-y-1">
                  {/* 状态标题 */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <span className="opacity-60">({group.length})</span>
                  </div>

                  {/* 状态分组内的番剧 */}
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {group.map((item) => (
                      <WatchlistItemCard key={item.title} item={item} showScore={showScore} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            // 不分组显示
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <WatchlistItemCard key={item.title} item={item} showScore={showScore} showStatus />
              ))}
            </div>
          )
        )}
      </div>

      {/* 统计 */}
      {items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>在看 {groupedItems['watching']?.length || 0} 部</span>
          <span>看完 {groupedItems['completed']?.length || 0} 部</span>
        </div>
      )}
    </div>
  )
}

const WatchlistItemCard: React.FC<{
  item: WatchlistItem
  showScore?: boolean
  showStatus?: boolean
}> = ({ item, showScore = true, showStatus = false }) => {
  const { title, titleCn, status, score, imageUrl, watchedEpisodes, episodes } = item
  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
      {/* 封面图 */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-10 h-14 rounded object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="w-10 h-14 rounded bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg">
          📀
        </div>
      )}

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {titleCn || title}
        </div>
        {titleCn && title !== titleCn && (
          <div className="text-xs text-gray-400 truncate">
            {title}
          </div>
        )}

        {/* 进度 */}
        {watchedEpisodes && episodes && (
          <div className="text-xs text-gray-500 mt-0.5">
            {watchedEpisodes}/{episodes}
          </div>
        )}
      </div>

      {/* 评分 */}
      {showScore && score && (
        <div className={`text-sm font-medium ${getScoreColor(score)}`}>
          {score}
        </div>
      )}

      {/* 状态标签 */}
      {showStatus && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
          {config.icon}
        </span>
      )}
    </div>
  )
}

export default WatchlistCard