import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/stores'
import { api, APIClientError } from '@/services/api'
import { PageConfig } from '@/types'
import { Loader2, Sparkles, ArrowRight } from 'lucide-react'

// ─── Demo Template Types ─────────────────────────────────────────────────────

interface DemoInfo {
  id: string
  name: string
  description: string
  theme: string
  preview_colors: string[]
  component_count: number
}

// ─── Demo Card Component ─────────────────────────────────────────────────────

const DemoCard: React.FC<{
  demo: DemoInfo
  onApply: () => void
  loading: boolean
}> = ({ demo, onApply, loading }) => {
  const colors = demo.preview_colors

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={loading ? undefined : onApply}
    >
      {/* 主题色预览条 */}
      <div className="h-12 flex">
        {colors.map((color, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* 内容 */}
      <div className="p-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {demo.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {demo.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {demo.component_count} 个组件
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded capitalize"
                style={{
                  backgroundColor: (colors[0] || '#888') + '20',
                  color: colors[0] || '#888'
                }}
              >
                {demo.theme}
              </span>
            </div>
          </div>

          {loading ? (
            <Loader2 size={16} className="animate-spin text-purple-400 flex-shrink-0" />
          ) : (
            <ArrowRight
              size={16}
              className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all flex-shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Demo Gallery Component ─────────────────────────────────────────────────

const DemoGallery: React.FC = () => {
  const { initPage } = useEditorStore()
  const [demos, setDemos] = useState<DemoInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const loadDemos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getDemos()
      setDemos(res.demos)
    } catch (err) {
      if (err instanceof APIClientError) {
        setError(`加载失败: ${err.message}`)
      } else {
        setError('加载 Demo 失败，请检查后端服务')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDemos()
  }, [loadDemos])

  const handleApplyDemo = async (demo: DemoInfo) => {
    setLoadingId(demo.id)
    try {
      const res = await api.getDemo(demo.id)
      // Demo 配置已经是前端 PageConfig 格式，直接使用
      const pageConfig: PageConfig = {
        ...res.config,
        id: `page-${Date.now()}`,
      }
      initPage(pageConfig)
    } catch (err) {
      console.error('Failed to load demo:', err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-sm font-medium text-gray-800">快速开始</span>
            <span className="text-xs text-gray-400">
              {loading ? '加载中...' : `${demos.length} 个 Demo`}
            </span>
          </div>
          <span className={`text-xs text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* 内容 */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && demos.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-4">
              <p className="text-xs text-red-400 mb-2">{error}</p>
              <button
                onClick={loadDemos}
                className="text-xs text-purple-500 hover:underline"
              >
                重试
              </button>
            </div>
          )}

          {demos.map((demo) => (
            <DemoCard
              key={demo.id}
              demo={demo}
              onApply={() => handleApplyDemo(demo)}
              loading={loadingId === demo.id}
            />
          ))}

          {!loading && demos.length === 0 && !error && (
            <p className="text-xs text-gray-400 text-center py-4">
              暂无 Demo，请启动后端服务
            </p>
          )}
        </div>
      )}

      {/* 底部提示 */}
      {expanded && demos.length > 0 && (
        <div className="p-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            点击卡片即可应用 Demo 到画布
          </p>
        </div>
      )}
    </div>
  )
}

export default DemoGallery
