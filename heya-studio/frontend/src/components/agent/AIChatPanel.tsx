import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useUIStore, useEditorStore } from '@/stores'
import { X, Send, Sparkles, Key, AlertCircle, Wand2, Edit3, Palette, Plus, Loader2, CheckCircle2, XCircle, ChevronDown, Lightbulb } from 'lucide-react'
import {
  api,
  backendConfigToFrontend,
  APIClientError,
  getApiBaseUrl,
  getStoredSessionId,
  storeSessionId,
  type InterruptData,
} from '@/services/api'
import GuidedWizard from './GuidedWizard'

// Workflow step types - matches backend WorkflowStep (V2 pipeline)
interface WorkflowStep {
  type: 'status' | 'thinking' | 'tool_call' | 'tool_result' | 'profile_update' | 'skill_match' | 'generating' | 'validation' | 'done' | 'error' | 'ask_user' | 'suggestion' | 'planning' | 'building' | 'validating' | 'repairing' | 'human_review'
  message: string
  data?: Record<string, unknown>
  timestamp: number
}

interface Message {
  id: string
  role: 'user' | 'agent' | 'status'
  content: string
  timestamp: Date
  isError?: boolean
  // Workflow steps for status messages
  workflow?: WorkflowStep[]
  workflowCompleted?: boolean
  // Suggestions for quick actions
  suggestions?: string[]
  // Feedback state
  feedbackGiven?: 'preference' | 'dislike' | 'correction' | null
  // Interrupt state
  interrupt?: InterruptData | null
}

// V2 Pipeline step labels
const PIPELINE_STEP_LABELS: Record<string, string> = {
  planning: '📋 分析需求...',
  building: '🔨 构建配置...',
  validating: '✅ 校验质量...',
  repairing: '🔧 自动修复...',
  human_review: '👤 等待确认...',
}

// V2 Pipeline step emoji-only (for icon slot)
const PIPELINE_STEP_EMOJI: Record<string, string> = {
  planning: '📋',
  building: '🔨',
  validating: '✅',
  repairing: '🔧',
  human_review: '👤',
}

// Get icon for workflow step type
const getStepIcon = (type: WorkflowStep['type'], isLast: boolean) => {
  if (type === 'error') return <XCircle size={14} className="text-red-500" />
  if (type === 'done') return <CheckCircle2 size={14} className="text-green-500" />
  // V2 pipeline steps always show their emoji icon
  if (type in PIPELINE_STEP_EMOJI) {
    return <span className="text-xs">{PIPELINE_STEP_EMOJI[type]}</span>
  }
  if (isLast && (type === 'generating' || type === 'thinking' || type === 'validation')) return <Loader2 size={14} className="text-purple-500 animate-spin" />
  return <CheckCircle2 size={14} className="text-green-400" />
}

const AIChatPanel: React.FC = () => {
  const { agentPanelOpen, toggleAgentPanel } = useUIStore()
  const { addComponent, setPage, currentPage } = useEditorStore()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: '你好！我是部屋 AI 助手 ✨\n我可以帮你创建二次元个人主页。\n告诉我你想要什么样的主页吧！',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [authToken, setAuthToken] = useState(api.getAuthToken() || '')
  const [showTokenInput, setShowTokenInput] = useState(!api.getAuthToken())
  const [useSSE, setUseSSE] = useState(true) // Enable SSE by default
  const [feedbackInput, setFeedbackInput] = useState<Record<string, { type: 'dislike' | 'correction'; text: string }>>({})
  const [interruptModification, setInterruptModification] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentPanelOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [agentPanelOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const appendMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, timestamp: new Date() },
    ])
  }, [])

  const updateStatusMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => msg.id === id ? { ...msg, ...updates } : msg)
    )
  }, [])

  const handleSaveToken = () => {
    if (authToken.trim()) {
      api.setAuthToken(authToken.trim())
      setShowTokenInput(false)
    }
  }

  // ─── Feedback Handlers ───────────────────────────────────────────────────

  const handleFeedback = async (messageId: string, feedbackType: 'preference' | 'dislike' | 'correction', text?: string) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return

    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    try {
      await api.submitFeedback({
        session_id: sessionId,
        feedback_text: text || (feedbackType === 'preference' ? '👍' : feedbackType === 'dislike' ? '👎' : '✏️'),
        feedback_type: feedbackType,
        user_input: msg.role === 'user' ? msg.content : undefined,
      })

      // Mark feedback given on the message
      updateStatusMessage(messageId, { feedbackGiven: feedbackType })
      // Clear feedback input if open
      setFeedbackInput(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  // ─── Interrupt Polling ───────────────────────────────────────────────────

  const pollForInterrupt = useCallback((sessionId: string) => {
    let attempts = 0
    const maxAttempts = 15 // 30 seconds at 2s interval
    const intervalMs = 2000

    const timer = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        clearInterval(timer)
        return
      }

      try {
        const result = await api.getPendingInterrupt(sessionId)
        if (result.has_pending && result.interrupt && result.interrupt.status === 'pending') {
          clearInterval(timer)
          // Find the last agent message and attach the interrupt
          setMessages(prev => {
            const lastAgentIdx = [...prev].reverse().findIndex(m => m.role === 'agent')
            if (lastAgentIdx === -1) return prev
            const realIdx = prev.length - 1 - lastAgentIdx
            return prev.map((msg, i) =>
              i === realIdx ? { ...msg, interrupt: result.interrupt! } : msg
            )
          })
        }
      } catch (err) {
        console.error('Interrupt poll error:', err)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [])

  // ─── Interrupt Confirm Handler ───────────────────────────────────────────

  const handleInterruptConfirm = async (messageId: string, action: 'approve' | 'reject', reason?: string) => {
    const sessionId = getStoredSessionId()
    if (!sessionId) return

    try {
      const result = await api.confirmInterrupt(
        sessionId,
        action,
        action === 'reject' && reason ? { reason } : null,
        reason,
      )

      // Remove interrupt from message
      updateStatusMessage(messageId, { interrupt: null })
      setInterruptModification(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })

      // If approved with a new config, apply it
      if (result.current_config) {
        const frontendConfig = backendConfigToFrontend(
          result.current_config,
          currentPage?.id,
          currentPage?.title,
        )
        setPage(frontendConfig)
        appendMessage({ role: 'agent', content: '✅ 确认完成，已更新配置！' })
      } else if (action === 'reject' && reason) {
        // Send modification as a new user message
        setInput(reason)
        setTimeout(() => handleSend(), 100)
      }
    } catch (err) {
      console.error('Interrupt confirm error:', err)
    }
  }

  // SSE streaming handler
  const handleSendSSE = async (text: string, sessionId: string | undefined, context: any) => {
    // 记录请求开始时间
    const startTime = Date.now()
    console.log(`[API] 🚀 POST /api/agent/chat/stream (SSE) | session: ${sessionId || 'new'} | msg: "${text.slice(0, 30)}..."`)

    // Create status message for workflow display
    const statusId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    appendMessage({
      role: 'status',
      content: '正在进行...',
      workflow: [],
      workflowCompleted: false,
    })

    // 超时检测
    const TIMEOUT_MS = 120_000 // 120 秒
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let readerRef: ReadableStreamDefaultReader<Uint8Array> | null = null

    try {
      const response = await fetch(`${getApiBaseUrl()}/agent/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.getAuthToken() ? { 'Authorization': `Bearer ${api.getAuthToken()}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          context,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log(`[API] ✅ 响应开始 (HTTP ${response.status}) | ${Date.now() - startTime}ms`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')
      readerRef = reader

      // 设置超时
      timeoutId = setTimeout(() => {
        console.error(`[API] ⏰ 请求超时！(${TIMEOUT_MS / 1000}s) | 耗时: ${Date.now() - startTime}ms`)
        readerRef?.cancel()
      }, TIMEOUT_MS)

      const decoder = new TextDecoder()
      let buffer = ''
      let finalData: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log(`[API] 📡 SSE 流结束 | 总耗时: ${Date.now() - startTime}ms`)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        
        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // Event type line, next line will be data
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type) {
                // Workflow step - 记录关键事件
                if (data.type === 'thinking' || data.type === 'acting' || data.type === 'observing' || data.type === 'reflection') {
                  console.log(`[API] 📡 [${data.type}] ${data.message}`)
                } else if (data.type === 'error') {
                  console.error(`[API] ❌ [error] ${data.message}`, data)
                } else if (data.type === 'generating') {
                  console.log(`[API] 📡 [${data.type}] ${data.message} (${data.data?.component_count || 0} components)`)
                }

                updateStatusMessage(statusId, {
                  workflow: [...(messages.find(m => m.id === statusId)?.workflow || []), data as WorkflowStep],
                })
              } else if (data.sessionId) {
                // Final response
                finalData = data
                storeSessionId(data.sessionId)
                const elapsed = Date.now() - startTime
                const compCount = data.currentConfig?.components?.length || 0
                console.log(`[API] ✨ 完成！耗时: ${elapsed}ms | session: ${data.sessionId} | 组件: ${compCount} 个`)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }

      // Mark workflow as completed
      updateStatusMessage(statusId, { workflowCompleted: true })

      if (finalData) {
        // Add final agent message
        if (finalData.response) {
          appendMessage({ role: 'agent', content: finalData.response })
        }

        // Apply config if present
        if (finalData.currentConfig?.components?.length > 0) {
          const frontendConfig = backendConfigToFrontend(
            finalData.currentConfig,
            currentPage?.id,
            currentPage?.title,
          )
          setPage(frontendConfig)
          appendMessage({
            role: 'agent',
            content: '✅ 已将 AI 生成的配置应用到画布！',
          })
        }

        // Add suggestions if present
        const lastWorkflowStep = finalData.workflow?.slice(-1)[0]
        if (lastWorkflowStep?.type === 'suggestion' && lastWorkflowStep?.data?.suggestions) {
          updateStatusMessage(statusId, {
            suggestions: lastWorkflowStep.data.suggestions as string[],
          })
        }

        // Poll for pending interrupts after stream ends
        if (finalData.sessionId) {
          pollForInterrupt(finalData.sessionId)
        }
      }
    } catch (err) {
      const elapsed = Date.now() - startTime
      console.error(`[API] ❌ SSE 请求失败 | 耗时: ${elapsed}ms | 错误:`, err)

      updateStatusMessage(statusId, {
        workflowCompleted: true,
        isError: true,
        content: '❌ 流式请求失败',
      })

      if (err instanceof APIClientError || (err as any)?.status === 401) {
        setShowTokenInput(true)
      }
    } finally {
      // 清除超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setIsTyping(false)
    }
  }

  // HTTP handler (fallback)
  const handleSendHTTP = async (text: string, sessionId: string | undefined, context: any) => {
    const startTime = Date.now()
    console.log(`[API] 🚀 POST /api/agent/chat (HTTP) | session: ${sessionId || 'new'} | msg: "${text.slice(0, 30)}..."`)

    try {
      const response = await api.agentChat(text, sessionId, context)

      console.log(`[API] ✅ HTTP 完成！耗时: ${Date.now() - startTime}ms | session: ${response.sessionId}`)

      if (response.sessionId) {
        storeSessionId(response.sessionId)
      }

      // Add workflow status message if workflow exists
      if (response.workflow && response.workflow.length > 0) {
        appendMessage({
          role: 'status',
          content: '处理完成',
          workflow: response.workflow as WorkflowStep[],
          workflowCompleted: true,
          suggestions: response.workflow
            .filter((s: any) => s.type === 'suggestion')
            .flatMap((s: any) => s.data?.suggestions || []),
        })
      }

      appendMessage({ role: 'agent', content: response.response })

      if (response.currentConfig && response.currentConfig.components && response.currentConfig.components.length > 0) {
        const frontendConfig = backendConfigToFrontend(
          response.currentConfig,
          currentPage?.id,
          currentPage?.title,
        )
        setPage(frontendConfig)
        appendMessage({
          role: 'agent',
          content: '✅ 已将 AI 生成的配置应用到画布！',
        })
      }

      // Handle keyword-based quick add as fallback
      if (!response.currentConfig || !response.currentConfig.components || response.currentConfig.components.length === 0) {
        const lower = text.toLowerCase()
        if (lower.includes('推') || lower.includes('oshi') || lower.includes('角色')) {
          addComponent('oshi-card')
        } else if (lower.includes('头像') || lower.includes('avatar')) {
          addComponent('avatar')
        } else if (lower.includes('属性') || lower.includes('标签')) {
          addComponent('attribute-wall')
          addComponent('tag-group')
        }
      }
    } catch (err) {
      const elapsed = Date.now() - startTime
      console.error(`[API] ❌ HTTP 请求失败 | 耗时: ${elapsed}ms | 错误:`, err)

      if (err instanceof APIClientError) {
        if (err.status === 401) {
          appendMessage({
            role: 'agent',
            content: '⚠️ 需要登录才能使用 AI 助手。请点击右上角的 🔑 输入 Auth Token。',
            isError: true,
          })
          setShowTokenInput(true)
        } else {
          appendMessage({
            role: 'agent',
            content: `❌ 请求失败：${err.message}（${err.code}）`,
            isError: true,
          })
        }
      } else {
        appendMessage({
          role: 'agent',
          content: '❌ 网络错误，请检查后端服务是否已启动（localhost:8000）。',
          isError: true,
        })
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    appendMessage({ role: 'user', content: text })
    setInput('')
    setIsTyping(true)

    const sessionId = getStoredSessionId() || undefined

    const context = currentPage
      ? {
          existingConfig: {
            version: '1.0',
            metadata: { title: currentPage.title },
            theme: { id: currentPage.theme },
            layout: { type: 'single-column', width: currentPage.canvasWidth },
            components: currentPage.components.map((comp) => ({
              id: comp.id,
              type: comp.type,
              position: { x: comp.x, y: comp.y, width: comp.width, height: comp.height, zIndex: comp.zIndex },
              props: { ...comp } as Record<string, unknown>,
            })),
          },
        }
      : undefined

    // Use SSE or HTTP based on setting
    if (useSSE) {
      await handleSendSSE(text, sessionId, context)
    } else {
      await handleSendHTTP(text, sessionId, context)
    }
  }

  // Quick suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 50)
  }

  // 引导模式状态
  const [showGuidedMode, setShowGuidedMode] = useState(false)
  const [workflowExpanded, setWorkflowExpanded] = useState<Record<string, boolean>>({})
  
  // 判断是否在编辑器模式（画布上有组件）
  const isEditorMode = currentPage && currentPage.components.length > 0
  
  // 快捷修改建议
  const quickModifySuggestions = isEditorMode ? [
    { label: '换个主题', prompt: '换个粉色主题' },
    { label: '添加推し卡', prompt: '加一个推し卡' },
    { label: '调整布局', prompt: '调整一下布局' },
    { label: '换种风格', prompt: '换一种设计风格' },
  ] : null
  
  // 如果显示引导模式，渲染引导组件
  if (showGuidedMode && agentPanelOpen) {
    return (
      <GuidedWizard
        onComplete={() => {
          setShowGuidedMode(false)
          appendMessage({
            role: 'agent',
            content: '✨ 主页已生成！你可以在编辑器中继续调整。',
          })
        }}
        onCancel={() => setShowGuidedMode(false)}
      />
    )
  }

  if (!agentPanelOpen) return null

  return (
    <div className="fixed right-0 top-12 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col z-50">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          <span className="text-sm font-medium">AI 助手</span>
          {api.getAuthToken() && (
            <span className="text-xs text-green-500 bg-green-50 px-1 rounded">已连接</span>
          )}
          {useSSE && (
            <span className="text-xs text-purple-500 bg-purple-50 px-1 rounded">实时</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* SSE toggle */}
          <button
            onClick={() => setUseSSE(!useSSE)}
            className={`p-1 rounded ${useSSE ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
            title={useSSE ? '关闭实时模式' : '开启实时模式'}
          >
            <Loader2 size={14} className={useSSE ? 'text-purple-500' : 'text-gray-400'} />
          </button>
          {/* 引导模式按钮 */}
          <button
            onClick={() => setShowGuidedMode(true)}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200 flex items-center gap-1"
            title="引导模式"
          >
            <Wand2 size={12} />
            引导模式
          </button>
          <button
            onClick={() => setShowTokenInput((v) => !v)}
            className="p-1 hover:bg-gray-100 rounded"
            title="设置 Auth Token"
          >
            <Key size={14} className={api.getAuthToken() ? 'text-green-500' : 'text-gray-400'} />
          </button>
          <button onClick={toggleAgentPanel} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Token 输入区（折叠） */}
      {showTokenInput && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">输入 Supabase Auth Token（Bearer）：</p>
          <div className="flex gap-1">
            <input
              type="password"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
              placeholder="eyJ..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
            />
            <button
              onClick={handleSaveToken}
              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin space-y-3">
        {/* 编辑器模式提示 */}
        {isEditorMode && messages.length <= 1 && (
          <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
            <Edit3 size={12} className="inline mr-1 text-purple-500" />
            <span className="text-purple-600">检测到画布上有内容，你可以通过对话进行局部修改：</span>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id}>
            {/* Status message with workflow */}
            {msg.role === 'status' && msg.workflow && (
              <div className={`rounded-lg p-2 ${msg.isError ? 'bg-red-50 border border-red-200' : 'bg-purple-50 border border-purple-200'}`}>
                {/* Expandable workflow steps */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setWorkflowExpanded(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                >
                  <span className="text-xs font-medium text-purple-600">
                    {msg.workflowCompleted ? '✨ 处理完成' : '⏳ 正在处理...'}
                  </span>
                  {workflowExpanded[msg.id] !== false && (
                    <ChevronDown size={14} className="text-purple-400" />
                  )}
                </div>
                
                {/* Workflow steps (expandable) */}
                {(workflowExpanded[msg.id] !== false) && (
                  <div className="mt-2 space-y-1">
                    {msg.workflow.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {getStepIcon(step.type, idx === msg.workflow!.length - 1)}
                        <span className={step.type === 'error' ? 'text-red-600' : 'text-gray-700'}>
                          {(PIPELINE_STEP_LABELS[step.type] ?? step.type) || step.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Suggestions */}
                {msg.workflowCompleted && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                      <Lightbulb size={12} />
                      <span>建议：</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className="px-2 py-1 text-xs bg-white border border-purple-200 rounded hover:bg-purple-100 text-purple-600"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Regular message */}
            {msg.role !== 'status' && (
              <div
                className={`agent-message ${msg.role}${msg.isError ? ' border border-red-200 bg-red-50' : ''}`}
              >
                {msg.isError && <AlertCircle size={12} className="inline mr-1 text-red-400" />}
                {msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}

                {/* Feedback buttons for agent messages */}
                {msg.role === 'agent' && !msg.isError && (
                  <div className="mt-1 pt-1 border-t border-gray-100 flex items-center gap-1">
                    {msg.feedbackGiven === 'preference' ? (
                      <span className="text-xs text-blue-500">👍</span>
                    ) : msg.feedbackGiven === 'dislike' ? (
                      <span className="text-xs text-red-400">👎 已反馈</span>
                    ) : msg.feedbackGiven === 'correction' ? (
                      <span className="text-xs text-green-500">✏️ 已反馈</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleFeedback(msg.id, 'preference')}
                          className="px-1 py-0.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="喜欢"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackInput(prev => ({
                              ...prev,
                              [msg.id]: prev[msg.id]?.type === 'dislike' ? undefined! : { type: 'dislike', text: '' },
                            }))
                          }}
                          className="px-1 py-0.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="不喜欢"
                        >
                          👎
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackInput(prev => ({
                              ...prev,
                              [msg.id]: prev[msg.id]?.type === 'correction' ? undefined! : { type: 'correction', text: '' },
                            }))
                          }}
                          className="px-1 py-0.5 text-xs text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                          title="纠正"
                        >
                          ✏️
                        </button>
                      </>
                    )}

                    {/* Inline feedback input */}
                    {feedbackInput[msg.id] && (
                      <div className="flex items-center gap-1 ml-1">
                        <input
                          type="text"
                          className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1 py-0.5"
                          placeholder={feedbackInput[msg.id].type === 'dislike' ? '哪里不好...' : '修正内容...'}
                          value={feedbackInput[msg.id].text}
                          onChange={(e) =>
                            setFeedbackInput(prev => ({
                              ...prev,
                              [msg.id]: { ...prev[msg.id], text: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && feedbackInput[msg.id].text.trim()) {
                              handleFeedback(msg.id, feedbackInput[msg.id].type, feedbackInput[msg.id].text.trim())
                            }
                            if (e.key === 'Escape') {
                              setFeedbackInput(prev => {
                                const next = { ...prev }
                                delete next[msg.id]
                                return next
                              })
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (feedbackInput[msg.id].text.trim()) {
                              handleFeedback(msg.id, feedbackInput[msg.id].type, feedbackInput[msg.id].text.trim())
                            }
                          }}
                          className="px-1 py-0.5 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                          发送
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Interrupt confirmation card */}
                {msg.role === 'agent' && msg.interrupt && msg.interrupt.status === 'pending' && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-medium text-amber-700 mb-1">👤 需要确认</div>
                    {/* Config preview summary */}
                    {msg.interrupt.data && (
                      <div className="mb-2 text-xs text-gray-600 space-y-0.5">
                        {Boolean(msg.interrupt.data.theme_name) && (
                          <div>🎨 主题: {String(msg.interrupt.data.theme_name)}</div>
                        )}
                        {Boolean(msg.interrupt.data.components) && Array.isArray(msg.interrupt.data.components) && (
                          <div>📦 组件: {(msg.interrupt.data.components as unknown[]).map(String).join(', ')}</div>
                        )}
                        {Boolean(msg.interrupt.data.colors) && typeof msg.interrupt.data.colors === 'object' && (
                          <div className="flex items-center gap-1">
                            <span>🎨</span>
                            {Object.values(msg.interrupt.data.colors as Record<string, unknown>).slice(0, 4).map((c, i) => (
                              <span key={i} className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: String(c) }} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modification input (shown when user clicks "我要修改") */}
                    {interruptModification[msg.id] !== undefined ? (
                      <div className="space-y-1">
                        <textarea
                          className="w-full text-xs border border-amber-300 rounded px-2 py-1 resize-none"
                          rows={2}
                          placeholder="输入修改意见..."
                          value={interruptModification[msg.id]}
                          onChange={(e) => setInterruptModification(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const reason = interruptModification[msg.id]?.trim()
                              if (reason) {
                                handleInterruptConfirm(msg.id, 'reject', reason)
                              }
                            }}
                            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                          >
                            提交修改
                          </button>
                          <button
                            onClick={() => {
                              setInterruptModification(prev => {
                                const next = { ...prev }
                                delete next[msg.id]
                                return next
                              })
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleInterruptConfirm(msg.id, 'approve')}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          ✅ 确认使用
                        </button>
                        <button
                          onClick={() => setInterruptModification(prev => ({ ...prev, [msg.id]: '' }))}
                          className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                        >
                          ✏️ 我要修改
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && !messages.some(m => m.role === 'status' && !m.workflowCompleted) && (
          <div className="agent-message agent">
            <span className="typewriter-cursor">正在思考...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      <div className="p-2 border-t border-gray-200 flex gap-2 flex-wrap">
        {/* 编辑器模式快捷修改 */}
        {quickModifySuggestions && quickModifySuggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              setInput(s.prompt)
              setTimeout(() => handleSend(), 100)
            }}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-600 hover:bg-purple-200 rounded flex items-center gap-1"
            disabled={isTyping}
          >
            <Palette size={10} />
            {s.label}
          </button>
        ))}
        
        {/* 默认快捷添加 */}
        {!isEditorMode && (
          <>
            <button
              onClick={() => addComponent('avatar')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Plus size={10} className="inline mr-1" />
              头像
            </button>
            <button
              onClick={() => addComponent('oshi-card')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Plus size={10} className="inline mr-1" />
              推し卡
            </button>
            <button
              onClick={() => addComponent('attribute-wall')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Plus size={10} className="inline mr-1" />
              属性墙
            </button>
            <button
              onClick={() => addComponent('hero-section')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Plus size={10} className="inline mr-1" />
              头部组件
            </button>
          </>
        )}
      </div>

      {/* 输入框 */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 property-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isEditorMode ? "输入修改指令（如：换个粉色主题）..." : "描述你想要的主页..."}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIChatPanel
