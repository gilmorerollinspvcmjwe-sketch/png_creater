/**
 * Heya Studio API Service
 * Encapsulates all backend API calls with error handling, loading states, and retries.
 *
 * Auth: Supabase JWT stored in localStorage under key "heya_auth_token".
 * Pass token before calling auth-required endpoints:
 *   api.setAuthToken("eyJ...")
 */

import type { PageConfig } from '@/types'

// ─── Demo Template Response Types ───────────────────────────────────────────

export interface DemoTemplateInfo {
  id: string
  name: string
  description: string
  theme: string
  preview_colors: string[]
  component_count: number
}

export interface DemoTemplateDetail extends DemoTemplateInfo {
  config: PageConfig
}

export interface DemoListResponse {
  demos: DemoTemplateInfo[]
  total: number
}

// ─── Backend Response Types ─────────────────────────────────────────────────

export interface BackendPageConfig {
  version: string
  metadata?: { title?: string; description?: string; author?: string }
  theme?: { id?: string; colors?: Record<string, string>; fonts?: Record<string, string> }
  layout?: { type?: string; width?: number; maxWidth?: number }
  components?: BackendComponentConfig[]
}

export interface BackendComponentConfig {
  id: string
  type: string
  props?: Record<string, unknown>
  style?: Record<string, unknown>
  children?: BackendComponentConfig[]
  position?: { x: number; y: number; width: number; height: number; zIndex?: number }
}

export interface AgentChatRequest {
  message: string
  sessionId?: string
  context?: {
    pageId?: string
    existingConfig?: BackendPageConfig
  }
}

export interface WorkflowStep {
  type: 'status' | 'thinking' | 'tool_call' | 'tool_result' | 'profile_update' | 'skill_match' | 'generating' | 'validation' | 'done' | 'error' | 'ask_user' | 'suggestion' | 'planning' | 'building' | 'validating' | 'repairing' | 'human_review'
  message: string
  data?: Record<string, unknown>
  timestamp: number
}

// ─── Feedback Types ────────────────────────────────────────────────────────

export interface FeedbackRequest {
  session_id: string
  feedback_text: string
  feedback_type?: string  // 'correction' | 'preference' | 'dislike'
  user_input?: string
  component_type?: string | null
}

export interface FeedbackResponse {
  id: string
  session_id: string
  user_input: string
  feedback_text: string
  feedback_type: string
  component_type: string | null
  created_at: string
}

export interface FeedbackListResponse {
  feedbacks: FeedbackResponse[]
  total: number
}

// ─── Interrupt Types ───────────────────────────────────────────────────────

export interface InterruptData {
  id: string
  session_id: string
  stage: 'preview' | 'confirm' | 'modify'
  data: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  created_at?: string
}

export interface InterruptResponse {
  has_pending: boolean
  interrupt: InterruptData | null
}

export interface InterruptConfirmResponse {
  interrupt_id: string
  status: string
  response?: string
  current_config?: BackendPageConfig
}

export interface InterruptHistoryResponse {
  history: InterruptData[]
  total: number
}

export interface AgentChatResponse {
  sessionId: string
  response: string
  action?: {
    type: 'generate' | 'modify' | 'preview' | 'save' | 'ask'
    data: Record<string, unknown>
  }
  currentConfig: BackendPageConfig
  suggestions?: Array<{
    type: 'template' | 'component' | 'style' | 'color'
    id?: string
    name: string
    description?: string
  }>
  requiresConfirmation?: boolean
  state?: string
  workflow?: WorkflowStep[]
}

export interface BackendTemplate {
  id: string
  name: string
  description?: string
  category: string
  tags?: string[]
  thumbnailUrl?: string
  previewUrl?: string
  templateConfig: BackendPageConfig
  isOfficial: boolean
  creatorId?: string
  useCount: number
  ratingAverage?: number
  ratingCount?: number
  createdAt: string
  updatedAt: string
}

export interface TemplateListResponse {
  templates: BackendTemplate[]
  count: number
}

export interface TemplateSearchResponse {
  results: Array<BackendTemplate & { similarity: number }>
  query: string
  count: number
}

export interface PageResponse {
  id: string
  user_id: string
  title: string
  slug: string
  page_config: BackendPageConfig
  theme_id?: string
  is_public: boolean
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface CreatePageRequest {
  title: string
  slug?: string
  pageConfig: BackendPageConfig
  themeId?: string
  isPublic?: boolean
}

export interface UpdatePageRequest {
  title?: string
  pageConfig?: BackendPageConfig
  themeId?: string
  isPublic?: boolean
  isPublished?: boolean
}

export interface UploadResponse {
  id: string
  url: string
  storagePath: string
  filename: string
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ─── Converter: Backend PageConfig → Frontend PageConfig ────────────────────

import { generateId, THEME_COLORS } from '@/types'
import type { ThemeId, ComponentInstance } from '@/types'

const VALID_THEMES = Object.keys(THEME_COLORS) as ThemeId[]

function resolveThemeId(themeId?: string): ThemeId {
  if (themeId && VALID_THEMES.includes(themeId as ThemeId)) {
    return themeId as ThemeId
  }
  // Try to guess from name
  const lower = (themeId || '').toLowerCase()
  if (lower.includes('sakura') || lower.includes('pink') || lower.includes('萌')) return 'sakura'
  if (lower.includes('night') || lower.includes('dark') || lower.includes('gothic')) return 'night'
  if (lower.includes('pixel') || lower.includes('retro')) return 'pixel'
  if (lower.includes('lavender') || lower.includes('purple')) return 'lavender'
  if (lower.includes('mint') || lower.includes('green')) return 'mint'
  return 'sakura'
}

function convertBackendComponent(bc: BackendComponentConfig): ComponentInstance | null {
  if (!bc.position) return null

  const base = {
    id: bc.id || generateId(),
    x: bc.position.x,
    y: bc.position.y,
    width: bc.position.width,
    height: bc.position.height,
    zIndex: bc.position.zIndex || 1,
    visible: true,
  }

  const props = bc.props || {}

  switch (bc.type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: String(props.content || props.text || '文本'),
        fontSize: Number(props.fontSize || 14),
        textAlign: (props.textAlign as 'left' | 'center' | 'right') || 'left',
        color: String(props.color || ''),
      }
    case 'image':
      return {
        ...base,
        type: 'image',
        src: String(props.src || ''),
        alt: String(props.alt || ''),
        objectFit: (props.objectFit as 'cover' | 'contain' | 'fill') || 'cover',
      }
    case 'avatar':
      return {
        ...base,
        type: 'avatar',
        src: String(props.src || ''),
        showGlow: Boolean(props.showGlow ?? true),
        glowColor: String(props.glowColor || ''),
      }
    case 'tag-group':
      return {
        ...base,
        type: 'tag-group',
        tags: Array.isArray(props.tags) ? props.tags as string[] : [],
        variant: (props.variant as 'default' | 'outlined' | 'filled') || 'default',
      }
    case 'social-links':
      return {
        ...base,
        type: 'social-links',
        links: Array.isArray(props.links) ? props.links as any : [],
      }
    case 'oshi-card':
      return {
        ...base,
        type: 'oshi-card',
        characters: Array.isArray(props.characters) ? props.characters as any : [],
        variant: (props.variant as 'grid' | 'list' | 'carousel') || 'grid',
      }
    case 'attribute-wall':
      return {
        ...base,
        type: 'attribute-wall',
        attributes: Array.isArray(props.attributes) ? props.attributes as any : [],
      }
    case 'friends-list':
      return {
        ...base,
        type: 'friends-list',
        friends: Array.isArray(props.friends) ? props.friends as any : [],
      }
    case 'music-player':
      return {
        ...base,
        type: 'music-player',
        song: (props.song as any) || { name: '', artist: '' },
      }
    case 'quote':
      return {
        ...base,
        type: 'quote',
        text: String(props.text || ''),
        typewriterEffect: Boolean(props.typewriterEffect ?? true),
      }
    case 'divider':
      return {
        ...base,
        type: 'divider',
        variant: (props.variant as any) || 'dots',
      }
    case 'spacer':
      return {
        ...base,
        type: 'spacer',
        height: Number(props.height || base.height),
      }
    case 'container':
    default:
      return {
        ...base,
        type: 'container',
        background: String(props.background || '#FFFFFF'),
        borderRadius: Number(props.borderRadius || 0),
      }
  }
}

export function backendConfigToFrontend(
  backendConfig: BackendPageConfig,
  existingFrontendId?: string,
  existingTitle?: string,
): PageConfig {
  const components: ComponentInstance[] = (backendConfig.components || [])
    .map(convertBackendComponent)
    .filter((c): c is ComponentInstance => c !== null)

  return {
    id: existingFrontendId || generateId(),
    title: existingTitle || backendConfig.metadata?.title || '我的主页',
    theme: resolveThemeId(backendConfig.theme?.id),
    canvasWidth: backendConfig.layout?.width || 680,
    canvasHeight: 900,
    components,
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, rgba(242,167,179,0.05) 0%, rgba(180,167,214,0.05) 100%)',
    },
    metadata: {
      author: backendConfig.metadata?.author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: backendConfig.metadata?.description,
    },
  }
}

export function frontendConfigToBackend(frontendConfig: PageConfig): BackendPageConfig {
  return {
    version: '1.0',
    metadata: {
      title: frontendConfig.title,
      description: frontendConfig.metadata?.description,
      author: frontendConfig.metadata?.author,
    },
    theme: {
      id: frontendConfig.theme,
      colors: THEME_COLORS[frontendConfig.theme] as unknown as Record<string, string>,
    },
    layout: {
      type: 'single-column',
      width: frontendConfig.canvasWidth || 680,
    },
    components: frontendConfig.components.map((comp) => ({
      id: comp.id,
      type: comp.type,
      position: {
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        zIndex: comp.zIndex,
      },
      props: { ...comp } as Record<string, unknown>,
    })),
  }
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const AUTH_TOKEN_KEY = 'heya_auth_token'
const SESSION_ID_KEY = 'heya_agent_session_id'

class APIClient {
  private authToken: string | null = null

  constructor() {
    // Restore from localStorage on init
    this.authToken = localStorage.getItem(AUTH_TOKEN_KEY)
  }

  setAuthToken(token: string | null) {
    this.authToken = token
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  private getHeaders(includeAuth = false): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (includeAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    requiresAuth = false,
    retries = 2,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`
    const headers = {
      ...this.getHeaders(requiresAuth),
      ...(options.headers || {}),
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers })

        if (!res.ok) {
          // Try to parse backend error
          let errBody: APIError = { code: 'HTTP_ERROR', message: `HTTP ${res.status}` }
          try {
            errBody = await res.json()
          } catch {
            // ignore parse error
          }

          // Don't retry 4xx errors
          if (res.status >= 400 && res.status < 500) {
            throw new APIClientError(errBody.code, errBody.message, res.status, errBody.details)
          }

          // 5xx: retry
          lastError = new APIClientError(errBody.code, errBody.message, res.status, errBody.details)
          if (attempt < retries) {
            await sleep(300 * (attempt + 1))
            continue
          }
          throw lastError
        }

        return (await res.json()) as T
      } catch (err) {
        if (err instanceof APIClientError) throw err
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < retries) {
          await sleep(300 * (attempt + 1))
          continue
        }
        throw lastError
      }
    }

    throw lastError || new Error('Unknown error')
  }

  // ─── Agent ───────────────────────────────────────────────────────────────

  async agentChat(
    message: string,
    sessionId?: string,
    context?: AgentChatRequest['context'],
  ): Promise<AgentChatResponse> {
    const body: AgentChatRequest = { message, sessionId, context }
    return this.request<AgentChatResponse>('/agent/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }, true)
  }

  async agentModify(pageId: string, message: string): Promise<AgentChatResponse> {
    return this.request<AgentChatResponse>('/agent/modify', {
      method: 'POST',
      body: JSON.stringify({ pageId, message }),
    }, true)
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  async getTemplates(params?: {
    category?: string
    limit?: number
    official?: boolean
  }): Promise<TemplateListResponse> {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.official) qs.set('official', 'true')
    const query = qs.toString() ? `?${qs}` : ''
    return this.request<TemplateListResponse>(`/templates${query}`)
  }

  async searchTemplates(q: string, limit = 10): Promise<TemplateSearchResponse> {
    const qs = new URLSearchParams({ q, limit: String(limit) })
    return this.request<TemplateSearchResponse>(`/templates/search?${qs}`)
  }

  async getTemplate(id: string): Promise<BackendTemplate> {
    return this.request<BackendTemplate>(`/templates/${id}`)
  }

  // ─── Demo Templates ──────────────────────────────────────────────────────

  async getDemos(): Promise<DemoListResponse> {
    return this.request<DemoListResponse>('/templates/demos')
  }

  async getDemo(id: string): Promise<DemoTemplateDetail> {
    return this.request<DemoTemplateDetail>(`/templates/demos/${id}`)
  }

  // ─── Pages ───────────────────────────────────────────────────────────────

  async createPage(data: CreatePageRequest): Promise<PageResponse> {
    return this.request<PageResponse>('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)
  }

  async getPage(id: string): Promise<PageResponse> {
    return this.request<PageResponse>(`/pages/${id}`, {}, true)
  }

  async updatePage(id: string, data: UpdatePageRequest): Promise<PageResponse> {
    return this.request<PageResponse>(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true)
  }

  async deletePage(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/pages/${id}`, { method: 'DELETE' }, true)
  }

  async listPages(limit = 20): Promise<{ pages: PageResponse[]; count: number }> {
    return this.request(`/pages?limit=${limit}`, {}, true)
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────

  async submitFeedback(params: FeedbackRequest): Promise<FeedbackResponse> {
    return this.request<FeedbackResponse>('/feedback', {
      method: 'POST',
      body: JSON.stringify(params),
    }, true)
  }

  async getSessionFeedback(sessionId: string): Promise<FeedbackListResponse> {
    return this.request<FeedbackListResponse>(`/feedback/${sessionId}`, {}, true)
  }

  async clearSessionFeedback(sessionId: string): Promise<{ cleared: boolean; session_id: string }> {
    return this.request(`/feedback/${sessionId}`, { method: 'DELETE' }, true)
  }

  // ─── Interrupt ─────────────────────────────────────────────────────────────

  async getPendingInterrupt(sessionId: string): Promise<InterruptResponse> {
    return this.request<InterruptResponse>(`/interrupt/${sessionId}`, {}, true)
  }

  async confirmInterrupt(
    sessionId: string,
    action: 'approve' | 'reject',
    modifications?: Record<string, unknown> | null,
    reason?: string,
  ): Promise<InterruptConfirmResponse> {
    return this.request<InterruptConfirmResponse>(`/interrupt/${sessionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ action, modifications: modifications ?? null, reason }),
    }, true)
  }

  async getInterruptHistory(sessionId: string): Promise<InterruptHistoryResponse> {
    return this.request<InterruptHistoryResponse>(`/interrupt/history/${sessionId}`, {}, true)
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadFile(
    file: File,
    type = 'other',
    tags?: string[],
  ): Promise<UploadResponse> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    if (tags?.length) fd.append('tags', tags.join(','))

    const url = `${BASE_URL}/upload`
    const headers: Record<string, string> = {}
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`

    const res = await fetch(url, { method: 'POST', headers, body: fd })
    if (!res.ok) {
      let errBody: APIError = { code: 'UPLOAD_ERROR', message: `HTTP ${res.status}` }
      try { errBody = await res.json() } catch { /* ignore */ }
      throw new APIClientError(errBody.code, errBody.message, res.status)
    }
    return res.json() as Promise<UploadResponse>
  }
}

// ─── Error Class ─────────────────────────────────────────────────────────────

export class APIClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'APIClientError'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const api = new APIClient()

// ─── Session ID helpers ──────────────────────────────────────────────────────

export function getStoredSessionId(): string | null {
  return sessionStorage.getItem(SESSION_ID_KEY)
}

export function storeSessionId(id: string) {
  sessionStorage.setItem(SESSION_ID_KEY, id)
}

export function clearSessionId() {
  sessionStorage.removeItem(SESSION_ID_KEY)
}
