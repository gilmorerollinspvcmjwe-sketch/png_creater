/**
 * Agent Tools - 8 tools for Heya Studio AI Agent
 */

import type {
  ToolName,
  ToolDefinition,
  ToolContext,
  ToolResult,
  PageConfig,
  Template,
  TemplateSearchResult,
  ComponentType,
} from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AIProxy } from './ai-proxy';

// ==================== Tool Schemas ====================

const QueryTemplatesSchema = z.object({
  query: z.string().describe('Search query for templates'),
  category: z.string().optional().describe('Optional category filter'),
  limit: z.number().optional().default(5).describe('Number of results'),
});

const GenerateConfigSchema = z.object({
  userProfile: z.object({
    name: z.string().optional(),
    age: z.string().optional(),
    mbti: z.string().optional(),
    bloodType: z.string().optional(),
    zodiac: z.string().optional(),
  }).optional(),
  oshi: z.array(z.object({
    name: z.string(),
    from: z.string().optional(),
  })).optional(),
  music: z.array(z.string()).optional(),
  hobbies: z.array(z.string()).optional(),
  stylePreference: z.string().optional(),
  colorPreference: z.array(z.string()).optional(),
  socialLinks: z.array(z.object({
    platform: z.string(),
    username: z.string().optional(),
  })).optional(),
  templateId: z.string().optional(),
});

const ValidateConfigSchema = z.object({
  config: z.any().describe('Page configuration to validate'),
});

const ModifyConfigSchema = z.object({
  modifications: z.object({
    addComponent: z.any().optional(),
    removeComponent: z.string().optional(),
    updateComponent: z.any().optional(),
    changeTheme: z.string().optional(),
    changeColors: z.any().optional(),
    updateLayout: z.any().optional(),
  }).describe('Modifications to apply'),
});

const SuggestElementsSchema = z.object({
  context: z.string().optional().describe('Context for suggestions'),
  existingComponents: z.array(z.string()).optional().describe('Existing component types'),
});

const AskUserSchema = z.object({
  question: z.string().describe('Question to ask user'),
  options: z.array(z.string()).optional().describe('Multiple choice options'),
  reason: z.string().optional().describe('Why we need this information'),
});

const RenderPreviewSchema = z.object({
  config: z.any().optional().describe('Configuration to preview (uses current if not provided)'),
});

const SavePageConfigSchema = z.object({
  title: z.string().optional().describe('Page title'),
  slug: z.string().optional().describe('Page URL slug'),
  isPublic: z.boolean().optional().default(true),
});

// ==================== Tool Implementations ====================

/**
 * Query Templates Tool
 * Search templates by text or category
 */
export async function queryTemplates(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = QueryTemplatesSchema.parse(input);
    const { query, category, limit = 5 } = parsed;

    // Generate embedding for query
    const embedding = await context.aiProxy.generateEmbedding(query);

    // Search by vector similarity
    let templates: TemplateSearchResult[] = [];

    try {
      templates = await context.supabaseClient.rpc('search_templates', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
      });
    } catch (rpcError) {
      // Fallback to regular query if RPC fails
      console.log('RPC search failed, using regular query:', rpcError);

      let queryBuilder = context.supabaseClient
        .from('templates')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(limit);

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      templates = (data || []).map((t: Template) => ({
        ...t,
        similarity: 1.0, // Default similarity for non-vector search
      }));
    }

    return {
      success: true,
      output: {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          thumbnailUrl: t.thumbnailUrl,
          similarity: t.similarity,
        })),
        count: templates.length,
        query,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate Config Tool
 * Generate complete page configuration from user inputs
 */
export async function generateConfig(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = GenerateConfigSchema.parse(input);

    // Get template if specified
    let baseConfig: Partial<PageConfig> = {};
    if (parsed.templateId) {
      const { data: template, error } = await context.supabaseClient
        .from('templates')
        .select('template_config')
        .eq('id', parsed.templateId)
        .single();

      if (!error && template) {
        baseConfig = template.template_config as PageConfig;
      }
    }

    // Determine theme based on style preference
    const themeId = determineTheme(parsed.stylePreference);
    const colors = determineColors(parsed.colorPreference, parsed.stylePreference);

    // Build components from user inputs
    const components = buildComponentsFromInputs(parsed);

    // Construct final config
    const config: PageConfig = {
      version: '1.0',
      metadata: {
        title: parsed.userProfile?.name || '我的主页',
        author: parsed.userProfile?.name,
      },
      theme: {
        id: themeId,
        colors,
        fonts: {
          primary: 'Noto Sans SC',
          secondary: 'Inter',
        },
        effects: getThemeEffects(themeId),
      },
      layout: {
        type: 'single-column',
        width: 680,
        maxWidth: 900,
        padding: { top: 40, right: 20, bottom: 40, left: 20 },
      },
      components: mergeComponents(baseConfig.components || [], components),
    };

    return {
      success: true,
      output: {
        config,
        summary: {
          theme: themeId,
          componentCount: config.components.length,
          hasOshi: parsed.oshi && parsed.oshi.length > 0,
          hasMusic: parsed.music && parsed.music.length > 0,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate Config Tool
 * Validate page configuration structure
 */
export async function validateConfig(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = ValidateConfigSchema.parse(input);
    const config = parsed.config as PageConfig;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.version) {
      errors.push('Missing version field');
    }
    if (!config.theme) {
      errors.push('Missing theme configuration');
    }
    if (!config.layout) {
      errors.push('Missing layout configuration');
    }
    if (!config.components || !Array.isArray(config.components)) {
      errors.push('Missing or invalid components array');
    }

    // Validate theme colors
    if (config.theme?.colors) {
      const { primary, secondary, background, text } = config.theme.colors;
      if (!primary || !isValidColor(primary)) {
        errors.push('Invalid primary color');
      }
      if (!background || !isValidColor(background)) {
        errors.push('Invalid background color');
      }
    }

    // Validate components
    if (config.components) {
      for (const comp of config.components) {
        if (!comp.id) {
          errors.push(`Component missing id`);
        }
        if (!comp.type || !isValidComponentType(comp.type)) {
          errors.push(`Component ${comp.id} has invalid type: ${comp.type}`);
        }
      }

      // Warnings for best practices
      if (config.components.length > 20) {
        warnings.push('Many components may affect performance');
      }
      if (!config.components.some(c => c.type === 'text')) {
        warnings.push('No text component found - consider adding a title');
      }
    }

    return {
      success: errors.length === 0,
      output: {
        isValid: errors.length === 0,
        errors,
        warnings,
        componentCount: config.components?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Modify Config Tool
 * Apply modifications to existing configuration
 */
export async function modifyConfig(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = ModifyConfigSchema.parse(input);
    const { modifications } = parsed;
    let config = { ...context.currentConfig };

    // Add component
    if (modifications.addComponent) {
      const newComp = modifications.addComponent;
      newComp.id = generateComponentId(newComp.type);
      config.components = [...config.components, newComp];
    }

    // Remove component
    if (modifications.removeComponent) {
      config.components = config.components.filter(
        c => c.id !== modifications.removeComponent
      );
    }

    // Update component
    if (modifications.updateComponent) {
      const { id, updates } = modifications.updateComponent;
      config.components = config.components.map(c =>
        c.id === id ? { ...c, ...updates } : c
      );
    }

    // Change theme
    if (modifications.changeTheme) {
      config.theme = {
        ...config.theme,
        id: modifications.changeTheme,
        colors: getThemeColors(modifications.changeTheme),
      };
    }

    // Change colors
    if (modifications.changeColors) {
      config.theme = {
        ...config.theme,
        colors: { ...config.theme.colors, ...modifications.changeColors },
      };
    }

    // Update layout
    if (modifications.updateLayout) {
      config.layout = { ...config.layout, ...modifications.updateLayout };
    }

    return {
      success: true,
      output: {
        config,
        changesApplied: Object.keys(modifications).filter(k => modifications[k as keyof typeof modifications]),
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Suggest Elements Tool
 * Recommend components based on user context
 */
export async function suggestElements(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = SuggestElementsSchema.parse(input);
    const { context: userContext, existingComponents = [] } = parsed;

    // Default recommendations based on typical anime profile
    const suggestions = [];

    // Core components (if not existing)
    if (!existingComponents.includes('text')) {
      suggestions.push({
        type: 'text',
        reason: '个人介绍或标题是主页核心元素',
        priority: 'high',
      });
    }
    if (!existingComponents.includes('tag-group')) {
      suggestions.push({
        type: 'tag-group',
        reason: 'MBTI、星座等属性标签很受欢迎',
        priority: 'high',
      });
    }
    if (!existingComponents.includes('social-links')) {
      suggestions.push({
        type: 'social-links',
        reason: '让访客能找到你的社交账号',
        priority: 'high',
      });
    }

    // Anime-specific components
    if (userContext?.includes('推') || userContext?.includes('oshi')) {
      if (!existingComponents.includes('oshi-card')) {
        suggestions.push({
          type: 'oshi-card',
          reason: '展示你喜欢的角色，二次元主页标配',
          priority: 'high',
        });
      }
    }

    if (userContext?.includes('音乐') || userContext?.includes('music') || userContext?.includes('歌')) {
      if (!existingComponents.includes('music-player')) {
        suggestions.push({
          type: 'music-player',
          reason: '音乐播放器让主页更有氛围',
          priority: 'medium',
        });
      }
    }

    // Decorative suggestions
    if (!existingComponents.includes('divider')) {
      suggestions.push({
        type: 'divider',
        reason: '分隔线让内容更有层次感',
        priority: 'low',
      });
    }

    return {
      success: true,
      output: {
        suggestions,
        existingCount: existingComponents.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ask User Tool
 * Generate a question to ask user for more information
 */
export async function askUser(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = AskUserSchema.parse(input);
    const { question, options, reason } = parsed;

    // This tool generates the question, actual asking is handled by the agent
    return {
      success: true,
      output: {
        question,
        options: options || [],
        reason: reason || '需要更多信息来完善主页',
        needsResponse: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Render Preview Tool
 * Generate preview URL for current configuration
 */
export async function renderPreview(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = RenderPreviewSchema.parse(input);
    const config = parsed.config || context.currentConfig;

    // In actual implementation, this would generate a preview URL
    // For now, we return the config that frontend can render
    const previewId = crypto.randomUUID();

    // Store preview config in KV for retrieval
    await context.supabaseClient
      .from('agent_sessions')
      .update({ current_config: config })
      .eq('id', context.sessionId);

    return {
      success: true,
      output: {
        previewId,
        previewUrl: `/preview/${previewId}`,
        config,
        canRender: config.components && config.components.length > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Save Page Config Tool
 * Save current configuration as a new page
 */
export async function savePageConfig(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const parsed = SavePageConfigSchema.parse(input);
    const { title, slug, isPublic = true } = parsed;

    const config = context.currentConfig;

    // Generate slug from title if not provided
    const pageSlug = slug || generateSlug(title || config.metadata?.title || 'mypage');

    // Create page in database
    const { data: page, error } = await context.supabaseClient
      .from('pages')
      .insert({
        user_id: context.userId,
        title: title || config.metadata?.title || '我的主页',
        slug: pageSlug,
        page_config: config,
        is_public: isPublic,
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save page: ${error.message}`);
    }

    return {
      success: true,
      output: {
        pageId: page.id,
        slug: pageSlug,
        pageUrl: `/u/${pageSlug}`,
        saved: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== Helper Functions ====================

function determineTheme(stylePreference?: string): string {
  const styleMap: Record<string, string> = {
    '萌系': 'sakura-pink',
    '樱粉': 'sakura-pink',
    '可爱': 'sakura-pink',
    '暗黑': 'dark-gothic',
    '哥特': 'dark-gothic',
    '复古': 'retro-pixel',
    '像素': 'retro-pixel',
    '极简': 'minimal',
    '简约': 'minimal',
    '赛博': 'cyberpunk',
    'Y2K': 'y2k',
    '千禧': 'y2k',
    '薰衣草': 'lavender',
    '紫': 'lavender',
    '薄荷': 'mint-green',
    '绿': 'mint-green',
  };

  if (!stylePreference) return 'sakura-pink';

  for (const [key, value] of Object.entries(styleMap)) {
    if (stylePreference.includes(key)) {
      return value;
    }
  }

  return 'sakura-pink';
}

function determineColors(colorPreference?: string[], stylePreference?: string): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
} {
  // Predefined color schemes
  const colorSchemes: Record<string, typeof returnType> = {
    'sakura-pink': {
      primary: '#F2A7B3',
      secondary: '#FFEEF2',
      accent: '#E8D4E8',
      background: '#FFF5F8',
      text: '#2A2A2A',
    },
    'lavender': {
      primary: '#B4A7D6',
      secondary: '#EDE8FF',
      accent: '#C8B8E8',
      background: '#F5F2FF',
      text: '#2A2A2A',
    },
    'dark-gothic': {
      primary: '#8B0000',
      secondary: '#2A2A2A',
      accent: '#FFD700',
      background: '#1A1A1A',
      text: '#F0F0F0',
    },
    'retro-pixel': {
      primary: '#00FF41',
      secondary: '#000000',
      accent: '#FF00FF',
      background: '#0F0F0F',
      text: '#FFFFFF',
    },
    'minimal': {
      primary: '#333333',
      secondary: '#F5F5F5',
      accent: '#666666',
      background: '#FFFFFF',
      text: '#1A1A1A',
    },
    'cyberpunk': {
      primary: '#FF00FF',
      secondary: '#00FFFF',
      accent: '#FFFF00',
      background: '#0A0A1A',
      text: '#FFFFFF',
    },
    'y2k': {
      primary: '#FFB6C1',
      secondary: '#87CEEB',
      accent: '#DDA0DD',
      background: '#FFFFFF',
      text: '#2A2A2A',
    },
    'mint-green': {
      primary: '#86EFAC',
      secondary: '#F0FFF4',
      accent: '#A7F3D0',
      background: '#F5FFF5',
      text: '#2A2A2A',
    },
  };

  const theme = determineTheme(stylePreference);
  const returnType = colorSchemes[theme] || colorSchemes['sakura-pink'];

  // Override with user preferences if provided
  if (colorPreference && colorPreference.length > 0) {
    // Try to parse first color as primary
    const primaryHex = parseColor(colorPreference[0]);
    if (primaryHex) {
      returnType.primary = primaryHex;
    }
  }

  return returnType;
}

function parseColor(colorStr: string): string | null {
  // Simple color parsing - check if it's a valid hex
  if (/^#[0-9A-Fa-f]{6}$/.test(colorStr)) {
    return colorStr;
  }
  // Named colors mapping
  const namedColors: Record<string, string> = {
    '粉': '#F2A7B3',
    '粉色': '#F2A7B3',
    'pink': '#F2A7B3',
    '紫': '#B4A7D6',
    '紫色': '#B4A7D6',
    'purple': '#B4A7D6',
    '蓝': '#87CEEB',
    '蓝色': '#87CEEB',
    'blue': '#87CEEB',
    '绿': '#86EFAC',
    '绿色': '#86EFAC',
    'green': '#86EFAC',
    '黑': '#1A1A1A',
    '黑色': '#1A1A1A',
    'black': '#1A1A1A',
  };
  return namedColors[colorStr.toLowerCase()] || null;
}

function getThemeColors(themeId: string): typeof returnType {
  const schemes = {
    'sakura-pink': {
      primary: '#F2A7B3',
      secondary: '#FFEEF2',
      accent: '#E8D4E8',
      background: '#FFF5F8',
      text: '#2A2A2A',
    },
    'lavender': {
      primary: '#B4A7D6',
      secondary: '#EDE8FF',
      accent: '#C8B8E8',
      background: '#F5F2FF',
      text: '#2A2A2A',
    },
    'dark-gothic': {
      primary: '#8B0000',
      secondary: '#2A2A2A',
      accent: '#FFD700',
      background: '#1A1A1A',
      text: '#F0F0F0',
    },
    'retro-pixel': {
      primary: '#00FF41',
      secondary: '#000000',
      accent: '#FF00FF',
      background: '#0F0F0F',
      text: '#FFFFFF',
    },
    'minimal': {
      primary: '#333333',
      secondary: '#F5F5F5',
      accent: '#666666',
      background: '#FFFFFF',
      text: '#1A1A1A',
    },
  };
  const returnType = schemes[themeId as keyof typeof schemes] || schemes['sakura-pink'];
  return returnType;
}

function getThemeEffects(themeId: string): Array<{ type: string; enabled: boolean; options: Record<string, unknown> }> {
  const effectsMap: Record<string, typeof returnType> = {
    'sakura-pink': [
      { type: 'particles', enabled: true, options: { style: 'sakura', count: 30 } },
    ],
    'lavender': [
      { type: 'gradient', enabled: true, options: { type: 'radial', colors: ['#B4A7D6', '#EDE8FF'] } },
    ],
    'dark-gothic': [
      { type: 'particles', enabled: true, options: { style: 'stars', count: 50 } },
    ],
    'retro-pixel': [
      { type: 'animation', enabled: true, options: { style: 'scanline' } },
    ],
  };
  const returnType = effectsMap[themeId] || [];
  return returnType;
}

function buildComponentsFromInputs(inputs: z.infer<typeof GenerateConfigSchema>): Array<{
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
}> {
  const components: Array<{ id: string; type: ComponentType; props: Record<string, unknown> }> = [];

  // Profile section
  if (inputs.userProfile) {
    components.push({
      id: generateComponentId('text'),
      type: 'text',
      props: {
        content: inputs.userProfile.name || '欢迎来到我的主页',
        style: 'title',
      },
    });

    // Attribute wall if MBTI or other attributes present
    if (inputs.userProfile.mbti || inputs.userProfile.bloodType || inputs.userProfile.zodiac) {
      const tags = [];
      if (inputs.userProfile.mbti) {
        tags.push({ label: inputs.userProfile.mbti, icon: 'mbti' });
      }
      if (inputs.userProfile.bloodType) {
        tags.push({ label: inputs.userProfile.bloodType, icon: 'blood' });
      }
      if (inputs.userProfile.zodiac) {
        tags.push({ label: inputs.userProfile.zodiac, icon: 'zodiac' });
      }
      if (inputs.userProfile.age) {
        tags.push({ label: inputs.userProfile.age, icon: 'age' });
      }

      components.push({
        id: generateComponentId('attribute-wall'),
        type: 'tag-group',
        props: {
          tags,
          style: 'rounded',
          showIcons: true,
        },
      });
    }
  }

  // Oshi cards
  if (inputs.oshi && inputs.oshi.length > 0) {
    inputs.oshi.forEach((oshi, index) => {
      components.push({
        id: generateComponentId('oshi-card'),
        type: 'oshi-card',
        props: {
          name: oshi.name,
          from: oshi.from || '',
          style: index === 0 ? 'featured' : 'normal',
        },
      });
    });
  }

  // Music
  if (inputs.music && inputs.music.length > 0) {
    components.push({
      id: generateComponentId('music-player'),
      type: 'music-player',
      props: {
        artists: inputs.music,
        style: 'minimal',
      },
    });
  }

  // Hobbies as tags
  if (inputs.hobbies && inputs.hobbies.length > 0) {
    components.push({
      id: generateComponentId('tag-group'),
      type: 'tag-group',
      props: {
        tags: inputs.hobbies.map(h => ({ label: h })),
        style: 'pill',
        title: '兴趣爱好',
      },
    });
  }

  // Social links
  if (inputs.socialLinks && inputs.socialLinks.length > 0) {
    components.push({
      id: generateComponentId('social-links'),
      type: 'social-links',
      props: {
        links: inputs.socialLinks.map(s => ({
          platform: s.platform,
          username: s.username,
        })),
        style: 'icons',
      },
    });
  }

  return components;
}

function mergeComponents(
  base: Array<{ id: string; type: ComponentType; props: Record<string, unknown> }>,
  newComponents: Array<{ id: string; type: ComponentType; props: Record<string, unknown> }>
): Array<{ id: string; type: ComponentType; props: Record<string, unknown> }> {
  // Merge, avoiding duplicates by type
  const merged = [...base];
  const existingTypes = new Set(base.map(c => c.type));

  for (const comp of newComponents) {
    if (!existingTypes.has(comp.type)) {
      merged.push(comp);
      existingTypes.add(comp.type);
    }
  }

  return merged;
}

function generateComponentId(type: ComponentType): string {
  return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .slice(0, 30);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

function isValidColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ||
         /^rgb\(\d+,\s*\d+,\s*\d+\)$/.test(color) ||
         /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/.test(color);
}

function isValidComponentType(type: string): boolean {
  const validTypes: ComponentType[] = [
    'container', 'text', 'image', 'card', 'tag-group',
    'button', 'social-links', 'oshi-card', 'attribute-wall',
    'friends-list', 'music-player', 'quote', 'divider', 'spacer',
  ];
  return validTypes.includes(type as ComponentType);
}

// ==================== Tool Registry ====================

export const toolRegistry: Record<ToolName, ToolDefinition> = {
  'query_templates': {
    name: 'query_templates',
    description: '搜索匹配的模板，根据用户描述找到最合适的模板',
    inputSchema: QueryTemplatesSchema,
    handler: queryTemplates,
  },
  'generate_config': {
    name: 'generate_config',
    description: '根据用户信息生成完整的页面配置',
    inputSchema: GenerateConfigSchema,
    handler: generateConfig,
  },
  'validate_config': {
    name: 'validate_config',
    description: '验证页面配置的结构是否正确',
    inputSchema: ValidateConfigSchema,
    handler: validateConfig,
  },
  'modify_config': {
    name: 'modify_config',
    description: '修改已有配置，支持添加/删除/更新组件、更换主题等',
    inputSchema: ModifyConfigSchema,
    handler: modifyConfig,
  },
  'suggest_elements': {
    name: 'suggest_elements',
    description: '根据用户上下文推荐合适的组件元素',
    inputSchema: SuggestElementsSchema,
    handler: suggestElements,
  },
  'ask_user': {
    name: 'ask_user',
    description: '向用户提问以获取更多信息',
    inputSchema: AskUserSchema,
    handler: askUser,
  },
  'render_preview': {
    name: 'render_preview',
    description: '渲染当前配置的预览',
    inputSchema: RenderPreviewSchema,
    handler: renderPreview,
  },
  'save_page_config': {
    name: 'save_page_config',
    description: '保存当前配置为新的页面',
    inputSchema: SavePageConfigSchema,
    handler: savePageConfig,
  },
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: ToolName,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = toolRegistry[toolName];
  if (!tool) {
    return {
      success: false,
      output: {},
      error: `Unknown tool: ${toolName}`,
    };
  }

  return tool.handler(input, context);
}