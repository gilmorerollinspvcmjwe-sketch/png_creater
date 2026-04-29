/**
 * Core type definitions for Heya Studio Backend
 */

// ==================== User Types ====================

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme?: string;
  defaultModel?: string;
  language?: 'zh' | 'en' | 'ja';
}

// ==================== Page Types ====================

export interface Page {
  id: string;
  userId: string;
  title: string;
  slug: string;
  pageConfig: PageConfig;
  themeId?: string;
  isPublic: boolean;
  isPublished: boolean;
  viewCount: number;
  passwordHash?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageConfig {
  version: string;
  metadata: PageMetadata;
  theme: ThemeConfig;
  layout: LayoutConfig;
  components: ComponentConfig[];
}

export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
}

export interface ThemeConfig {
  id: string;
  colors: ColorScheme;
  fonts: FontConfig;
  effects?: EffectConfig[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface FontConfig {
  primary: string;
  secondary?: string;
  sizes?: Record<string, number>;
}

export interface EffectConfig {
  type: 'particles' | 'gradient' | 'animation';
  enabled: boolean;
  options: Record<string, unknown>;
}

export interface LayoutConfig {
  type: 'single-column' | 'multi-column';
  width: number;
  maxWidth?: number;
  padding?: PaddingConfig;
}

export interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ==================== Component Types ====================

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style?: StyleConfig;
  children?: ComponentConfig[];
  position?: PositionConfig;
}

export type ComponentType =
  | 'container'
  | 'text'
  | 'image'
  | 'card'
  | 'tag-group'
  | 'button'
  | 'social-links'
  | 'oshi-card'
  | 'attribute-wall'
  | 'friends-list'
  | 'music-player'
  | 'quote'
  | 'divider'
  | 'spacer';

export interface StyleConfig {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: ShadowConfig;
  padding?: PaddingConfig;
  margin?: PaddingConfig;
}

export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface PositionConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

// ==================== Template Types ====================

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags: string[];
  thumbnailUrl?: string;
  previewUrl?: string;
  templateConfig: PageConfig;
  isOfficial: boolean;
  creatorId?: string;
  useCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | '萌系'
  | '暗黑哥特'
  | '复古像素'
  | '极简文字'
  | 'Y2K'
  | '千禧年'
  | 'Lolita'
  | '个人主页'
  | '自荐条'
  | 'OC角色卡'
  | 'Vtuber皮主页';

export interface TemplateSearchResult {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags: string[];
  thumbnailUrl?: string;
  templateConfig: PageConfig;
  similarity: number;
}

// ==================== Asset Types ====================

export type AssetType =
  | 'background'
  | 'decoration'
  | 'icon'
  | 'sticker'
  | 'divider'
  | 'font'
  | 'music'
  | 'other';

export interface Asset {
  id: string;
  userId?: string;
  type: AssetType;
  name: string;
  description?: string;
  url: string;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  tags: string[];
  isPremium: boolean;
  isOfficial: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ==================== Agent Types ====================

export type AgentSessionStatus = 'active' | 'completed' | 'cancelled' | 'failed';

export interface AgentSession {
  id: string;
  userId: string;
  pageId?: string;
  status: AgentSessionStatus;
  messages: AgentMessage[];
  currentConfig: PageConfig;
  toolCalls: ToolCallRecord[];
  modelUsed?: string;
  totalTokens: number;
  totalCostUsd: number;
  metadata: SessionMetadata;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  success: boolean;
  timestamp: string;
}

export interface SessionMetadata {
  intent?: string;
  extractedEntities?: ExtractedEntities;
  stylePreference?: string;
  colorPreference?: string[];
}

export interface ExtractedEntities {
  profile?: UserProfileEntities;
  oshi?: OshiEntity[];
  music?: string[];
  hobbies?: string[];
  attributes?: string[];
  socialLinks?: SocialLinkEntity[];
}

export interface UserProfileEntities {
  name?: string;
  age?: string;
  mbti?: string;
  bloodType?: string;
  zodiac?: string;
}

export interface OshiEntity {
  name: string;
  from?: string;
}

export interface SocialLinkEntity {
  platform: string;
  url?: string;
  username?: string;
}

// ==================== API Request/Response Types ====================

export interface AgentChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    pageId?: string;
    existingConfig?: PageConfig;
  };
}

export interface AgentChatResponse {
  sessionId: string;
  response: string;
  action?: AgentAction;
  currentConfig: PageConfig;
  suggestions?: Suggestion[];
  requiresConfirmation?: boolean;
}

export interface AgentAction {
  type: 'generate' | 'modify' | 'preview' | 'save' | 'ask';
  data: Record<string, unknown>;
}

export interface Suggestion {
  type: 'template' | 'component' | 'style' | 'color';
  id?: string;
  name: string;
  description?: string;
}

export interface CreatePageRequest {
  title: string;
  slug?: string;
  pageConfig: PageConfig;
  themeId?: string;
  isPublic?: boolean;
}

export interface UpdatePageRequest {
  title?: string;
  pageConfig?: PageConfig;
  themeId?: string;
  isPublic?: boolean;
  isPublished?: boolean;
  passwordHash?: string;
}

export interface UploadRequest {
  file: File;
  type: AssetType;
  tags?: string[];
}

export interface UploadResponse {
  id: string;
  url: string;
  storagePath: string;
}

// ==================== AI Provider Types ====================

export type AIModelProvider = 'minimax' | 'deepseek' | 'anthropic' | 'openai';

export interface AIRequest {
  messages: ChatMessage[];
  model?: AIModelProvider;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  modelUsed: AIModelProvider;
  tokensUsed: number;
  latencyMs: number;
}

// ==================== Tool Types ====================

export type ToolName =
  | 'query_templates'
  | 'generate_config'
  | 'validate_config'
  | 'modify_config'
  | 'suggest_elements'
  | 'ask_user'
  | 'render_preview'
  | 'save_page_config';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  sessionId: string;
  currentConfig: PageConfig;
  messages: AgentMessage[];
  supabaseClient: SupabaseClient;
  aiProxy: AIProxy;
}

export interface ToolResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}

// ==================== Error Types ====================

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==================== Worker Types ====================

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  MINIMAX_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: R2Bucket;
}

// Import types for runtime
import type { SupabaseClient } from '@supabase/supabase-js';
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

// Placeholder declarations (will be imported at runtime)
type AIProxy = unknown;