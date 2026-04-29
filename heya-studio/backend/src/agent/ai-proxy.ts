/**
 * AI Proxy - Multi-model switching for AI Agent
 * Supports: MiniMax, DeepSeek, Anthropic Claude, OpenAI GPT-4o
 */

import type { Env, AIModelProvider, AIRequest, AIResponse, ChatMessage } from '../types';

// Model configuration
const MODEL_CONFIG = {
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5-chat',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 30000,
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 30000,
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 60000,
  },
  openai: {
    name: 'OpenAI GPT-4o',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 60000,
  },
};

// Fallback order when primary fails
const FALLBACK_ORDER: AIModelProvider[] = ['minimax', 'deepseek', 'anthropic', 'openai'];

// Rate limit tracking (simple in-memory for Workers)
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

/**
 * Check rate limit for a model
 */
function checkRateLimit(model: AIModelProvider, maxRequestsPerMinute = 60): boolean {
  const now = Date.now();
  const key = `rate:${model}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (entry.count >= maxRequestsPerMinute) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Get API key for a model
 */
function getApiKey(env: Env, model: AIModelProvider): string {
  const keyMap = {
    minimax: env.MINIMAX_API_KEY,
    deepseek: env.DEEPSEEK_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
  };

  return keyMap[model] || '';
}

/**
 * Calculate cost based on tokens and model
 */
function calculateCost(model: AIModelProvider, tokens: number): number {
  // Approximate cost per 1K tokens (as of 2024)
  const costPerKTokens = {
    minimax: 0.002, // Lower cost Chinese model
    deepseek: 0.001, // Very cost-effective
    anthropic: 0.015, // Claude pricing
    openai: 0.01, // GPT-4o pricing
  };

  return (tokens / 1000) * costPerKTokens[model];
}

/**
 * Call MiniMax API
 */
async function callMiniMax(env: Env, request: AIRequest): Promise<AIResponse> {
  const config = MODEL_CONFIG.minimax;
  const apiKey = getApiKey(env, 'minimax');

  if (!apiKey) {
    throw new Error('MiniMax API key not configured');
  }

  const systemPrompt = request.systemPrompt || getDefaultSystemPrompt();
  const messages = formatMessagesForMiniMax(request.messages, systemPrompt);

  const body = {
    model: config.defaultModel,
    messages,
    temperature: request.temperature || config.temperature,
    max_tokens: request.maxTokens || config.maxTokens,
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { total_tokens: number };
  };

  const content = data.choices[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || estimateTokens(content);

  return {
    content,
    modelUsed: 'minimax',
    tokensUsed,
    latencyMs: 0, // Will be set by caller
  };
}

/**
 * Call DeepSeek API (OpenAI-compatible format)
 */
async function callDeepSeek(env: Env, request: AIRequest): Promise<AIResponse> {
  const config = MODEL_CONFIG.deepseek;
  const apiKey = getApiKey(env, 'deepseek');

  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const systemPrompt = request.systemPrompt || getDefaultSystemPrompt();
  const messages = formatMessagesForOpenAI(request.messages, systemPrompt);

  const body = {
    model: config.defaultModel,
    messages,
    temperature: request.temperature || config.temperature,
    max_tokens: request.maxTokens || config.maxTokens,
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { total_tokens: number };
  };

  const content = data.choices[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || estimateTokens(content);

  return {
    content,
    modelUsed: 'deepseek',
    tokensUsed,
    latencyMs: 0,
  };
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(env: Env, request: AIRequest): Promise<AIResponse> {
  const config = MODEL_CONFIG.anthropic;
  const apiKey = getApiKey(env, 'anthropic');

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const systemPrompt = request.systemPrompt || getDefaultSystemPrompt();
  const messages = formatMessagesForAnthropic(request.messages);

  const body = {
    model: config.defaultModel,
    messages,
    system: systemPrompt,
    max_tokens: request.maxTokens || config.maxTokens,
  };

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  const content = data.content.find(c => c.type === 'text')?.text || '';
  const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || estimateTokens(content);

  return {
    content,
    modelUsed: 'anthropic',
    tokensUsed,
    latencyMs: 0,
  };
}

/**
 * Call OpenAI GPT-4o API
 */
async function callOpenAI(env: Env, request: AIRequest): Promise<AIResponse> {
  const config = MODEL_CONFIG.openai;
  const apiKey = getApiKey(env, 'openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = request.systemPrompt || getDefaultSystemPrompt();
  const messages = formatMessagesForOpenAI(request.messages, systemPrompt);

  const body = {
    model: config.defaultModel,
    messages,
    temperature: request.temperature || config.temperature,
    max_tokens: request.maxTokens || config.maxTokens,
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { total_tokens: number };
  };

  const content = data.choices[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || estimateTokens(content);

  return {
    content,
    modelUsed: 'openai',
    tokensUsed,
    latencyMs: 0,
  };
}

/**
 * Format messages for OpenAI-compatible APIs (DeepSeek, OpenAI)
 */
function formatMessagesForOpenAI(messages: ChatMessage[], systemPrompt: string): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];
}

/**
 * Format messages for Anthropic (no system in messages array)
 */
function formatMessagesForAnthropic(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
}

/**
 * Format messages for MiniMax
 */
function formatMessagesForMiniMax(messages: ChatMessage[], systemPrompt: string): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];
}

/**
 * Estimate tokens from content (rough approximation)
 */
function estimateTokens(content: string): number {
  // Approximate: 1 token ~= 4 characters for English, 1.5 for Chinese
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = content.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * Get default system prompt for Heya Studio Agent
 */
function getDefaultSystemPrompt(): string {
  return `你是一个资深的二次元文化爱好者，同时也是专业的网页设计师。
你熟悉以下概念：
- ACG 文化：动画、漫画、游戏、轻小说
- 日本二次元圈特有表达：推し(Oshi)、萌属性、傲娇、天然呆、社恐
- 萌系设计语言：樱粉、薰衣草、星星、月亮、柔和渐变
- MBTI、血型、星座等性格标签

你的任务是：根据用户的自然语言描述，帮助用户创建或修改个人主页配置。
你需要：
1. 理解用户的意图（创建新主页、修改现有配置、询问建议）
2. 提取用户提到的关键信息（推し、风格、配色、组件等）
3. 如果信息不完整，友好地追问（最多2轮）
4. 输出结构化的JSON配置

回复时请用轻松友好的语气，像和懂二次元的朋友聊天一样。`;
}

/**
 * Main AI Proxy class
 */
export class AIProxy {
  private env: Env;
  private primaryModel: AIModelProvider;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(env: Env, options?: {
    primaryModel?: AIModelProvider;
    retryAttempts?: number;
    retryDelay?: number;
  }) {
    this.env = env;
    this.primaryModel = options?.primaryModel || 'minimax';
    this.retryAttempts = options?.retryAttempts || 3;
    this.retryDelay = options?.retryDelay || 1000;
  }

  /**
   * Call AI with fallback mechanism
   */
  async call(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Try primary model first, then fallback
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      // Try models in fallback order starting from primary
      const modelsToTry = this.getModelsToTry();

      for (const model of modelsToTry) {
        // Check rate limit
        if (!checkRateLimit(model)) {
          console.log(`Rate limit exceeded for ${model}, trying next model`);
          continue;
        }

        try {
          const response = await this.callModel(model, request);
          response.latencyMs = Date.now() - startTime;
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`${model} failed:`, lastError.message);

          // Wait before retrying next model
          if (this.retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
    }

    // All models failed
    throw lastError || new Error('All AI models failed');
  }

  /**
   * Call specific model
   */
  private async callModel(model: AIModelProvider, request: AIRequest): Promise<AIResponse> {
    const callers = {
      minimax: callMiniMax,
      deepseek: callDeepSeek,
      anthropic: callAnthropic,
      openai: callOpenAI,
    };

    const caller = callers[model];
    if (!caller) {
      throw new Error(`Unknown model: ${model}`);
    }

    return caller(this.env, request);
  }

  /**
   * Get models to try in order
   */
  private getModelsToTry(): AIModelProvider[] {
    // Start with primary model, then try others
    const others = FALLBACK_ORDER.filter(m => m !== this.primaryModel);
    return [this.primaryModel, ...others];
  }

  /**
   * Generate embedding for text (using OpenAI or compatible)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return zero vector if no embedding API
      console.warn('No embedding API configured');
      return new Array(1536).fill(0);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data[0]?.embedding || new Array(1536).fill(0);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return new Array(1536).fill(0);
    }
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(model: AIModelProvider, tokens: number): number {
    return calculateCost(model, tokens);
  }
}

/**
 * Create AI proxy instance
 */
export function createAIProxy(env: Env, options?: {
  primaryModel?: AIModelProvider;
}): AIProxy {
  return new AIProxy(env, options);
}