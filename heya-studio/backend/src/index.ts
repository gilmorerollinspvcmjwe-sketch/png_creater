/**
 * Heya Studio Backend - Cloudflare Workers API
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
import {
  authMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  corsMiddleware,
  loggingMiddleware,
  errorHandlerMiddleware,
} from './middleware/auth';
import { getSupabaseClient, getSupabaseClientWithAuth, dbHelpers } from './db/supabase';
import { processAgentChat, modifyExistingPage } from './agent/react-agent';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply global middleware
app.use('*', errorHandlerMiddleware);
app.use('*', corsMiddleware());
app.use('*', loggingMiddleware);

// ==================== Health Check ====================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'Heya Studio Backend',
    version: '0.1.0',
    description: 'AI-powered personal homepage builder API',
    endpoints: {
      agent: {
        'POST /api/agent/chat': 'Start or continue agent conversation',
        'POST /api/agent/modify': 'Modify existing page configuration',
      },
      templates: {
        'GET /api/templates': 'List all templates',
        'GET /api/templates/search': 'Search templates by query',
        'GET /api/templates/:id': 'Get template details',
      },
      pages: {
        'POST /api/pages': 'Create a new page',
        'GET /api/pages/:id': 'Get page by ID',
        'GET /api/pages/slug/:slug': 'Get page by slug',
        'PUT /api/pages/:id': 'Update page',
        'DELETE /api/pages/:id': 'Delete page',
        'GET /api/pages': 'List user pages',
      },
      upload: {
        'POST /api/upload': 'Upload file to storage',
      },
    },
  });
});

// ==================== Agent Routes ====================

// Agent chat - requires auth
app.post('/api/agent/chat', authMiddleware, rateLimitMiddleware({ maxRequests: 20, windowMs: 60000 }), async (c) => {
  const userId = c.get('userId') as string;

  try {
    const body = await c.req.json<AgentChatRequest>();

    if (!body.message) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'Message is required',
      }, 400);
    }

    const response = await processAgentChat(c.env, body, userId);

    return c.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent chat error:', errorMessage);

    return c.json({
      code: 'AGENT_ERROR',
      message: 'Failed to process message',
      details: { error: errorMessage },
    }, 500);
  }
});

// Agent modify - requires auth and page ID
app.post('/api/agent/modify', authMiddleware, rateLimitMiddleware({ maxRequests: 20, windowMs: 60000 }), async (c) => {
  const userId = c.get('userId') as string;

  try {
    const body = await c.req.json<{
      pageId: string;
      message: string;
    }>();

    if (!body.pageId || !body.message) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'pageId and message are required',
      }, 400);
    }

    const response = await modifyExistingPage(c.env, userId, body.pageId, body.message);

    return c.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent modify error:', errorMessage);

    return c.json({
      code: 'AGENT_ERROR',
      message: 'Failed to modify page',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Template Routes ====================

// Get templates list (public)
app.get('/api/templates', optionalAuthMiddleware, async (c) => {
  try {
    const client = getSupabaseClient(c.env);

    const category = c.req.query('category');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const isOfficial = c.req.query('official') === 'true';

    const templates = await dbHelpers.getTemplates(client, {
      category,
      limit,
      isOfficial: isOfficial ? true : undefined,
    });

    return c.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get templates',
      details: { error: errorMessage },
    }, 500);
  }
});

// Search templates (public)
app.get('/api/templates/search', optionalAuthMiddleware, async (c) => {
  try {
    const query = c.req.query('q');
    const limit = parseInt(c.req.query('limit') || '10', 10);

    if (!query) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'Query parameter q is required',
      }, 400);
    }

    const client = getSupabaseClient(c.env);

    // Use AI proxy for embedding
    const { createAIProxy } = await import('./agent/ai-proxy');
    const aiProxy = createAIProxy(c.env);
    const embedding = await aiProxy.generateEmbedding(query);

    // Search by vector similarity
    let results;
    try {
      results = await dbHelpers.searchTemplates(client, embedding, 0.5, limit);
    } catch (rpcError) {
      // Fallback to text search
      const { data, error } = await client
        .from('templates')
        .select('*')
        .textSearch('name', query, { type: 'websearch' })
        .limit(limit);

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      results = (data || []).map((t: { id: string; name: string; category: string; template_config: unknown }) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        templateConfig: t.template_config,
        similarity: 1.0,
      }));
    }

    return c.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'SEARCH_ERROR',
      message: 'Failed to search templates',
      details: { error: errorMessage },
    }, 500);
  }
});

// Get template by ID (public)
app.get('/api/templates/:id', optionalAuthMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const client = getSupabaseClient(c.env);

    const { data: template, error } = await client
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return c.json({
        code: 'NOT_FOUND',
        message: 'Template not found',
      }, 404);
    }

    // Increment use count
    await client.rpc('increment_template_use', { template_id: id });

    return c.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get template',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Page Routes ====================

// Create page (requires auth)
app.post('/api/pages', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const authToken = c.get('authToken') as string;

  try {
    const body = await c.req.json<CreatePageRequest>();

    if (!body.pageConfig) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'pageConfig is required',
      }, 400);
    }

    // Use authenticated client for RLS
    const client = getSupabaseClientWithAuth(c.env, authToken);

    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.title || 'mypage');

    // Check slug uniqueness
    const { data: existing } = await client
      .from('pages')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      // Append random suffix to avoid collision
      slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    }

    const page = await dbHelpers.createPage(client, userId, {
      title: body.title || '我的主页',
      slug,
      pageConfig: body.pageConfig,
      themeId: body.themeId,
      isPublic: body.isPublic ?? true,
    });

    return c.json(page, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'CREATE_ERROR',
      message: 'Failed to create page',
      details: { error: errorMessage },
    }, 500);
  }
});

// Get page by ID (public or private based on auth)
app.get('/api/pages/:id', optionalAuthMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId') as string | undefined;
    const authToken = c.get('authToken') as string | undefined;

    // Use authenticated client if available, otherwise service client
    const client = authToken
      ? getSupabaseClientWithAuth(c.env, authToken)
      : getSupabaseClient(c.env);

    const page = await dbHelpers.getPage(client, id);

    // Check access
    if (!page.is_public && page.user_id !== userId) {
      return c.json({
        code: 'FORBIDDEN',
        message: 'This page is private',
      }, 403);
    }

    // Increment view count for public pages
    if (page.is_public) {
      await client.rpc('increment_page_view', { page_slug: page.slug });
    }

    return c.json(page);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return c.json({
        code: 'NOT_FOUND',
        message: 'Page not found',
      }, 404);
    }

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get page',
      details: { error: errorMessage },
    }, 500);
  }
});

// Get page by slug (public)
app.get('/api/pages/slug/:slug', optionalAuthMiddleware, async (c) => {
  try {
    const slug = c.req.param('slug');
    const client = getSupabaseClient(c.env);

    const page = await dbHelpers.getPage(client, slug, true);

    // Check if published and public
    if (!page.is_public || !page.is_published) {
      const userId = c.get('userId') as string | undefined;

      if (page.user_id !== userId) {
        return c.json({
          code: 'FORBIDDEN',
          message: 'This page is not publicly accessible',
        }, 403);
      }
    }

    // Increment view count
    await client.rpc('increment_page_view', { page_slug: slug });

    return c.json(page);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return c.json({
        code: 'NOT_FOUND',
        message: 'Page not found',
      }, 404);
    }

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get page',
      details: { error: errorMessage },
    }, 500);
  }
});

// Update page (requires auth)
app.put('/api/pages/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const authToken = c.get('authToken') as string;

  try {
    const id = c.req.param('id');
    const body = await c.req.json<UpdatePageRequest>();

    const client = getSupabaseClientWithAuth(c.env, authToken);

    // Build updates object
    const updates: Record<string, unknown> = {};
    if (body.title) updates.title = body.title;
    if (body.pageConfig) updates.page_config = body.pageConfig;
    if (body.themeId) updates.theme_id = body.themeId;
    if (body.isPublic !== undefined) updates.is_public = body.isPublic;
    if (body.isPublished !== undefined) updates.is_published = body.isPublished;
    if (body.passwordHash) updates.password_hash = body.passwordHash;

    if (Object.keys(updates).length === 0) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'No updates provided',
      }, 400);
    }

    const page = await dbHelpers.updatePage(client, id, userId, updates);

    return c.json(page);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'UPDATE_ERROR',
      message: 'Failed to update page',
      details: { error: errorMessage },
    }, 500);
  }
});

// Delete page (requires auth)
app.delete('/api/pages/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const authToken = c.get('authToken') as string;

  try {
    const id = c.req.param('id');
    const client = getSupabaseClientWithAuth(c.env, authToken);

    // Check ownership
    const page = await dbHelpers.getPage(client, id);

    if (page.user_id !== userId) {
      return c.json({
        code: 'FORBIDDEN',
        message: 'You can only delete your own pages',
      }, 403);
    }

    await client
      .from('pages')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return c.json({ deleted: true, id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'DELETE_ERROR',
      message: 'Failed to delete page',
      details: { error: errorMessage },
    }, 500);
  }
});

// List user pages (requires auth)
app.get('/api/pages', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const authToken = c.get('authToken') as string;

  try {
    const client = getSupabaseClientWithAuth(c.env, authToken);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const pages = await dbHelpers.getUserPages(client, userId, limit);

    return c.json({
      pages,
      count: pages.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get pages',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Upload Route ====================

// Upload file (requires auth)
app.post('/api/upload', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const authToken = c.get('authToken') as string;

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!file) {
      return c.json({
        code: 'INVALID_REQUEST',
        message: 'File is required',
      }, 400);
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        code: 'INVALID_FILE',
        message: 'Only JPG, PNG, GIF, and WebP images are allowed',
      }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({
        code: 'FILE_TOO_LARGE',
        message: 'Maximum file size is 5MB',
      }, 400);
    }

    // Generate storage path
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `users/${userId}/${filename}`;

    // Upload to Supabase Storage
    const client = getSupabaseClientWithAuth(c.env, authToken);
    const result = await dbHelpers.uploadFile(client, 'assets', path, file);

    // Create asset record
    const { data: asset, error } = await client
      .from('assets')
      .insert({
        user_id: userId,
        type: type || 'other',
        name: file.name,
        url: result.url,
        storage_path: result.path,
        file_size: file.size,
        mime_type: file.type,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
      })
      .select()
      .single();

    if (error) {
      // Still return upload result even if asset creation fails
      console.error('Asset record creation failed:', error);
    }

    return c.json({
      id: asset?.id || crypto.randomUUID(),
      url: result.url,
      storagePath: result.path,
      filename,
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'UPLOAD_ERROR',
      message: 'Failed to upload file',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Asset Routes ====================

// Get assets (public for official, private for user)
app.get('/api/assets', optionalAuthMiddleware, async (c) => {
  try {
    const client = getSupabaseClient(c.env);
    const userId = c.get('userId') as string | undefined;

    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    let query = client
      .from('assets')
      .select('*')
      .limit(limit);

    // Show official assets + user's own assets
    if (userId) {
      query = query.or(`is_official.eq.true,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_official', true);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: assets, error } = await query;

    if (error) {
      throw new Error(`Failed to get assets: ${error.message}`);
    }

    return c.json({
      assets,
      count: assets?.length || 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'DATABASE_ERROR',
      message: 'Failed to get assets',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Preview Route ====================

// Preview page by session ID
app.get('/preview/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const client = getSupabaseClient(c.env);

    // Get session config
    const { data: session, error } = await client
      .from('agent_sessions')
      .select('current_config')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return c.json({
        code: 'NOT_FOUND',
        message: 'Preview session not found',
      }, 404);
    }

    const config = session.current_config;

    // Return config for frontend to render
    return c.json({
      config,
      sessionId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json({
      code: 'PREVIEW_ERROR',
      message: 'Failed to get preview',
      details: { error: errorMessage },
    }, 500);
  }
});

// ==================== Helper Functions ====================

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);

  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

// ==================== Export for Workers ====================

export default app;