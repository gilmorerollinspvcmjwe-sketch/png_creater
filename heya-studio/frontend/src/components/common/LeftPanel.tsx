import React, { useState, useEffect, useCallback } from 'react'
import { useUIStore, useEditorStore } from '@/stores'
import { ComponentLibrary, DemoGallery } from '@/components/editor'
import { Layers, Palette, Image, Search, Loader2 } from 'lucide-react'
import {
  api,
  backendConfigToFrontend,
  BackendTemplate,
  APIClientError,
} from '@/services/api'

const LeftPanel: React.FC = () => {
  const { leftPanelOpen, activeTab, setActiveTab } = useUIStore()
  
  if (!leftPanelOpen) return null
  
  const tabs = [
    { key: 'components', name: '组件', icon: Layers },
    { key: 'templates', name: '模板', icon: Palette },
    { key: 'assets', name: '素材', icon: Image },
  ]
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 ${
              activeTab === tab.key 
                ? 'text-gray-800 border-b-2 border-purple-500' 
                : 'text-gray-400'
            }`}
          >
            <tab.icon size={14} />
            {tab.name}
          </button>
        ))}
      </div>
      
      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'components' && <ComponentLibrary />}
        
        {activeTab === 'templates' && (
          <div className="flex flex-col h-full">
            <DemoGallery />
            <div className="flex-1 overflow-hidden border-t border-gray-100">
              <TemplatesPanel />
            </div>
          </div>
        )}
        
        {activeTab === 'assets' && (
          <div className="p-3">
            <div className="text-xs text-gray-500 mb-2">装饰素材</div>
            <div className="grid grid-cols-4 gap-2">
              {['✨', '🌸', '⭐', '🌙', '💫', '🎀', '💕', '🌟'].map((emoji, i) => (
                <div
                  key={i}
                  className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                >
                  <span className="text-lg">{emoji}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              拖拽到画布使用
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Templates Panel ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  '萌系': '#F2A7B3',
  '暗黑哥特': '#2A2A3E',
  '复古像素': '#00FF41',
  '极简文字': '#888888',
  'Y2K': '#FF69B4',
  '千禧年': '#87CEEB',
  'Lolita': '#E8B4D0',
  '个人主页': '#B4A7D6',
  'Vtuber皮主页': '#86EFAC',
}

const TemplatesPanel: React.FC = () => {
  const { setPage } = useEditorStore()
  const { activeTab } = useUIStore()
  const [templates, setTemplates] = useState<BackendTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<BackendTemplate[] | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTemplates({ limit: 20 })
      setTemplates(res.templates)
    } catch (err) {
      if (err instanceof APIClientError && err.status === 401) {
        // Try without auth for public templates
        setError('登录后可使用所有模板')
      } else {
        setError('加载模板失败，请检查后端服务')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates()
    }
  }, [activeTab, loadTemplates])

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await api.searchTemplates(q)
      setSearchResults(res.results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleApplyTemplate = (template: BackendTemplate) => {
    const config = backendConfigToFrontend(
      template.templateConfig,
      undefined,
      template.name,
    )
    setPage(config)
  }

  const displayed = searchResults ?? templates

  return (
    <div className="flex flex-col h-full">
      {/* 搜索框 */}
      <div className="p-2 border-b border-gray-100">
        <div className="flex gap-1">
          <input
            type="text"
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-40"
          >
            {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          </button>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-red-400 text-center py-4">{error}</p>
        )}

        {!loading && displayed.length === 0 && !error && (
          <p className="text-xs text-gray-400 text-center py-4">
            {searchQuery ? '未找到相关模板' : '暂无可用模板'}
          </p>
        )}

        {displayed.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-purple-300 transition-colors"
            onClick={() => handleApplyTemplate(tpl)}
          >
            <div
              className="h-16 w-full flex items-center justify-center text-white text-xs font-medium"
              style={{
                background: CATEGORY_COLORS[tpl.category] || '#B4A7D6',
              }}
            >
              {tpl.thumbnailUrl ? (
                <img
                  src={tpl.thumbnailUrl}
                  alt={tpl.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : null}
              {!tpl.thumbnailUrl && <span>{tpl.name}</span>}
            </div>
            <div className="p-2">
              <div className="text-xs font-medium truncate">{tpl.name}</div>
              <div className="text-xs text-gray-400 truncate">
                {tpl.description || tpl.category}
              </div>
              {tpl.useCount > 0 && (
                <div className="text-xs text-gray-300 mt-0.5">
                  {tpl.useCount} 次使用
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="p-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          {searchResults ? '点击模板应用到画布' : '加载自后端模板库'}
        </p>
        {searchResults && (
          <button
            className="mt-1 text-xs text-purple-500 w-full text-center"
            onClick={() => {
              setSearchResults(null)
              setSearchQuery('')
            }}
          >
            清除搜索
          </button>
        )}
      </div>
    </div>
  )
}

export default LeftPanel