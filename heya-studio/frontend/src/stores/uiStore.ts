import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  // 面板状态
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  agentPanelOpen: boolean
  
  // 预览模式
  previewMode: boolean
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  
  // 左侧面板 Tab
  activeTab: 'components' | 'templates' | 'assets'
  
  // 语言
  language: 'zh' | 'ja' | 'en'
  
  // Actions
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleAgentPanel: () => void
  
  setPreviewMode: (mode: boolean) => void
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void
  setActiveTab: (tab: 'components' | 'templates' | 'assets') => void
  
  setLanguage: (lang: 'zh' | 'ja' | 'en') => void
  
  resetLayout: () => void
}

const DEFAULT_LAYOUT = {
  leftPanelOpen: true,
  rightPanelOpen: true,
  agentPanelOpen: false,
  previewMode: false,
  previewDevice: 'desktop' as const,
  activeTab: 'components' as const,
  language: 'zh' as const,
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...DEFAULT_LAYOUT,
      
      toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      toggleAgentPanel: () => set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),
      
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setPreviewDevice: (device) => set({ previewDevice: device }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      setLanguage: (lang) => set({ language: lang }),
      
      resetLayout: () => set(DEFAULT_LAYOUT),
    }),
    {
      name: 'heya-ui-store',
      partialize: (state) => ({
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
        language: state.language,
      }),
    }
  )
)