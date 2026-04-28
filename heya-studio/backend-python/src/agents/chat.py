"""Chat Agent - Handles casual conversation.

PHASE 1 UPDATED: Uses real LLM for natural conversation.
FAQ dictionary retained for quick responses on common questions.
"""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session
from ..prompts import CHAT_SYSTEM_PROMPT


# FAQ quick responses (bypass LLM for very common questions)
FAQ_RESPONSES = {
    "你好": "你好呀！(◕‿◕) 我是 Heya Studio 的 AI 助手，想帮你做一个漂亮的个人主页。",
    "是什么": "Heya Studio 是一个二次元风格的个人主页生成器。告诉我你的推、MBTI、爱好，我来帮你设计独一无二的主页 ✨",
    "怎么用": "很简单！告诉我你的推（最喜欢的角色/偶像）、MBTI、爱好，还有喜欢的风格，我就能帮你生成一个超可爱的主页 (◕‿◕)",
    "支持什么": "我们支持樱花萌系、赛博朋克、薰衣草温柔、薄荷清新、极简黑白等多种风格，每种都有独特的配色和特效 ✨",
    "帮助": "有什么想问的吗？我可以帮你生成个人主页，或者聊聊二次元相关的话题 (◕‿◕)",
}


class ChatAgent(BaseAgent):
    """Chat agent for casual conversation."""
    
    agent_type = AgentType.CHAT
    name = "Chat Agent"
    description = "闲聊和FAQ回答"
    max_iterations = 3
    timeout_ms = 10000
    
    def get_system_prompt(self) -> str:
        return CHAT_SYSTEM_PROMPT
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Handle chat conversation."""
        
        # === FAQ quick check (fast path) ===
        faq_response = self._check_faq(user_input)
        if faq_response:
            return AgentResponse(
                session_id=session.id,
                response=faq_response,
                suggestions=[
                    {"type": "template", "name": "樱花萌系模板", "description": "温柔浪漫的粉色系"},
                    {"type": "template", "name": "赛博朋克模板", "description": "酷炫科技风"},
                ],
                action={"type": "chat", "data": {"source": "faq"}},
                state=session.state.value if session else "initial"
            )
        
        # === LLM PATH: real conversation ===
        messages = [
            {"role": "system", "content": self.get_system_prompt()},
        ]
        
        # Add conversation history
        if session.messages:
            recent = session.messages[-10:]
            for msg in recent:
                messages.append({"role": msg.role, "content": msg.content})
        else:
            messages.append({"role": "user", "content": user_input})
        
        try:
            response = await self.call_llm(messages)
            content = response.get("content", "")
            
            # Check if the LLM suggests redirecting to design
            should_redirect = any(kw in content for kw in ["生成", "创建", "主页"])
            
            suggestions = [
                {"type": "template", "name": "樱花萌系模板", "description": "温柔浪漫的粉色系"},
                {"type": "template", "name": "赛博朋克模板", "description": "酷炫科技风"},
            ]
            
            return AgentResponse(
                session_id=session.id,
                response=content,
                suggestions=suggestions,
                action={"type": "chat", "data": {
                    "source": "llm",
                    "should_redirect": should_redirect
                }},
                state=session.state.value if session else "initial"
            )
            
        except Exception as e:
            # Fallback to default friendly response
            return AgentResponse(
                session_id=session.id,
                response=f"嗯嗯，有什么想聊的吗？或者想让我帮你生成一个主页？(◕‿◕)\n（AI 回复暂时不可用：{str(e)[:50]}）",
                suggestions=[
                    {"type": "template", "name": "樱花萌系模板", "description": "温柔浪漫的粉色系"},
                    {"type": "template", "name": "赛博朋克模板", "description": "酷炫科技风"},
                ],
                action={"type": "chat", "data": {"source": "fallback"}},
                state=session.state.value if session else "initial"
            )
    
    def _check_faq(self, user_input: str) -> Optional[str]:
        """Check FAQ responses."""
        user_input_lower = user_input.lower()
        
        for keyword, response in FAQ_RESPONSES.items():
            if keyword in user_input_lower:
                return response
        
        return None
