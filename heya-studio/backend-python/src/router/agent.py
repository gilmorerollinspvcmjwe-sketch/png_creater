"""Router Agent - Intent classification and routing.

PHASE 1 UPDATED: Uses real LLM for intent classification.
Keywords retained as fast-cache for high-confidence patterns only.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session, SessionState
from ..llm.schemas import IntentType
from ..prompts import ROUTER_SYSTEM_PROMPT


class Intent(str, Enum):
    """User intent types."""
    NEW_PAGE = "new_page"
    MODIFY_PAGE = "modify_page"
    CHAT = "chat"


# High-confidence keywords that bypass LLM (very explicit intent)
FAST_CACHE_KEYWORDS = {
    "生成": ("new_page", 0.98),
    "创建": ("new_page", 0.98),
    "做一个": ("new_page", 0.98),
    "做": ("new_page", 0.85),
    "帮我生成": ("new_page", 0.99),
    "帮我做": ("new_page", 0.99),
    "帮我创建": ("new_page", 0.99),
    "换成": ("modify_page", 0.97),
    "把": ("modify_page", 0.85),
    "修改": ("modify_page", 0.97),
    "改": ("modify_page", 0.80),
    "调整": ("modify_page", 0.90),
    "优化": ("modify_page", 0.90),
}


class RouterAgent(BaseAgent):
    """Router agent for intent classification."""
    
    agent_type = AgentType.ROUTER
    name = "Router Agent"
    description = "分析用户意图并路由到专业 Agent"
    max_iterations = 1
    timeout_ms = 5000
    
    def get_system_prompt(self) -> str:
        return ROUTER_SYSTEM_PROMPT
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Route user input to appropriate agent."""
        
        # === FAST CACHE: check for very high-confidence keywords ===
        fast_intent = self._fast_cache_check(user_input)
        use_fast = fast_intent and fast_intent[1] >= 0.95
        
        # Always call LLM for context extraction (profile data)
        # Fast cache only bypasses the intent classification, not context extraction
        messages = [
            {"role": "system", "content": self.get_system_prompt()},
            {"role": "user", "content": user_input},
        ]
        
        # Add conversation history for better context
        if session.messages:
            recent = session.messages[-5:]
            history = "\n".join([f"{m.role}: {m.content}" for m in recent])
            messages.append({
                "role": "user",
                "content": f"最近的对话历史：\n{history}"
            })
        
        try:
            intent_result = await self.call_llm(messages, IntentType)
            
            # If fast cache hit, override intent but KEEP LLM-extracted context
            if use_fast:
                intent_result.intent = fast_intent[0]
                intent_result.confidence = fast_intent[1]
            
            # Validate the result
            if intent_result.intent not in ["new_page", "modify_page", "chat"]:
                intent_result.intent = "chat"
                intent_result.confidence = 0.5
                
        except Exception as e:
            # Fallback to keyword matching if LLM fails
            if use_fast:
                intent_result = IntentType(
                    intent=fast_intent[0],
                    confidence=fast_intent[1],
                    extracted_context=self._extract_context_quick(user_input)
                )
            else:
                kw_intent = self._keyword_fallback(user_input)
                intent_result = IntentType(
                    intent=kw_intent,
                    confidence=0.6,
                    extracted_context=self._extract_context_quick(user_input)
                )
        
        # Update session state based on intent
        if intent_result.intent == "new_page":
            session.state = SessionState.COLLECTING
        elif intent_result.intent == "modify_page":
            session.state = SessionState.ITERATING
        
        # Merge extracted context into profile
        # Be flexible with field names - LLM may use aliases
        if intent_result.extracted_context:
            profile = session.get_profile() or {}
            ctx = intent_result.extracted_context
            
            # MBTI (handle aliases: mbti, personality_type, personality)
            for key in ["mbti", "personality_type", "personality"]:
                if ctx.get(key):
                    profile["mbti"] = ctx[key]
                    break
            
            # Oshi (handle aliases: oshi, favorite_character, favorite_characters, character)
            for key in ["oshi", "favorite_character", "favorite_characters", "character"]:
                if ctx.get(key):
                    val = ctx[key]
                    if isinstance(val, str):
                        val = [{"name": val}]
                    elif isinstance(val, list):
                        normalized = []
                        for item in val:
                            if isinstance(item, str):
                                normalized.append({"name": item})
                            elif isinstance(item, dict):
                                normalized.append(item)
                        val = normalized
                    profile.setdefault("oshi", [])
                    existing_names = [x.get("name") for x in profile["oshi"]]
                    for o in val:
                        if o.get("name") and o["name"] not in existing_names:
                            profile["oshi"].append(o)
                            existing_names.append(o["name"])
                    break
            
            # Style preference
            for key in ["style_preference", "style", "theme"]:
                if ctx.get(key):
                    profile["style_preference"] = ctx[key]
                    break
            
            # Hobbies
            for key in ["hobbies", "interests", "likes"]:
                if ctx.get(key):
                    profile["hobbies"] = ctx[key]
                    break
            
            session.save_profile(profile)
            from ..utils.logger import logger
            logger.debug("Router updated profile", profile=str(profile))
        
        # Return routing result
        return AgentResponse(
            session_id=session.id,
            response="",  # Router doesn't respond directly
            action={
                "type": "route",
                "data": {
                    "intent": intent_result.intent,
                    "target_agent": intent_result.intent,
                    "confidence": intent_result.confidence,
                    "extracted_context": intent_result.extracted_context or {}
                }
            },
            state=session.state.value
        )
    
    def _fast_cache_check(self, user_input: str) -> Optional[tuple]:
        """Check for very high-confidence keywords. Returns (intent, confidence) or None."""
        for kw, (intent, confidence) in FAST_CACHE_KEYWORDS.items():
            if kw in user_input:
                return (intent, confidence)
        return None
    
    def _keyword_fallback(self, user_input: str) -> str:
        """Fallback keyword matching when LLM fails."""
        user_input_lower = user_input.lower()
        
        for kw in ["改", "换", "变", "修改", "换成", "调整"]:
            if kw in user_input_lower:
                return "modify_page"
        
        for kw in ["生成", "创建", "做一个", "帮我做", "想要", "生成一个"]:
            if kw in user_input_lower:
                return "new_page"
        
        return "chat"
    
    def _extract_context_quick(self, user_input: str) -> Dict[str, Any]:
        """Quick context extraction from input (LLM fallback only)."""
        context = {}
        
        import re
        
        # MBTI pattern
        mbti_match = re.search(r'\b[A-Z]{4}\b', user_input)
        if mbti_match and mbti_match.group() in [
            "INTJ", "INTP", "ENTJ", "ENTP",
            "INFJ", "INFP", "ENFJ", "ENFP",
            "ISTJ", "ISFJ", "ESTJ", "ESFJ",
            "ISTP", "ISFP", "ESTP", "ESFP"
        ]:
            context["mbti"] = mbti_match.group()
        
        # Style keywords
        styles = {"樱花": "樱花风", "赛博": "赛博风", "薰衣草": "薰衣草", "薄荷": "薄荷风", "极简": "极简风"}
        for kw, style in styles.items():
            if kw in user_input:
                context["style_preference"] = style
                break
        
        # Oshi (推) pattern - basic fallback
        oshi_patterns = [
            r'推是(.+?)(?:，|,|。|\s|$)',
            r'最喜欢(.+?)(?:，|,|。|\s|$)',
        ]
        for pattern in oshi_patterns:
            match = re.search(pattern, user_input)
            if match:
                oshi_name = match.group(1).strip()
                if len(oshi_name) < 20 and len(oshi_name) > 0:
                    context["oshi"] = [{"name": oshi_name}]
                    break
        
        return context
