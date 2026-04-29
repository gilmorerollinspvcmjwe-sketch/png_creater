"""Component Search Agent - Searches components and templates."""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session


class ComponentSearchAgent(BaseAgent):
    """Component search agent."""
    
    agent_type = AgentType.COMPONENT_SEARCH
    name = "ComponentSearch Agent"
    description = "搜索组件库和模板"
    max_iterations = 2
    timeout_ms = 5000
    
    SYSTEM_PROMPT = """你是一个组件库搜索助手。

根据用户画像推荐合适的组件：
- hero-section: 头部区域（头像+名称+签名）
- oshi-card: 推し展示卡
- attribute-wall: 属性墙（MBTI/星座/血型）
- tag-group: 标签组（爱好/关键词）
- music-player: 音乐播放器
- social-links: 社交链接
- quote: 特色引言
- friends-list: 友人帐

根据用户信息推荐：
- 有推 → 推荐 oshi-card
- 有 MBTI → 推荐 attribute-wall
- 有爱好 → 推荐 tag-group
- 有音乐兴趣 → 推荐 music-player"""
    
    def get_system_prompt(self) -> str:
        return self.SYSTEM_PROMPT
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Search components."""
        
        profile = context.get("profile", session.get_profile()) or {}
        keywords = context.get("keywords", [])
        
        # Search components
        from ..tools.components import SearchComponentsTool
        search_tool = SearchComponentsTool()
        
        # Build search query
        query = user_input if user_input else ""
        if keywords:
            query = " ".join(keywords)
        elif profile.get("hobbies"):
            query = " ".join(profile.get("hobbies", [])[:3])
        
        if not query:
            query = "anime"
        
        result = await search_tool.execute({
            "query": query,
            "limit": 10
        })
        
        # Search templates
        from ..tools.templates import QueryTemplatesTool
        template_tool = QueryTemplatesTool()
        
        style = profile.get("style_preference", "")
        template_result = await template_tool.execute({
            "query": style or query,
            "style": style if style in ["sakura", "lavender", "mint", "cream", "night", "pixel", "mono"] else None,
            "limit": 5
        })
        
        # Recommend based on profile
        recommendations = self._recommend_from_profile(profile, result.components)
        
        return AgentResponse(
            session_id=session.id,
            response="",
            action={
                "type": "search",
                "data": {
                    "components": [c.model_dump() for c in result.components],
                    "templates": [t.model_dump() for t in template_result.templates],
                    "recommendations": recommendations
                }
            },
            state=session.state.value
        )
    
    def _recommend_from_profile(
        self,
        profile: Dict[str, Any],
        components: List[Any]
    ) -> List[Dict[str, Any]]:
        """Recommend components based on profile."""
        recommendations = []
        
        # Always recommend hero-section
        recommendations.append({
            "type": "hero-section",
            "reason": "头部区域是必须的",
            "priority": 1
        })
        
        # Recommend based on profile
        if profile.get("oshi"):
            recommendations.append({
                "type": "oshi-card",
                "reason": "你有推，可以展示",
                "priority": 2
            })
        
        if profile.get("mbti"):
            recommendations.append({
                "type": "attribute-wall",
                "reason": "展示你的 MBTI 和其他属性",
                "priority": 3
            })
        
        if profile.get("hobbies"):
            recommendations.append({
                "type": "tag-group",
                "reason": "展示你的爱好标签",
                "priority": 4
            })
        
        if profile.get("music") or profile.get("interests", {}).get("music"):
            recommendations.append({
                "type": "music-player",
                "reason": "展示你喜欢音乐",
                "priority": 5
            })
        
        return recommendations