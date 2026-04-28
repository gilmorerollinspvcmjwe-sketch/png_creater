/**
 * Mock Data Store - 纯内存模式，替代 Supabase
 * 用于本地开发，无需数据库
 */

// Types duplicated here to avoid frontend dependency
interface BackendPageConfig {
  version: string;
  metadata?: { title?: string; description?: string; author?: string };
  theme?: { id?: string; colors?: Record<string, string>; fonts?: Record<string, string> };
  layout?: { type?: string; width?: number; maxWidth?: number };
  components?: Array<{
    id: string;
    type: string;
    props?: Record<string, unknown>;
    style?: Record<string, unknown>;
    position?: { x: number; y: number; width: number; height: number; zIndex?: number };
  }>;
}

interface BackendTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  thumbnailUrl?: string;
  previewUrl?: string;
  templateConfig: BackendPageConfig;
  isOfficial: boolean;
  creatorId?: string;
  useCount: number;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── 内存存储 ───────────────────────────────────────────────

interface MockUser {
  id: string;
  email: string;
}

interface MockPage {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  page_config: BackendPageConfig;
  theme_id?: string;
  is_public: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface MockSession {
  id: string;
  user_id: string;
  status: string;
  messages: any[];
  current_config: any;
  tool_calls: any[];
  total_tokens: number;
  total_cost_usd: number;
  model_used: string;
  created_at: string;
}

// 单例存储
export const mockStore = {
  users: new Map<string, MockUser>(),
  pages: new Map<string, MockPage>(),
  sessions: new Map<string, MockSession>(),
  templates: [] as BackendTemplate[],
  pageCounter: 0,
  sessionCounter: 0,
};

// ─── Mock 模板数据 ────────────────────────────────────────────

export function seedMockTemplates() {
  mockStore.templates = [
    {
      id: 'tpl_sakura_001',
      name: '樱花萌系',
      description: '粉白色调，适合可爱风格',
      category: 'sakura',
      tags: ['可爱', '粉色', '樱花'],
      templateConfig: {
        version: '1.0',
        metadata: { title: '樱花主页', description: '可爱风格个人主页' },
        theme: { id: 'sakura' },
        layout: { type: 'single-column', width: 680 },
        components: [],
      },
      isOfficial: true,
      useCount: 1523,
      ratingAverage: 4.8,
      ratingCount: 89,
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    },
    {
      id: 'tpl_night_001',
      name: '暗夜哥特',
      description: '深色主题，暗黑风格',
      category: 'gothic',
      tags: ['暗黑', '哥特', '深色'],
      templateConfig: {
        version: '1.0',
        metadata: { title: '暗黑主页' },
        theme: { id: 'night' },
        layout: { type: 'single-column', width: 680 },
        components: [],
      },
      isOfficial: true,
      useCount: 876,
      ratingAverage: 4.5,
      ratingCount: 45,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-03-15T00:00:00Z',
    },
    {
      id: 'tpl_pixel_001',
      name: '复古像素',
      description: '8-bit 像素风格',
      category: 'pixel',
      tags: ['像素', '复古', '游戏'],
      templateConfig: {
        version: '1.0',
        metadata: { title: '像素主页' },
        theme: { id: 'pixel' },
        layout: { type: 'single-column', width: 680 },
        components: [],
      },
      isOfficial: true,
      useCount: 654,
      ratingAverage: 4.3,
      ratingCount: 32,
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-03-20T00:00:00Z',
    },
  ];
}

// ─── Mock 认证 ────────────────────────────────────────────────

export function mockVerifyToken(token: string): { userId: string; email: string; error: string | null } {
  // 接受任意 token，生成虚拟用户
  if (!token || token.length < 5) {
    return { userId: '', email: '', error: 'Token too short' };
  }
  
  // 用 token 前 8 位生成用户 ID
  const userId = 'user_' + token.slice(0, 8);
  
  // 检查是否已存在
  if (!mockStore.users.has(userId)) {
    mockStore.users.set(userId, { id: userId, email: `user_${token.slice(0, 8)}@mock.local` });
  }
  
  return { userId, email: `user_${token.slice(0, 8)}@mock.local`, error: null };
}

// ─── Mock 数据库操作 ─────────────────────────────────────────

export function mockGetPage(id: string): MockPage | null {
  return mockStore.pages.get(id) || null;
}

export function mockGetPageBySlug(slug: string): MockPage | null {
  for (const page of mockStore.pages.values()) {
    if (page.slug === slug) return page;
  }
  return null;
}

export function mockCreatePage(userId: string, data: {
  title: string;
  slug?: string;
  pageConfig: BackendPageConfig;
  themeId?: string;
  isPublic?: boolean;
}): MockPage {
  mockStore.pageCounter++;
  const id = `page_${mockStore.pageCounter}_${Date.now()}`;
  const slug = data.slug || `page-${mockStore.pageCounter}`;
  const now = new Date().toISOString();
  
  const page: MockPage = {
    id,
    user_id: userId,
    title: data.title,
    slug,
    page_config: data.pageConfig,
    theme_id: data.themeId,
    is_public: data.isPublic ?? true,
    is_published: true,
    view_count: 0,
    created_at: now,
    updated_at: now,
  };
  
  mockStore.pages.set(id, page);
  return page;
}

export function mockUpdatePage(id: string, userId: string, updates: Record<string, unknown>): MockPage | null {
  const page = mockStore.pages.get(id);
  if (!page || page.user_id !== userId) return null;
  
  Object.assign(page, updates, { updated_at: new Date().toISOString() });
  mockStore.pages.set(id, page);
  return page;
}

export function mockDeletePage(id: string, userId: string): boolean {
  const page = mockStore.pages.get(id);
  if (!page || page.user_id !== userId) return false;
  return mockStore.pages.delete(id);
}

export function mockGetUserPages(userId: string, limit: number): MockPage[] {
  const pages: MockPage[] = [];
  for (const page of mockStore.pages.values()) {
    if (page.user_id === userId) {
      pages.push(page);
      if (pages.length >= limit) break;
    }
  }
  return pages;
}

export function mockGetSession(id: string): MockSession | null {
  return mockStore.sessions.get(id) || null;
}

export function mockCreateSession(userId: string, sessionId?: string): MockSession {
  const id = sessionId || `session_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
  const now = new Date().toISOString();
  
  const session: MockSession = {
    id,
    user_id: userId,
    status: 'active',
    messages: [],
    current_config: {
      version: '1.0',
      metadata: { title: '我的主页' },
      theme: { id: 'sakura' },
      layout: { type: 'single-column', width: 680 },
      components: [],
    },
    tool_calls: [],
    total_tokens: 0,
    total_cost_usd: 0,
    model_used: 'deepseek',
    created_at: now,
  };
  
  mockStore.sessions.set(id, session);
  return session;
}

export function mockUpdateSession(id: string, updates: Record<string, unknown>): boolean {
  const session = mockStore.sessions.get(id);
  if (!session) return false;
  Object.assign(session, updates);
  mockStore.sessions.set(id, session);
  return true;
}

export function mockSearchTemplates(query?: string, limit?: number): BackendTemplate[] {
  let results = [...mockStore.templates];
  
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }
  
  return results.slice(0, limit || 20);
}

// 初始化种子数据
seedMockTemplates();
