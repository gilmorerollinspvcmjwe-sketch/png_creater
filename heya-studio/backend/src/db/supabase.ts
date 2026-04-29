/**
 * Supabase client wrapper for Cloudflare Workers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client (singleton pattern for Workers)
 */
export function getSupabaseClient(env: Env): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'User-Agent': 'heya-studio-backend/0.1.0',
        },
      },
    });
  }
  return supabaseClient;
}

/**
 * Get Supabase client with user context (for RLS)
 */
export function getSupabaseClientWithAuth(env: Env, authToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
}

/**
 * Verify JWT token and extract user info
 */
export async function verifyToken(env: Env, token: string): Promise<{
  userId: string;
  email: string;
  error?: string;
}> {
  try {
    // Use Supabase auth to verify the token
    const client = getSupabaseClientWithAuth(env, token);
    const { data: { user }, error } = await client.auth.getUser();

    if (error) {
      return { userId: '', email: '', error: error.message };
    }

    if (!user) {
      return { userId: '', email: '', error: 'User not found' };
    }

    return {
      userId: user.id,
      email: user.email || '',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { userId: '', email: '', error: errorMessage };
  }
}

/**
 * Database helper functions
 */
export const dbHelpers = {
  /**
   * Get user by ID
   */
  async getUser(client: SupabaseClient, userId: string) {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
    return data;
  },

  /**
   * Get user's pages
   */
  async getUserPages(client: SupabaseClient, userId: string, limit = 20) {
    const { data, error } = await client
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pages: ${error.message}`);
    }
    return data;
  },

  /**
   * Get page by ID or slug
   */
  async getPage(client: SupabaseClient, identifier: string, bySlug = false) {
    const field = bySlug ? 'slug' : 'id';
    const { data, error } = await client
      .from('pages')
      .select('*')
      .eq(field, identifier)
      .single();

    if (error) {
      throw new Error(`Failed to get page: ${error.message}`);
    }
    return data;
  },

  /**
   * Create page
   */
  async createPage(client: SupabaseClient, userId: string, pageData: {
    title: string;
    slug: string;
    pageConfig: Record<string, unknown>;
    themeId?: string;
    isPublic?: boolean;
  }) {
    const { data, error } = await client
      .from('pages')
      .insert({
        user_id: userId,
        title: pageData.title,
        slug: pageData.slug,
        page_config: pageData.pageConfig,
        theme_id: pageData.themeId,
        is_public: pageData.isPublic ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
    return data;
  },

  /**
   * Update page
   */
  async updatePage(client: SupabaseClient, pageId: string, userId: string, updates: Record<string, unknown>) {
    const { data, error } = await client
      .from('pages')
      .update(updates)
      .eq('id', pageId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update page: ${error.message}`);
    }
    return data;
  },

  /**
   * Get templates with optional filters
   */
  async getTemplates(client: SupabaseClient, filters?: {
    category?: string;
    isOfficial?: boolean;
    limit?: number;
  }) {
    let query = client
      .from('templates')
      .select('*')
      .order('use_count', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.isOfficial) {
      query = query.eq('is_official', filters.isOfficial);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
    return data;
  },

  /**
   * Search templates by vector similarity
   * Requires the search_templates RPC function
   */
  async searchTemplates(client: SupabaseClient, embedding: number[], threshold = 0.7, count = 10) {
    const { data, error } = await client.rpc('search_templates', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: count,
    });

    if (error) {
      throw new Error(`Failed to search templates: ${error.message}`);
    }
    return data;
  },

  /**
   * Get or create agent session
   */
  async getOrCreateSession(client: SupabaseClient, userId: string, sessionId?: string) {
    if (sessionId) {
      const { data, error } = await client
        .from('agent_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to get session: ${error.message}`);
      }
      return data;
    }

    // Create new session
    const { data, error } = await client
      .from('agent_sessions')
      .insert({
        user_id: userId,
        status: 'active',
        messages: [],
        current_config: {},
        tool_calls: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
    return data;
  },

  /**
   * Update agent session
   */
  async updateSession(client: SupabaseClient, sessionId: string, updates: Record<string, unknown>) {
    const { data, error } = await client
      .from('agent_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
    return data;
  },

  /**
   * Add message to session
   */
  async addSessionMessage(client: SupabaseClient, sessionId: string, message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    // Get current messages
    const { data: session } = await client
      .from('agent_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();

    const messages = session?.messages || [];
    messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });

    await client
      .from('agent_sessions')
      .update({ messages })
      .eq('id', sessionId);
  },

  /**
   * Log tool call
   */
  async logToolCall(client: SupabaseClient, sessionId: string, toolCall: {
    toolName: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    success: boolean;
    durationMs?: number;
    tokensUsed?: number;
  }) {
    const { error } = await client
      .from('agent_tool_logs')
      .insert({
        session_id: sessionId,
        tool_name: toolCall.toolName,
        tool_input: toolCall.input,
        tool_output: toolCall.output,
        success: toolCall.success,
        duration_ms: toolCall.durationMs,
        tokens_used: toolCall.tokensUsed,
      });

    if (error) {
      console.error('Failed to log tool call:', error);
    }
  },

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(client: SupabaseClient, bucket: string, path: string, file: Blob | File) {
    const { data, error } = await client
      .storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = client
      .storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  },

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(client: SupabaseClient, bucket: string, path: string) {
    const { error } = await client
      .storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },
};