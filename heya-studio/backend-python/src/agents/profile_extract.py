"""Profile Extract Agent - Extracts user profile from conversation."""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session
from ..llm.schemas import ExtractedProfile


class ProfileExtractAgent(BaseAgent):
    """Profile extract agent."""
    
    agent_type = AgentType.PROFILE_EXTRACT
    name = "ProfileExtract Agent"
    description = "从对话中提取用户画像"
    max_iterations = 1
    timeout_ms = 3000
    
    SYSTEM_PROMPT = """你是一个用户画像提取专家。

从对话中提取用户信息：
- oshi: 推（喜欢的角色/偶像），包括 name 和可选的 from_work
- mbti: MBTI 类型
- zodiac: 星座
- blood_type: 血型
- hobbies: 爱好列表
- styles: 风格偏好
- social_links: 社交链接

注意：
- 只提取明确提到的信息，不推断
- 输出 JSON 格式
- confidence 表示提取置信度"""
    
    def get_system_prompt(self) -> str:
        return self.SYSTEM_PROMPT
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Extract profile from conversation."""
        
        # Get conversation history
        messages = session.messages[-10:] if session.messages else []
        
        # Add current input
        messages.append({"role": "user", "content": user_input})
        
        # Build prompt
        prompt_messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
        ]
        
        # Add conversation context
        conversation_str = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        prompt_messages.append({
            "role": "user",
            "content": f"从以下对话中提取用户信息：\n{conversation_str}"
        })
        
        # Call LLM
        try:
            result = await self.call_llm(prompt_messages, ExtractedProfile)
            profile = result
        except Exception:
            # Fallback to basic extraction
            profile = self._extract_basic(user_input)
        
        # Merge with existing profile
        existing = session.get_profile() or {}
        merged = self._merge_profiles(existing, profile)
        
        # Save profile
        session.save_profile(merged)
        
        return AgentResponse(
            session_id=session.id,
            response="",
            action={"type": "extract", "data": {"profile": merged}},
            state=session.state.value
        )
    
    def _extract_basic(self, user_input: str) -> Dict[str, Any]:
        """Basic rule-based extraction."""
        profile = {}
        
        import re
        
        # MBTI
        mbti_match = re.search(r'[A-Z]{4}', user_input)
        if mbti_match and mbti_match.group() in [
            "INTJ", "INTP", "ENTJ", "ENTP",
            "INFJ", "INFP", "ENFJ", "ENFP",
            "ISTJ", "ISFJ", "ESTJ", "ESFJ",
            "ISTP", "ISFP", "ESTP", "ESFP"
        ]:
            profile["mbti"] = mbti_match.group()
        
        # Oshi
        oshi_patterns = [
            r'推是(.+)',
            r'喜欢(.+)',
            r'最爱(.+)',
        ]
        for pattern in oshi_patterns:
            match = re.search(pattern, user_input)
            if match:
                oshi_name = match.group(1).strip()
                if len(oshi_name) < 20:
                    profile["oshi"] = [{"name": oshi_name}]
                break
        
        return profile
    
    def _merge_profiles(
        self,
        existing: Dict[str, Any],
        new: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge profiles."""
        merged = existing.copy()
        
        for key, value in new.items():
            if value is None:
                continue
            
            if key == "oshi":
                if "oshi" not in merged:
                    merged["oshi"] = []
                for o in value:
                    # Avoid duplicates
                    if not any(merged.get("oshi", [{}])[i].get("name") == o.get("name") for i in range(len(merged.get("oshi", [])))):
                        merged["oshi"].append(o)
            elif key in ["hobbies", "styles", "music", "anime"]:
                if key not in merged:
                    merged[key] = []
                merged[key] = list(set(merged.get(key, []) + value))
            else:
                merged[key] = value
        
        return merged