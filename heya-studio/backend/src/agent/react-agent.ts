/**
 * ReAct Agent - Reasoning and Acting loop for Heya Studio
 *
 * ReAct Pattern:
 * 1. Thought (思考): Analyze user input and decide what to do
 * 2. Action (行动): Execute a tool
 * 3. Observation (观察): Process tool result
 * 4. Repeat until task complete or max iterations
 */

import type {
  Env,
  AgentMessage,
  AgentSession,
  PageConfig,
  ToolName,
  ToolResult,
  AgentChatRequest,
  AgentChatResponse,
  AgentAction,
  Suggestion,
} from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AIProxy, createAIProxy } from './ai-proxy';
import { executeTool, toolRegistry } from './tools';

// ==================== Constants ====================

const MAX_ITERATIONS = 8;
const MAX_FOLLOWUP_QUESTIONS = 2;
const DEFAULT_CONFIG: PageConfig = {
  version: '1.0',
  metadata: { title: '我的主页' },
  theme: {
    id: 'sakura-pink',
    colors: {
      primary: '#F2A7B3',
      secondary: '#FFEEF2',
      accent: '#E8D4E8',
      background: '#FFF5F8',
      text: '#2A2A2A',
    },
    fonts: { primary: 'Noto Sans SC' },
  },
  layout: {
    type: 'single-column',
    width: 680,
    padding: { top: 40, right: 20, bottom: 40, left: 20 },
  },
  components: [],
};

// ==================== Agent System Prompt ====================

const REACT_SYSTEM_PROMPT = `你是一个专业的二次元主页设计助手。你使用 ReAct 模式工作：

## 工作流程
1. **Thought**: 分析用户输入，思考需要做什么
2. **Action**: 选择并执行一个工具
3. **Observation**: 观察工具返回结果
4. 重复直到任务完成

## 可用工具
- query_templates: 搜索匹配的模板
- generate_config: 根用户信息生成页面配置
- validate_config: 验证配置结构
- modify_config: 修改已有配置
- suggest_elements: 推荐合适的组件
- ask_user: 向用户提问获取更多信息
- render_preview: 渲染预览
- save_page_config: 保存页面

## 工具调用格式
使用 JSON 格式调用工具：
{
  "thought": "你的思考过程",
  "action": "工具名称",
  "action_input": { ...工具参数 }
}

## 回复格式
1. 如果需要调用工具，输出工具调用 JSON
2. 如果需要向用户展示结果，用友好语气描述
3. 如果任务完成，告知用户并提供预览或保存选项

## 约束
- 最多追问 2 次，避免过度打扰用户
- 生成配置后先验证，确保正确
- 用户说"确认"/"好的"/"就这样"时，准备保存
- 保持轻松友好的语气，像和懂二次元的朋友聊天

## 二次元知识
- 推し(Oshi): 最喜欢的角色
- 萌属性: 天然呆、傲娇、社恐等
- 风格: 樱粉萌系、暗黑哥特、复古像素、赛博朋克、Y2K
- 组件: 推し卡、属性墙、友人帐、音乐播放器`;

// ==================== Types ====================

interface ToolCall {
  thought: string;
  action: ToolName | 'respond';
  actionInput: Record<string, unknown>;
}

interface AgentState {
  session: AgentSession;
  messages: AgentMessage[];
  currentConfig: PageConfig;
  iteration: number;
  followupCount: number;
  taskComplete: boolean;
  lastToolResult?: ToolResult;
}

// ==================== ReAct Agent Class ====================

export class ReActAgent {
  private env: Env;
  private supabase: SupabaseClient;
  private aiProxy: AIProxy;
  private userId: string;
  private sessionId: string;

  constructor(
    env: Env,
    supabase: SupabaseClient,
    userId: string,
    sessionId: string
  ) {
    this.env = env;
    this.supabase = supabase;
    this.aiProxy = createAIProxy(env);
    this.userId = userId;
    this.sessionId = sessionId;
  }

  /**
   * Process a user message through ReAct loop
   */
  async process(userMessage: string, existingConfig?: PageConfig): Promise<AgentChatResponse> {
    // Initialize state
    const state: AgentState = {
      session: await this.loadSession(),
      messages: [],
      currentConfig: existingConfig || DEFAULT_CONFIG,
      iteration: 0,
      followupCount: 0,
      taskComplete: false,
    };

    // Add user message
    state.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // ReAct loop
    while (state.iteration < MAX_ITERATIONS && !state.taskComplete) {
      state.iteration++;

      // Step 1: Reason - Get next action from LLM
      const toolCall = await this.reason(state);

      if (!toolCall) {
        // No tool call needed, respond directly
        state.taskComplete = true;
        break;
      }

      // Step 2: Act - Execute tool or respond
      if (toolCall.action === 'respond') {
        // Direct response to user
        state.messages.push({
          role: 'assistant',
          content: toolCall.actionInput.response as string,
          timestamp: new Date().toISOString(),
        });
        state.taskComplete = true;
        break;
      }

      // Execute tool
      const toolResult = await this.act(toolCall.action, toolCall.actionInput, state);

      // Step 3: Observe - Process tool result
      state.lastToolResult = toolResult;
      this.observe(toolResult, state, toolCall.action);

      // Add assistant message about tool execution
      state.messages.push({
        role: 'assistant',
        content: this.formatToolResultMessage(toolCall, toolResult),
        timestamp: new Date().toISOString(),
        metadata: {
          toolCall: {
            name: toolCall.action,
            input: toolCall.actionInput,
            output: toolResult.output,
            success: toolResult.success,
          },
        },
      });
    }

    // Save session state
    await this.saveSession(state);

    // Build response
    return this.buildResponse(state);
  }

  /**
   * Reason step: Get next action from LLM
   */
  private async reason(state: AgentState): Promise<ToolCall | null> {
    // Build contextual prompt and inject as the last user-system message
    const contextNote = this.buildReasoningPrompt(state);

    // Enforce followup limit: if we've already asked too many times, force completion
    if (state.followupCount >= MAX_FOLLOWUP_QUESTIONS) {
      // Inject instruction to stop asking and generate config instead
      const messagesWithContext = [
        ...state.messages.map(m => ({ role: m.role, content: m.content })),
        {
          role: 'system' as const,
          content: `[系统提示] ${contextNote}\n\n你已经追问了 ${state.followupCount} 次，已达上限。请直接根据现有信息生成页面配置，不要再追问。`,
        },
      ];

      const response = await this.aiProxy.call({
        messages: messagesWithContext,
        systemPrompt: REACT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 2048,
      });

      const toolCall = this.parseToolCall(response.content);
      // Override any ask_user action when followup limit reached
      if (toolCall && toolCall.action === 'ask_user') {
        toolCall.action = 'generate_config';
        toolCall.actionInput = {};
      }

      await this.updateSessionMetrics(response.tokensUsed, response.modelUsed);
      return toolCall;
    }

    // Normal reasoning: inject context note as trailing system message
    const messagesWithContext = [
      ...state.messages.map(m => ({ role: m.role, content: m.content })),
      {
        role: 'system' as const,
        content: `[当前上下文] ${contextNote}`,
      },
    ];

    // Call AI
    const response = await this.aiProxy.call({
      messages: messagesWithContext,
      systemPrompt: REACT_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse response for tool call
    const toolCall = this.parseToolCall(response.content);

    // Update session metrics
    await this.updateSessionMetrics(response.tokensUsed, response.modelUsed);

    return toolCall;
  }

  /**
   * Act step: Execute tool
   */
  private async act(
    toolName: ToolName,
    input: Record<string, unknown>,
    state: AgentState
  ): Promise<ToolResult> {
    const context = {
      userId: this.userId,
      sessionId: this.sessionId,
      currentConfig: state.currentConfig,
      messages: state.messages,
      supabaseClient: this.supabase,
      aiProxy: this.aiProxy,
    };

    const startTime = Date.now();
    const result = await executeTool(toolName, input, context);
    const durationMs = Date.now() - startTime;

    // Log tool call
    await this.logToolCall(toolName, input, result, durationMs);

    return result;
  }

  /**
   * Observe step: Update state based on tool result
   */
  private observe(toolResult: ToolResult, state: AgentState, toolName?: string): void {
    if (!toolResult.success) {
      // Tool failed - might need to retry or inform user
      console.error('Tool failed:', toolResult.error);
      return;
    }

    // Update config if tool returned a new config
    if (toolResult.output.config) {
      state.currentConfig = toolResult.output.config as PageConfig;
    }

    // Track followup questions
    if (toolResult.output.needsResponse) {
      state.followupCount++;
      // After asking the user, stop the loop and wait for their next message
      state.taskComplete = true;
    }

    // Check if task is complete
    if (toolResult.output.saved || toolResult.output.previewUrl) {
      state.taskComplete = true;
    }
  }

  /**
   * Build reasoning prompt with context
   */
  private buildReasoningPrompt(state: AgentState): string {
    const parts = [
      `当前迭代: ${state.iteration}/${MAX_ITERATIONS}`,
      `追问次数: ${state.followupCount}/${MAX_FOLLOWUP_QUESTIONS}`,
      `当前配置摘要:`,
      `- 主题: ${state.currentConfig.theme?.id || '未设置'}`,
      `- 组件数: ${state.currentConfig.components?.length || 0}`,
    ];

    if (state.lastToolResult) {
      parts.push(`上次工具结果: ${JSON.stringify(state.lastToolResult.output).slice(0, 200)}`);
    }

    return parts.join('\n');
  }

  /**
   * Parse LLM response for tool call
   */
  private parseToolCall(content: string): ToolCall | null {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*"action"[\s\S]*\}/);

    if (!jsonMatch) {
      // No tool call, treat as direct response
      return {
        thought: 'Direct response to user',
        action: 'respond',
        actionInput: { response: content },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        thought?: string;
        action?: string;
        action_input?: Record<string, unknown>;
      };

      // Validate action
      const validActions: ToolName[] = [
        'query_templates', 'generate_config', 'validate_config',
        'modify_config', 'suggest_elements', 'ask_user',
        'render_preview', 'save_page_config',
      ];

      const action = parsed.action || 'respond';

      return {
        thought: parsed.thought || '',
        action: validActions.includes(action as ToolName) ? action as ToolName : 'respond',
        actionInput: parsed.action_input || {},
      };
    } catch (e) {
      // JSON parse failed, treat as direct response
      return {
        thought: 'Failed to parse tool call',
        action: 'respond',
        actionInput: { response: content },
      };
    }
  }

  /**
   * Format tool result as message
   */
  private formatToolResultMessage(toolCall: ToolCall, result: ToolResult): string {
    const actionName = toolCall.action;
    const success = result.success;

    const messages: Record<ToolName, string> = {
      'query_templates': success
        ? `找到了 ${result.output.count || 0} 个匹配的模板`
        : '模板搜索失败',
      'generate_config': success
        ? '已生成页面配置，包含 ' + (result.output.summary?.componentCount || 0) + ' 个组件'
        : '配置生成失败',
      'validate_config': success
        ? '配置验证通过'
        : '配置有问题：' + (result.output.errors?.join(', ') || '未知错误'),
      'modify_config': success
        ? '已修改配置：' + (result.output.changesApplied?.join(', ') || '')
        : '修改失败',
      'suggest_elements': success
        ? '推荐添加：' + (result.output.suggestions?.map((s: { type: string }) => s.type).join(', ') || '无')
        : '无法生成推荐',
      'ask_user': success
        ? (result.output.question as string)
        : '提问失败',
      'render_preview': success
        ? '预览已准备好，可以查看效果'
        : '预览生成失败',
      'save_page_config': success
        ? '页面已保存！地址：' + (result.output.pageUrl || '')
        : '保存失败',
    };

    return messages[actionName] || '操作完成';
  }

  /**
   * Build final response
   */
  private buildResponse(state: AgentState): AgentChatResponse {
    // Get last assistant message
    const lastAssistantMessage = state.messages
      .filter(m => m.role === 'assistant')
      .pop();

    // Determine action based on state
    let action: AgentAction | undefined;
    if (state.lastToolResult?.output?.previewUrl) {
      action = { type: 'preview', data: state.lastToolResult.output };
    } else if (state.lastToolResult?.output?.saved) {
      action = { type: 'save', data: state.lastToolResult.output };
    } else if (state.lastToolResult?.output?.needsResponse) {
      action = { type: 'ask', data: state.lastToolResult.output };
    }

    // Build suggestions
    const suggestions: Suggestion[] = [];
    if (state.currentConfig.components?.length === 0) {
      suggestions.push({
        type: 'template',
        name: '樱花萌系',
        description: '最受欢迎的二次元风格',
      });
    }

    return {
      sessionId: this.sessionId,
      response: lastAssistantMessage?.content || '处理完成',
      action,
      currentConfig: state.currentConfig,
      suggestions,
      requiresConfirmation: state.lastToolResult?.output?.needsResponse || false,
    };
  }

  /**
   * Load session from database
   */
  private async loadSession(): Promise<AgentSession> {
    const { data, error } = await this.supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', this.sessionId)
      .single();

    if (error) {
      // Create new session
      const { data: newSession, error: createError } = await this.supabase
        .from('agent_sessions')
        .insert({
          id: this.sessionId,
          user_id: this.userId,
          status: 'active',
          messages: [],
          current_config: DEFAULT_CONFIG,
          tool_calls: [],
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create session');
      }

      return newSession as AgentSession;
    }

    return data as AgentSession;
  }

  /**
   * Save session state
   */
  private async saveSession(state: AgentState): Promise<void> {
    await this.supabase
      .from('agent_sessions')
      .update({
        messages: state.messages,
        current_config: state.currentConfig,
        status: state.taskComplete ? 'completed' : 'active',
        completed_at: state.taskComplete ? new Date().toISOString() : null,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Update session metrics
   */
  private async updateSessionMetrics(tokensUsed: number, modelUsed: string): Promise<void> {
    // Get current metrics
    const { data } = await this.supabase
      .from('agent_sessions')
      .select('total_tokens, total_cost_usd')
      .eq('id', this.sessionId)
      .single();

    const currentTokens = data?.total_tokens || 0;
    const currentCost = data?.total_cost_usd || 0;

    const cost = this.aiProxy.calculateCost(modelUsed as 'minimax' | 'deepseek' | 'anthropic' | 'openai', tokensUsed);

    await this.supabase
      .from('agent_sessions')
      .update({
        model_used: modelUsed,
        total_tokens: currentTokens + tokensUsed,
        total_cost_usd: currentCost + cost,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Log tool call
   */
  private async logToolCall(
    toolName: ToolName | 'respond',
    input: Record<string, unknown>,
    result: ToolResult,
    durationMs: number
  ): Promise<void> {
    // Append to tool_calls array
    const { data } = await this.supabase
      .from('agent_sessions')
      .select('tool_calls')
      .eq('id', this.sessionId)
      .single();

    const toolCalls = data?.tool_calls || [];
    toolCalls.push({
      toolName,
      input,
      output: result.output,
      success: result.success,
      timestamp: new Date().toISOString(),
      durationMs,
    });

    await this.supabase
      .from('agent_sessions')
      .update({ tool_calls: toolCalls })
      .eq('id', this.sessionId);
  }
}

// ==================== Factory Function ====================

/**
 * Create ReAct Agent instance
 */
export function createReActAgent(
  env: Env,
  supabase: SupabaseClient,
  userId: string,
  sessionId?: string
): ReActAgent {
  const sid = sessionId || crypto.randomUUID();
  return new ReActAgent(env, supabase, userId, sid);
}

/**
 * Process agent chat request
 */
export async function processAgentChat(
  env: Env,
  request: AgentChatRequest,
  userId: string
): Promise<AgentChatResponse> {
  // Get Supabase client
  const { getSupabaseClient } = await import('../db/supabase');
  const supabase = getSupabaseClient(env);

  // Create agent
  const agent = createReActAgent(env, supabase, userId, request.sessionId);

  // Process message
  return agent.process(request.message, request.context?.existingConfig);
}

/**
 * Modify existing page configuration
 */
export async function modifyExistingPage(
  env: Env,
  userId: string,
  pageId: string,
  modifications: string
): Promise<AgentChatResponse> {
  // Get Supabase client and page
  const { getSupabaseClient, dbHelpers } = await import('../db/supabase');
  const supabase = getSupabaseClient(env);

  // Get existing page config
  const page = await dbHelpers.getPage(supabase, pageId);
  const existingConfig = page.page_config as PageConfig;

  // Create new session for modification
  const agent = createReActAgent(env, supabase, userId);

  // Process modification request
  return agent.process(modifications, existingConfig);
}