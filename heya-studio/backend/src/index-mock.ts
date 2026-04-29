/**
 * Heya Studio Backend - Cloudflare Workers API (Mock Mode)
 *
 * 本地开发模式：
 * - 认证：接受任意 token
 * - 数据库：内存存储
 * - AI：真实调用 DeepSeek API
 *
 * Routes:
 * - POST /api/agent/chat — Agent 对话入口
 * - POST /api/agent/modify — 修改已有配置
 * - GET /api/templates — 模板列表
 * - GET /api/templates/search?q= — 模板搜索
 * - POST /api/pages — 创建页面
 * - GET /api/pages/:id — 获取页面
 * - PUT /api/pages/:id — 更新页面
 * - DELETE /api/pages/:id — 删除页面
 * - POST /api/upload — 图片上传
 */

import { Hono } from 'hono';
import type { Env, AgentChatRequest, AgentChatResponse, CreatePageRequest, UpdatePageRequest } from './types';

// Mock mode imports
import {
  mockVerifyToken,
  mockCreatePage,
  mockUpdatePage,
  mockDeletePage,
  mockGetPage,
  mockGetPageBySlug,
  mockGetUserPages,
  mockCreateSession,
  mockUpdateSession,
  mockGetSession,
  mockSearchTemplates,
  mockStore,
} from './db/mock-store';
import { processAgentChat, modifyExistingPage } from './agent/mock-agent';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// ─── Mock Auth Middleware ─────────────────────────────────────

async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Missing Authorization header' }, 401);
  }
  
  const token = authHeader.slice(7);
  const result = mockVerifyToken(token);
  
  if (result.error) {
    return c.json({ code: 'TOKEN_INVALID', message: result.error }, 401);
  }
  
  c.set('userId', result.userId);
  c.set('userEmail', result.email);
  c.set('authToken', token);
  await next();
}

async function optionalAuthMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = mockVerifyToken(token);
    if (!result.error) {
      c.set('userId', result.userId);
      c.set('userEmail', result.email);
      c.set('authToken', token);
    }
  }
  await next();
}

// ─── Global Middleware ────────────────────────────────────────

app.use('*', async (c: any, next: any) => {
  // CORS
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  
  // Logging
  const start = Date.now();
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  console.log(`[${requestId}] ${c.req.method} ${c.req.path}`);
  
  await next();
  console.log(`[${requestId}] ${c.req.method} ${c.req.path} - ${Date.now() - start}ms`);
});

// Error handler
app.onError(async (err: any, c: any) => {
  console.error('Error:', err.message);
  return c.json({
    code: 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
  }, 500);
});

// ─── Health Check ─────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    mode: 'mock',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    templates: mockStore.templates.length,
    pages: mockStore.pages.size,
    sessions: mockStore.sessions.size,
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'Heya Studio Backend (Mock Mode)',
    version: '0.1.0',
    description: 'AI-powered personal homepage builder - Local Development',
    endpoints: {
      agent: {
        'POST /api/agent/chat': 'Start or continue agent conversation (real AI)',
        'POST /api/agent/modify': 'Modify existing page configuration',
      },
      templates: {
        'GET /api/templates': 'List mock templates',
        'GET /api/templates/search': 'Search templates',
      },
      pages: {
        'POST /api/pages': 'Create a new page',
        'GET /api/pages/:id': 'Get page by ID',
        'PUT /api/pages/:id': 'Update page',
        'DELETE /api/pages/:id': 'Delete page',
        'GET /api/pages': 'List user pages',
      },
    },
    note: 'This is mock mode. Data is stored in memory and lost on restart.',
  });
});

// ─── Agent Routes ─────────────────────────────────────────────

app.post('/api/agent/chat', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  
  try {
    const body = await c.req.json<AgentChatRequest>();
    
    if (!body.message) {
      return c.json({ code: 'INVALID_REQUEST', message: 'Message is required' }, 400);
    }
    
    // Get or create session
    let sessionId = body.sessionId;
    if (!sessionId) {
      const session = mockCreateSession(userId);
      sessionId = session.id;
    } else {
      let session = mockGetSession(sessionId);
      if (!session) {
        const s = mockCreateSession(userId, sessionId);
        session = s;
      }
    }
    
    // Build context for agent
    const env = c.env as Env;
    
    // For mock mode, we need to create a minimal env for the AI proxy
    const mockEnv = {
      ...env,
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '',
      MINIMAX_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_KEY: 'mock',
      SUPABASE_ANON_KEY: 'mock',
      ENVIRONMENT: 'development',
    } as unknown as Env;
    
    // Process through real AI agent
    const response = await processAgentChat(mockEnv, {
      message: body.message,
      sessionId,
      context: body.context,
    }, userId);
    
    // Update mock session
    mockUpdateSession(sessionId, {
      current_config: response.currentConfig,
      messages: [...(mockGetSession(sessionId)?.messages || []), {
        role: 'user',
        content: body.message,
        timestamp: new Date().toISOString(),
      }],
    });
    
    return c.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent chat error:', errorMessage);
    return c.json({
      code: 'AGENT_ERROR',
      message: `AI 调用失败: ${errorMessage}`,
      details: { error: errorMessage },
    }, 500);
  }
});

// ─── Template Routes ──────────────────────────────────────────

app.get('/api/templates', optionalAuthMiddleware, async (c) => {
  const category = c.req.query('category');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  let results = mockSearchTemplates(category, limit);
  
  return c.json({
    templates: results,
    count: results.length,
  });
});

app.get('/api/templates/search', optionalAuthMiddleware, async (c) => {
  const query = c.req.query('q');
  const limit = parseInt(c.req.query('limit') || '10', 10);
  
  if (!query) {
    return c.json({ code: 'INVALID_REQUEST', message: 'Query parameter q is required' }, 400);
  }
  
  const results = mockSearchTemplates(query, limit);
  
  return c.json({
    results: results.map(t => ({ ...t, similarity: 1.0 })),
    query,
    count: results.length,
  });
});

app.get('/api/templates/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const template = mockSearchTemplates().find(t => t.id === id);
  
  if (!template) {
    return c.json({ code: 'NOT_FOUND', message: 'Template not found' }, 404);
  }
  
  return c.json(template);
});

// ─── Page Routes ──────────────────────────────────────────────

app.post('/api/pages', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  
  try {
    const body = await c.req.json<CreatePageRequest>();
    
    if (!body.pageConfig) {
      return c.json({ code: 'INVALID_REQUEST', message: 'pageConfig is required' }, 400);
    }
    
    const slug = body.slug || `page-${Date.now().toString(36)}`;
    const page = mockCreatePage(userId, {
      title: body.title || '我的主页',
      slug,
      pageConfig: body.pageConfig,
      themeId: body.themeId,
      isPublic: body.isPublic ?? true,
    });
    
    return c.json(page, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ code: 'CREATE_ERROR', message: errorMessage }, 500);
  }
});

app.get('/api/pages/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const page = mockGetPage(id);
  
  if (!page) {
    return c.json({ code: 'NOT_FOUND', message: 'Page not found' }, 404);
  }
  
  return c.json(page);
});

app.put('/api/pages/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  
  try {
    const body = await c.req.json<UpdatePageRequest>();
    const page = mockUpdatePage(id, userId, body);
    
    if (!page) {
      return c.json({ code: 'NOT_FOUND', message: 'Page not found or unauthorized' }, 404);
    }
    
    return c.json(page);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ code: 'UPDATE_ERROR', message: errorMessage }, 500);
  }
});

app.delete('/api/pages/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  
  const deleted = mockDeletePage(id, userId);
  
  if (!deleted) {
    return c.json({ code: 'NOT_FOUND', message: 'Page not found or unauthorized' }, 404);
  }
  
  return c.json({ deleted: true, id });
});

app.get('/api/pages', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  const pages = mockGetUserPages(userId, limit);
  
  return c.json({
    pages,
    count: pages.length,
  });
});

// ─── Upload Route (Mock) ──────────────────────────────────────

app.post('/api/upload', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return c.json({ code: 'INVALID_REQUEST', message: 'File is required' }, 400);
    }
    
    // Mock upload: return placeholder URL
    return c.json({
      id: crypto.randomUUID(),
      url: `https://via.placeholder.com/400x400?text=${encodeURIComponent(file.name)}`,
      storagePath: `mock/${userId}/${file.name}`,
      filename: file.name,
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ code: 'UPLOAD_ERROR', message: errorMessage }, 500);
  }
});

export default app;
