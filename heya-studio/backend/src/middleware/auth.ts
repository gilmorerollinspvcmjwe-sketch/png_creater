/**
 * Authentication middleware for Cloudflare Workers
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { verifyToken, getSupabaseClient } from '../db/supabase';

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user context to request
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    }, 401);
  }

  const env = c.env;
  const result = await verifyToken(env, token);

  if (result.error) {
    return c.json({
      code: 'TOKEN_INVALID',
      message: result.error,
    }, 401);
  }

  // Add user info to context
  c.set('userId', result.userId);
  c.set('userEmail', result.email);
  c.set('authToken', token);

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (token) {
    const env = c.env;
    const result = await verifyToken(env, token);

    if (!result.error) {
      c.set('userId', result.userId);
      c.set('userEmail', result.email);
      c.set('authToken', token);
    }
  }

  await next();
}

/**
 * Admin authentication middleware
 * Requires the user to be an admin
 */
export async function adminAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      code: 'UNAUTHORIZED',
      message: 'Missing Authorization header',
    }, 401);
  }

  const env = c.env;
  const result = await verifyToken(env, token);

  if (result.error) {
    return c.json({
      code: 'TOKEN_INVALID',
      message: result.error,
    }, 401);
  }

  // Check if user is admin (from preferences metadata or a separate admin table)
  const client = getSupabaseClient(env);
  const { data: user, error } = await client
    .from('users')
    .select('preferences')
    .eq('id', result.userId)
    .single();

  if (error || !user?.preferences?.isAdmin) {
    return c.json({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    }, 403);
  }

  c.set('userId', result.userId);
  c.set('userEmail', result.email);
  c.set('authToken', token);
  c.set('isAdmin', true);

  await next();
}

/**
 * Rate limiting middleware factory using KV store
 * Usage: rateLimitMiddleware({ maxRequests: 20, windowMs: 60000 })
 */
export function rateLimitMiddleware(options: {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
} = {}) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId') as string | undefined;
    const env = c.env;

    // If no user, use IP as fallback
    const identifier = userId || c.req.header('CF-Connecting-IP') || 'anonymous';

    const windowMs = options.windowMs || 60000; // 1 minute default
    const maxRequests = options.maxRequests || 30; // 30 requests per minute default
    const keyPrefix = options.keyPrefix || 'rate_limit';

    const key = `${keyPrefix}:${identifier}`;

    // Get current count from KV
    const currentCount = await env.KV.get(key);
    const count = parseInt(currentCount || '0', 10);

    if (count >= maxRequests) {
      return c.json({
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: windowMs / 1000,
      }, 429);
    }

    // Increment count
    await env.KV.put(key, String(count + 1), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });

    // Add rate limit headers
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(maxRequests - count - 1));
    c.header('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000)));

    await next();
  };
}

/**
 * CORS middleware
 * In development, allows all origins. In production, restricts to configured origins.
 */
export function corsMiddleware(options?: { allowedOrigins?: string[] }) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const requestOrigin = c.req.header('Origin');
    const env = (c as Context<{ Bindings: Env }>).env;
    const isDev = !env?.ENVIRONMENT || env.ENVIRONMENT === 'development';

    // Allowed origins: configurable, defaults to allow all in dev
    const allowedOrigins = options?.allowedOrigins || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://heya.studio',
      'https://www.heya.studio',
    ];

    let allowOrigin: string;
    if (isDev || !requestOrigin) {
      allowOrigin = requestOrigin || '*';
    } else if (allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      // Reject unknown origins in production (return CORS error)
      return c.json({ code: 'CORS_ERROR', message: 'Origin not allowed' }, 403);
    }

    c.header('Access-Control-Allow-Origin', allowOrigin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    c.header('Access-Control-Max-Age', '86400');
    if (allowOrigin !== '*') {
      c.header('Vary', 'Origin');
    }

    if (c.req.method === 'OPTIONS') {
      return c.text('', 204);
    }

    await next();
  };
}

/**
 * Request logging middleware
 */
export async function loggingMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  console.log(`[${requestId}] ${c.req.method} ${c.req.path} - Started`);

  await next();

  const duration = Date.now() - start;
  console.log(`[${requestId}] ${c.req.method} ${c.req.path} - Completed in ${duration}ms`);
}

/**
 * Error handler middleware
 */
export async function errorHandlerMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    const requestId = c.get('requestId') as string | undefined;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${requestId}] Error:`, errorMessage);
    console.error(errorStack);

    // Don't expose internal error details to client
    return c.json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    }, 500);
  }
}