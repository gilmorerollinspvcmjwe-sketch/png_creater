import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore, useUIStore } from '@/stores'
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Eye,
  Download,
  Bot,
  PanelLeft,
  PanelRight,
  Save,
  FolderOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
  FileCode,
  ChevronDown,
  Sparkles,
  ImageIcon,
  // 🔴 3: 全屏模式
  Maximize,
  Minimize,
  // 🔴 4: 多页支持
  Plus,
  X,
  FileText,
} from 'lucide-react'
import { api, frontendConfigToBackend } from '@/services/api'
import { exportToHtml, exportToJpg, exportToPng, ExportResolution } from '@/utils/export'
import { jingjingProfileDemo } from '@/demos/jingjing-profile'
import ExportModal from './ExportModal'

const Toolbar: React.FC = () => {
  const {
    undo,
    redo,
    history,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    currentPage,
    setPage,
    initPage,
    // 🔴 3: 全屏模式
    isFullscreen,
    toggleFullscreen,
    // 🔴 4: 多页支持
    pages,
    currentPageId,
    addPage,
    removePage,
    switchPage,
  } = useEditorStore()

  const {
    previewMode,
    setPreviewMode,
    previewDevice,
    setPreviewDevice,
    toggleAgentPanel,
    toggleLeftPanel,
    toggleRightPanel,
    leftPanelOpen,
    rightPanelOpen,
  } = useUIStore()

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [serverPageId, setServerPageId] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'html' | 'jpg' | 'png' | null>(null)
  const [exportResolution, setExportResolution] = useState<ExportResolution>('2x')
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  // 获取画布元素
  useEffect(() => {
    canvasRef.current = document.querySelector('.editor-canvas')
  }, [currentPage])

  // 🔴 3: 全屏模式 - 按 Escape 退出
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, toggleFullscreen])
  
  // 关闭导出菜单（点击外部）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 处理 HTML 导出
  const handleExportHtml = () => {
    if (!currentPage) return
    exportToHtml(currentPage)
    setExportMenuOpen(false)
  }

  // 处理 JPG 导出
  const handleExportJpg = async () => {
    if (!currentPage || !canvasRef.current) return
    setExporting(true)
    setExportFormat('jpg')
    try {
      await exportToJpg(canvasRef.current, currentPage.title || 'heya-page', exportResolution)
      setExportMenuOpen(false)
    } catch (e) {
      console.error('JPG export failed:', e)
    } finally {
      setExporting(false)
      setExportFormat(null)
    }
  }

  // 处理 PNG 导出
  const handleExportPng = async () => {
    if (!currentPage || !canvasRef.current) return
    setExporting(true)
    setExportFormat('png')
    try {
      await exportToPng(canvasRef.current, currentPage.title || 'heya-page', exportResolution)
      setExportMenuOpen(false)
    } catch (e) {
      console.error('PNG export failed:', e)
    } finally {
      setExporting(false)
      setExportFormat(null)
    }
  }

  const handleSave = async () => {
    if (!currentPage) return

    // Require auth token
    if (!api.getAuthToken()) {
      setSaveStatus('error')
      return
    }

    setSaving(true)
    setSaveStatus('idle')

    try {
      const backendConfig = frontendConfigToBackend(currentPage)

      if (serverPageId) {
        // Update existing page
        await api.updatePage(serverPageId, {
          title: currentPage.title,
          pageConfig: backendConfig,
          isPublic: true,
        })
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        // Create new page
        const created = await api.createPage({
          title: currentPage.title,
          pageConfig: backendConfig,
          isPublic: true,
        })
        setServerPageId(created.id)
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (err) {
      setSaveStatus('error')
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async () => {
    if (!api.getAuthToken()) {
      return
    }

    setSaving(true)
    try {
      const { pages } = await api.listPages(20)
      if (pages.length === 0) {
        setSaving(false)
        return
      }
      // Load the most recently updated page
      const latest = pages.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0]

      // Convert backend config to frontend
      const frontend = {
        id: latest.id,
        title: latest.title,
        slug: latest.slug,
        theme: (latest.theme_id as any) || 'sakura',
        canvasWidth: latest.page_config.layout?.width || 680,
        canvasHeight: 900,
        components: (latest.page_config.components || []).map((comp: any) => ({
          id: comp.id,
          type: comp.type,
          x: comp.position?.x || 0,
          y: comp.position?.y || 0,
          width: comp.position?.width || 100,
          height: comp.position?.height || 100,
          zIndex: comp.position?.zIndex || 1,
          visible: true,
          ...comp.props,
        })),
        background: {
          type: 'gradient' as const,
          value:
            'linear-gradient(135deg, rgba(242,167,179,0.05) 0%, rgba(180,167,214,0.05) 100%)',
        },
        metadata: {
          author: latest.page_config.metadata?.author,
          createdAt: latest.created_at,
          updatedAt: latest.updated_at,
        },
      } as any

      setPage(frontend)
      setServerPageId(latest.id)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      console.error('Load failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <div className="bg-white border-b border-gray-200">
      {/* 🔴 4: 多页页签栏 */}
      {pages.length > 0 && !isFullscreen && (
        <div className="flex items-center gap-1 px-4 py-1 border-b border-gray-100 overflow-x-auto">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs transition-colors ${currentPageId === page.id ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-500'}`}
              onClick={() => switchPage(page.id)}
            >
              <FileText size={12} />
              <span className="truncate max-w-[100px]">{page.title}</span>
              {/* 删除按钮（至少保留一页时隐藏） */}
              {pages.length > 1 && currentPageId === page.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removePage(page.id)
                  }}
                  className="ml-1 p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                  title="删除页面"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          {/* 新增页面按钮 */}
          <button
            onClick={() => addPage()}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-500 text-xs"
            title="新增页面"
          >
            <Plus size={12} />
            <span>新建</span>
          </button>
        </div>
      )}
      
      {/* 工具栏主行 */}
      <div className="h-12 flex items-center justify-between px-4">
      {/* 左侧 - 面板控制 */}
      <div className="flex items-center gap-2">
        {/* Demo 加载按钮 */}
        <button
          onClick={() => {
            if (currentPage?.id === jingjingProfileDemo.id) {
              initPage()
            } else {
              setPage(jingjingProfileDemo)
            }
          }}
          className="toolbar-btn flex items-center gap-1 text-pink-500 hover:text-pink-600"
          title="加载静静の部屋演示"
        >
          <Sparkles size={14} />
          <span className="text-xs">Demo</span>
        </button>
        <button
          onClick={toggleLeftPanel}
          className={`toolbar-btn ${leftPanelOpen ? 'bg-gray-50' : ''}`}
          title="组件库"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={toggleRightPanel}
          className={`toolbar-btn ${rightPanelOpen ? 'bg-gray-50' : ''}`}
          title="属性面板"
        >
          <PanelRight size={16} />
        </button>
      </div>

      {/* 中间 - 编辑工具 */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* 响应式预览切换 */}
        <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 rounded">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            title="桌面视图"
          >
            <Monitor size={14} className={previewDevice === 'desktop' ? 'text-purple-500' : 'text-gray-400'} />
          </button>
          <button
            onClick={() => setPreviewDevice('tablet')}
            className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            title="平板视图"
          >
            <Tablet size={14} className={previewDevice === 'tablet' ? 'text-purple-500' : 'text-gray-400'} />
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            title="手机视图"
          >
            <Smartphone size={14} className={previewDevice === 'mobile' ? 'text-purple-500' : 'text-gray-400'} />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="toolbar-btn"
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <span className="text-sm text-gray-500 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="toolbar-btn"
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`toolbar-btn ${showGrid ? 'bg-gray-50' : ''}`}
          title="显示网格"
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      {/* 右侧 - AI、预览、导入导出、存储 */}
      <div className="flex items-center gap-2">
        {/* 保存/加载按钮 */}
        {api.getAuthToken() && (
          <>
            <button
              onClick={handleLoad}
              disabled={saving}
              className="toolbar-btn flex items-center gap-1"
              title="从云端加载"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FolderOpen size={14} />
              )}
              <span className="text-xs">加载</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !currentPage}
              className="toolbar-btn flex items-center gap-1"
              title="保存到云端"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveStatus === 'success' ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : saveStatus === 'error' ? (
                <AlertCircle size={14} className="text-red-400" />
              ) : (
                <Save size={14} />
              )}
              <span className="text-xs">
                {saveStatus === 'success' ? '已保存' : saveStatus === 'error' ? '失败' : '保存'}
              </span>
            </button>
          </>
        )}

        <button
          onClick={toggleAgentPanel}
          className="toolbar-btn flex items-center gap-1"
          title="AI 助手"
        >
          <Bot size={16} />
          <span className="text-xs">AI</span>
        </button>

        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={`toolbar-btn ${previewMode ? 'bg-gray-50' : ''}`}
          title="预览"
        >
          <Eye size={16} />
        </button>

        {/* 🔴 3: 全屏按钮 */}
        <button
          onClick={toggleFullscreen}
          className="toolbar-btn"
          title={isFullscreen ? '退出全屏 (Escape)' : '全屏编辑'}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        
        {/* 导出按钮（带子菜单） */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={!currentPage || exporting}
            className="toolbar-btn flex items-center gap-1"
            title="导出"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span className="text-xs">导出</span>
            <ChevronDown size={12} />
          </button>
          
          {/* 导出子菜单 */}
          {exportMenuOpen && currentPage && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-48">
              {/* Phase 3: 新增导出选项 */}
              <button
                onClick={() => {
                  setExportModalOpen(true)
                  setExportMenuOpen(false)
                }}
                disabled={exporting}
                className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <ImageIcon size={14} className="text-pink-500" />
                PNG / GIF / 海报
              </button>
              
              {/* 分隔线 */}
              <div className="h-px bg-gray-100 my-1" />
              
              {/* HTML 导出 */}
              <button
                onClick={handleExportHtml}
                disabled={exporting}
                className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <FileCode size={14} className="text-blue-500" />
                导出 HTML
              </button>
              
              {/* 分隔线 */}
              <div className="h-px bg-gray-100 my-1" />
              
              {/* JPG 导出 */}
              <div className="px-3 py-1">
                <div className="text-xs text-gray-400 mb-1">JPG 图片</div>
                <div className="flex gap-1">
                  {(['1x', '2x', '3x'] as ExportResolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => {
                        setExportResolution(res)
                        handleExportJpg()
                      }}
                      disabled={exporting}
                      className={`flex-1 py-1 text-xs rounded ${exportFormat === 'jpg' && exportResolution === res ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* PNG 导出 */}
              <div className="px-3 py-1">
                <div className="text-xs text-gray-400 mb-1">PNG 图片</div>
                <div className="flex gap-1">
                  {(['1x', '2x', '3x'] as ExportResolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => {
                        setExportResolution(res)
                        handleExportPng()
                      }}
                      disabled={exporting}
                      className={`flex-1 py-1 text-xs rounded ${exportFormat === 'png' && exportResolution === res ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
    
    {/* Phase 3: 导出模态框 */}
    <ExportModal 
      isOpen={exportModalOpen}
      onClose={() => setExportModalOpen(false)}
      canvasRef={canvasRef}
    />
    </>
  )
}

export default Toolbar
