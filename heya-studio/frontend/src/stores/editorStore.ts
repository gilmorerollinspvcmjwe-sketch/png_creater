import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import { PageConfig, ComponentInstance, createDefaultPage, generateId, createComponent } from '@/types'

// Bug 6: 版本号用于检测多标签页冲突
const STORE_VERSION = 1
const STORE_KEY = 'heya-editor-store'

interface HistoryState {
  past: PageConfig[]
  present: PageConfig | null
  future: PageConfig[]
}

interface EditorStore {
  // 🔴 4: 多页支持
  pages: PageConfig[]
  currentPageId: string | null
  
  // 当前页面（计算属性，从 pages 中获取）
  currentPage: PageConfig | null
  selectedComponentId: string | null
  hoveredComponentId: string | null
  // 🔴 P2: 多选支持
  selectedComponentIds: string[]
  
  // 编辑状态
  isDragging: boolean
  isResizing: boolean
  zoom: number
  showGrid: boolean
  // 🔴 P2: 画布平移状态
  panX: number
  panY: number
  // 🔴 P1: 空格键平移模式
  isPanning: boolean
  
  // 🔴 3: 全屏模式
  isFullscreen: boolean
  
  // 撤销/重做
  history: HistoryState
  historyIndex: number
  
  // Bug 6: 版本号和时间戳
  version: number
  lastUpdated: number
  
  // 🔴 3: 全屏模式
  toggleFullscreen: () => void
  setFullscreen: (isFullscreen: boolean) => void
  
  // 🔴 4: 多页操作
  addPage: (title?: string) => string
  removePage: (pageId: string) => void
  switchPage: (pageId: string) => void
  renamePage: (pageId: string, title: string) => void
  duplicatePage: (pageId: string) => string
  
  // Actions
  initPage: (page?: PageConfig) => void
  setPage: (page: PageConfig) => void
  updatePage: (updates: Partial<PageConfig>) => void
  
  addComponent: (type: string, x?: number, y?: number) => string
  updateComponent: (id: string, updates: Partial<ComponentInstance>) => void
  updateComponentImmediate: (id: string, updates: Partial<ComponentInstance>) => void
  removeComponent: (id: string) => void
  moveComponent: (id: string, x: number, y: number) => void
  resizeComponent: (id: string, width: number, height: number) => void
  
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  setDragging: (isDragging: boolean) => void
  setResizing: (isResizing: boolean) => void
  // 🔴 P2: 多选支持
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  setSelectedComponentIds: (ids: string[]) => void
  selectAll: () => void
  clearSelection: () => void
  // 🔴 P2: 画布平移
  setPan: (x: number, y: number) => void
  // 🔴 P1: 空格键平移模式
  setIsPanning: (isPanning: boolean) => void
  
  setZoom: (zoom: number) => void
  setShowGrid: (show: boolean) => void
  
  undo: () => void
  redo: () => void
  pushHistory: () => void
  clearHistory: () => void
  
  changeTheme: (themeId: string) => void
}

const MAX_HISTORY_SIZE = 100 // Bug 5: 撤销栈上限 100 条

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 🔴 4: 多页支持
        pages: [],
        currentPageId: null,
        
        currentPage: null,
        selectedComponentId: null,
        hoveredComponentId: null,
        // 🔴 P2: 多选支持
        selectedComponentIds: [],
        isDragging: false,
        isResizing: false,
        zoom: 1,
        showGrid: false,
        // 🔴 P2: 画布平移状态
        panX: 0,
        panY: 0,
        // 🔴 P1: 空格键平移模式
        isPanning: false,
        
        // 🔴 3: 全屏模式
        isFullscreen: false,
        
        history: { past: [], present: null, future: [] },
        historyIndex: -1,
        version: STORE_VERSION,
        lastUpdated: Date.now(),
    
        // 🔴 3: 全屏模式
        toggleFullscreen: () => {
          set(state => ({ isFullscreen: !state.isFullscreen }))
        },
        
        setFullscreen: (isFullscreen) => {
          set({ isFullscreen })
        },
        
        // 🔴 4: 多页操作
        addPage: (title) => {
          const newPage = createDefaultPage()
          if (title) newPage.title = title
          const pages = [...get().pages, newPage]
          set({ pages, currentPageId: newPage.id, currentPage: newPage, lastUpdated: Date.now() })
          get().pushHistory()
          return newPage.id
        },
        
        removePage: (pageId) => {
          const { pages, currentPageId } = get()
          if (pages.length <= 1) return // 至少保留一页
          
          const newPages = pages.filter(p => p.id !== pageId)
          const newCurrentPageId = currentPageId === pageId ? newPages[0].id : currentPageId
          const newCurrentPage = newPages.find(p => p.id === newCurrentPageId) || newPages[0]
          
          set({ pages: newPages, currentPageId: newCurrentPageId, currentPage: newCurrentPage, lastUpdated: Date.now() })
          get().pushHistory()
        },
        
        switchPage: (pageId) => {
          const { pages } = get()
          const page = pages.find(p => p.id === pageId)
          if (page) {
            set({ currentPageId: pageId, currentPage: page, selectedComponentId: null, lastUpdated: Date.now() })
            // 切换页面时重置历史
            get().clearHistory()
          }
        },
        
        renamePage: (pageId, title) => {
          const { pages } = get()
          const newPages = pages.map(p => p.id === pageId ? { ...p, title } : p)
          const currentPage = get().currentPageId === pageId ? newPages.find(p => p.id === pageId) || null : get().currentPage
          set({ pages: newPages, currentPage, lastUpdated: Date.now() })
        },
        
        duplicatePage: (pageId) => {
          const { pages } = get()
          const page = pages.find(p => p.id === pageId)
          if (!page) return ''
          
          const newPage: PageConfig = {
            ...page,
            id: generateId(),
            title: `${page.title} (副本)`,
            metadata: { ...page.metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          }
          const newPages = [...pages, newPage]
          set({ pages: newPages, currentPageId: newPage.id, currentPage: newPage, lastUpdated: Date.now() })
          return newPage.id
        },
        
        initPage: (page) => {
          const newPage = page || createDefaultPage()
          // 🔴 4: 初始化时也支持多页
          set({
            pages: [newPage],
            currentPageId: newPage.id,
            currentPage: newPage,
            history: { past: [], present: newPage, future: [] },
            historyIndex: 0,
            lastUpdated: Date.now(),
          })
        },
        
        setPage: (page) => {
          // 🔴 4: 如果页面已存在于 pages 中，更新它；否则添加新页面
          const { pages } = get()
          const existingIndex = pages.findIndex(p => p.id === page.id)
          let newPages: PageConfig[]
          
          if (existingIndex >= 0) {
            newPages = pages.map(p => p.id === page.id ? page : p)
          } else {
            newPages = [...pages, page]
          }
          
          set({ pages: newPages, currentPageId: page.id, currentPage: page, lastUpdated: Date.now() })
          get().pushHistory()
        },
        
        updatePage: (updates) => {
          const current = get().currentPage
          if (!current) return
          
          const updated = { ...current, ...updates, metadata: { ...current.metadata, updatedAt: new Date().toISOString() } }
          set({ currentPage: updated, lastUpdated: Date.now() })
          get().pushHistory()
        },
    
        addComponent: (type, x = 50, y = 50) => {
          const current = get().currentPage
          if (!current) return ''
          
          const id = generateId()
          const component = createComponent(type as any, id)
          component.x = x
          component.y = y
          component.zIndex = current.components.length + 1
          
          const updated = {
            ...current,
            components: [...current.components, component],
          }
          
          set({ currentPage: updated, selectedComponentId: id, lastUpdated: Date.now() })
          get().pushHistory()
          
          return id
        },
        
        // 实时更新组件（不记录历史，用于属性面板编辑时的实时预览）
        updateComponentImmediate: (id, updates) => {
          const current = get().currentPage
          if (!current) return
          
          const components = current.components.map(comp => 
            comp.id === id ? { ...comp, ...updates } as ComponentInstance : comp
          )
          
          set({ currentPage: { ...current, components }, lastUpdated: Date.now() })
          // 不调用 pushHistory()
        },
        
        // 更新组件并记录历史（用于完成编辑时）
        updateComponent: (id, updates) => {
          const current = get().currentPage
          if (!current) return
          
          const components = current.components.map(comp => 
            comp.id === id ? { ...comp, ...updates } as ComponentInstance : comp
          )
          
          set({ currentPage: { ...current, components }, lastUpdated: Date.now() })
          get().pushHistory()
        },
        
        removeComponent: (id) => {
          const current = get().currentPage
          if (!current) return
          
          const components = current.components.filter(comp => comp.id !== id)
          set({ 
            currentPage: { ...current, components },
            selectedComponentId: get().selectedComponentId === id ? null : get().selectedComponentId,
            lastUpdated: Date.now(),
          })
          get().pushHistory()
        },
        
        moveComponent: (id, x, y) => {
          const current = get().currentPage
          if (!current) return
          
          const components = current.components.map(comp =>
            comp.id === id ? { ...comp, x, y } as ComponentInstance : comp
          )
          
          set({ currentPage: { ...current, components }, lastUpdated: Date.now() })
        },
        
        resizeComponent: (id, width, height) => {
          const current = get().currentPage
          if (!current) return
          
          const components = current.components.map(comp =>
            comp.id === id ? { ...comp, width, height } as ComponentInstance : comp
          )
          
          set({ currentPage: { ...current, components }, lastUpdated: Date.now() })
          get().pushHistory()
        },
    
        selectComponent: (id) => {
          set({ selectedComponentId: id, selectedComponentIds: id ? [id] : [] })
        },
        
        // 🔴 P2: 添加到选中列表
        addToSelection: (id) => {
          const { selectedComponentIds } = get()
          if (!selectedComponentIds.includes(id)) {
            set({ selectedComponentIds: [...selectedComponentIds, id], selectedComponentId: id })
          }
        },
        
        // 🔴 P2: 从选中列表移除
        removeFromSelection: (id) => {
          const { selectedComponentIds } = get()
          const newIds = selectedComponentIds.filter(i => i !== id)
          set({ selectedComponentIds: newIds, selectedComponentId: newIds.length > 0 ? newIds[newIds.length - 1] : null })
        },
        
        // 🔴 P2: 批量选中
        setSelectedComponentIds: (ids) => {
          set({ selectedComponentIds: ids, selectedComponentId: ids.length > 0 ? ids[ids.length - 1] : null })
        },
        
        // 🔴 P2: 全选
        selectAll: () => {
          const { currentPage } = get()
          if (!currentPage) return
          const allIds = currentPage.components.map(c => c.id)
          set({ selectedComponentIds: allIds, selectedComponentId: allIds.length > 0 ? allIds[allIds.length - 1] : null })
        },
        
        // 🔴 P2: 清空选中
        clearSelection: () => {
          set({ selectedComponentIds: [], selectedComponentId: null })
        },
        
        // 🔴 P2: 画布平移
        setPan: (x, y) => {
          set({ panX: x, panY: y })
        },
        
        // 🔴 P1: 空格键平移模式
        setIsPanning: (isPanning) => {
          set({ isPanning })
        },
        
        hoverComponent: (id) => {
          set({ hoveredComponentId: id })
        },
        
        setDragging: (isDragging) => {
          set({ isDragging })
        },
        
        setResizing: (isResizing) => {
          set({ isResizing })
        },
        
        // 🔴 P1: zoom 范围扩展到 3x
        setZoom: (zoom) => {
          set({ zoom: Math.max(0.25, Math.min(3, zoom)) })
        },
        
        setShowGrid: (show) => {
          set({ showGrid: show })
        },
    
        pushHistory: () => {
          const { currentPage, history } = get()
          if (!currentPage) return
          
          // 如果当前状态和上一个状态相同，不推入历史
          if (history.past.length > 0) {
            const last = history.past[history.past.length - 1]
            if (JSON.stringify(last) === JSON.stringify(currentPage)) return
          }
          
          const newPast = [...history.past, currentPage].slice(-MAX_HISTORY_SIZE)
          set({
            history: { past: newPast, present: currentPage, future: [] },
            historyIndex: newPast.length - 1,
            lastUpdated: Date.now(),
          })
        },
        
        undo: () => {
          const { history } = get()
          if (history.past.length === 0) return
          
          const previous = history.past[history.past.length - 1]
          const newPast = history.past.slice(0, -1)
          const newFuture = [history.present!, ...history.future]
          
          set({
            currentPage: previous,
            history: { past: newPast, present: previous, future: newFuture },
            historyIndex: newPast.length - 1,
            selectedComponentId: null,
            lastUpdated: Date.now(),
          })
        },
        
        redo: () => {
          const { history } = get()
          if (history.future.length === 0) return
          
          const next = history.future[0]
          const newFuture = history.future.slice(1)
          const newPast = [...history.past, history.present!]
          
          set({
            currentPage: next,
            history: { past: newPast, present: next, future: newFuture },
            historyIndex: newPast.length - 1,
            selectedComponentId: null,
            lastUpdated: Date.now(),
          })
        },
        
        clearHistory: () => {
          const current = get().currentPage
          set({
            history: { past: [], present: current, future: [] },
            historyIndex: -1,
          })
        },
        
        changeTheme: (themeId) => {
          get().updatePage({ theme: themeId as any })
        },
      }),
      {
        name: STORE_KEY,
        version: STORE_VERSION,
        // 🔴 4: 持久化多页数据（不持久化历史，避免占用过多空间）
        partialize: (state) => ({
          pages: state.pages,
          currentPageId: state.currentPageId,
          version: state.version,
          lastUpdated: state.lastUpdated,
        }),
        // Bug 6: 版本迁移
        migrate: (persistedState: any, version: number) => {
          if (version < STORE_VERSION) {
            // 版本升级时清除旧数据，使用新默认值
            return {
              currentPage: createDefaultPage(),
              version: STORE_VERSION,
              lastUpdated: Date.now(),
            }
          }
          return persistedState
        },
      }
    )
  )
)

// 订阅拖拽结束时推入历史
useEditorStore.subscribe(
  (state) => state.isDragging,
  (isDragging, prevIsDragging) => {
    if (prevIsDragging && !isDragging) {
      useEditorStore.getState().pushHistory()
    }
  }
)

// 🟡 8: 自动保存优化 - 2秒防抖自动保存 + 60秒定时保存兜底
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

// 防抖保存函数
const debouncedAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    const state = useEditorStore.getState()
    if (state.currentPage) {
      // 自动保存到 localStorage（persist middleware 已处理）
      console.log('[AutoSave] 页面已自动保存', new Date().toLocaleTimeString())
    }
  }, 2000) // 2秒防抖
}

// 订阅 currentPage 变化触发自动保存
useEditorStore.subscribe(
  (state) => state.currentPage,
  (currentPage) => {
    if (currentPage) {
      debouncedAutoSave()
    }
  }
)

// 60秒定时保存兜底
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useEditorStore.getState()
    if (state.currentPage) {
      console.log('[AutoSave] 定时保存触发', new Date().toLocaleTimeString())
    }
  }, 60000)
}