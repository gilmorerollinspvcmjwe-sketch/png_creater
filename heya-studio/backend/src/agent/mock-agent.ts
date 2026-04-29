/**
 * Mock Agent - 简化版 AI Agent，无需 Supabase
 * 直接调用 DeepSeek API 生成/修改页面配置
 */

import { AIProxy, createAIProxy } from './ai-proxy';
import type { Env, AgentChatRequest, AgentChatResponse, PageConfig } from '../types';

// Mock 默认配置
const DEFAULT_CONFIG: PageConfig = {
  version: '1.0',
  metadata: { title: '我的主页' },
  theme: {
    id: 'sakura',
    colors: {
      primary: '#F2A7B3',
      secondary: '#FFEEF2',
      accent: '#E8D4E8',
      background: '#FFF5F8',
      text: '#2A2A2A',
    },
    fonts: { primary: 'Noto Sans SC' },
  },
  layout: { type: 'single-column', width: 680 },
  components: [],
};

// 可用组件类型
const AVAILABLE_COMPONENT_TYPES = [
  'text', 'image', 'avatar', 'tag-group', 'social-links',
  'oshi-card', 'attribute-wall', 'friends-list', 'music-player',
  'quote', 'divider', 'spacer', 'container', 'hero-section', 'media-list',
];

// 系统提示词
const SYSTEM_PROMPT = `你是一个二次元个人主页配置助手。用户会用自然语言描述他们想要的主页。

## 可用组件类型
${AVAILABLE_COMPONENT_TYPES.join(', ')}

## 组件位置
画布宽度 680px，x 范围 0-680，y 从上到下排列。

## 回复要求
1. 用中文回复，语气轻松友好
2. 如果用户描述了主页需求，生成 JSON 配置
3. JSON 配置格式：
{
  "components": [
    {
      "type": "组件类型",
      "id": "唯一ID",
      "x": 水平位置(0-680),
      "y": 垂直位置,
      "width": 宽度,
      "height": 高度,
      "zIndex": 层级,
      "props": { 组件特定属性 }
    }
  ],
  "theme": "主题ID (sakura/lavender/mint/cream/night/pixel/mono/millennial)",
  "title": "页面标题"
}

## 常见组件属性
- text: { content: "文字内容", fontSize: 14, textAlign: "left/center/right", color: "#xxx" }
- image: { src: "图片URL", objectFit: "cover", borderRadius: 8 }
- avatar: { src: "头像URL", showGlow: true }
- tag-group: { tags: ["标签1", "标签2"], variant: "default/outlined/filled" }
- oshi-card: { characters: [{ name: "角色名", from: "作品名" }], columns: 4 }
- attribute-wall: { attributes: [{ type: "mbti/blood/zodiac", label: "标签", value: "值" }] }
- friends-list: { friends: [{ name: "名字", intro: "简介", color: "#xxx" }] }
- music-player: { song: { name: "歌名", artist: "歌手" } }
- quote: { text: "引言内容", typewriterEffect: true }
- divider: { variant: "line/dots/stars" }
- hero-section: { name: "用户名", signature: "签名", mbti: "INFP", bloodType: "AB型", zodiac: "水瓶座", age: "17岁", avatar: "头像URL" }
- media-list: { items: [{ title: "标题", rating: 5, comment: "评论" }], mediaType: "anime/movie/music/game/book" }

## 布局建议
- HeroSection 放在顶部 (x:0, y:0, width:680, height:160)
- 组件之间留 15-20px 间距
- 不要重叠组件
- 如果用户没指定位置，按顺序排列

请直接回复，如果需要生成配置就在回复中包含 JSON。`;

// 组件 ID 计数器
let componentIdCounter = 0;

function genId() {
  return `comp_${++componentIdCounter}_${Date.now()}`;
}

export async function processAgentChat(
  env: Env,
  request: AgentChatRequest,
  userId: string,
): Promise<AgentChatResponse> {
  const aiProxy = createAIProxy(env, { primaryModel: 'deepseek' });
  
  // 构建上下文
  const existingConfig = request.context?.existingConfig;
  const contextNote = existingConfig
    ? `\n\n[当前画布状态]\n- 标题: ${existingConfig.metadata?.title || '未命名'}\n- 主题: ${existingConfig.theme?.id || '未设置'}\n- 组件数: ${existingConfig.components?.length || 0}\n- 请根据用户需求修改或生成新配置。`
    : '';

  const sessionId = request.sessionId || `session_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

  try {
    const response = await aiProxy.call({
      messages: [
        { role: 'user', content: request.message + contextNote },
      ],
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // 尝试从回复中解析 JSON 配置
    const jsonMatch = response.content.match(/\{[\s\S]*"components"[\s\S]*\}/);
    let currentConfig = existingConfig || DEFAULT_CONFIG;
    let agentResponse = response.content;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 转换为后端格式
        if (parsed.components && Array.isArray(parsed.components)) {
          const backendComponents = parsed.components.map((comp: any) => ({
            id: comp.id || genId(),
            type: comp.type || 'text',
            position: {
              x: comp.x || 0,
              y: comp.y || 0,
              width: comp.width || 200,
              height: comp.height || 50,
              zIndex: comp.zIndex || 1,
            },
            props: comp.props || {},
          }));

          currentConfig = {
            ...currentConfig,
            theme: {
              id: parsed.theme || existingConfig?.theme?.id || 'sakura',
              colors: {},
              fonts: { primary: 'Noto Sans SC' },
            },
            metadata: {
              title: parsed.title || existingConfig?.metadata?.title || '我的主页',
            },
            components: backendComponents,
          };

          // 清理回复中的 JSON
          agentResponse = response.content.replace(jsonMatch[0], '').trim();
          if (!agentResponse) {
            agentResponse = `✅ 已生成 ${backendComponents.length} 个组件，配置已应用到画布！`;
          }
        }
      } catch (e) {
        console.log('JSON parse failed, using raw response:', e);
      }
    }

    return {
      sessionId,
      response: agentResponse,
      currentConfig,
      requiresConfirmation: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI call failed:', errorMessage);
    
    return {
      sessionId,
      response: `❌ AI 调用失败: ${errorMessage}`,
      currentConfig: existingConfig || DEFAULT_CONFIG,
      requiresConfirmation: false,
    };
  }
}

// 修改已有页面（简化版：合并到 processAgentChat）
export async function modifyExistingPage(
  env: Env,
  userId: string,
  pageId: string,
  message: string,
): Promise<AgentChatResponse> {
  // For mock mode, just process as normal chat
  return processAgentChat(env, { message }, userId);
}
