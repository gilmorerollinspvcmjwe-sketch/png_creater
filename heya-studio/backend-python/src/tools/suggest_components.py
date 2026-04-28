"""Suggest components tool - LLM recommends component combinations.

Phase 1 MVP: LLM makes choices (which components), code assembles JSON.
Key principle: LLM only outputs component type list, not full JSON.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission


# ============================================================================
# Available component types
# ============================================================================

ALL_COMPONENT_TYPES = [
    "hero-section",      # 个人简介头图
    "oshi-card",         # 推し卡片
    "attribute-wall",    # 属性墙 (MBTI/星座/血型)
    "tag-group",         # 标签组 (爱好/属性)
    "music-player",      # 音乐播放器
    "social-links",      # 社交链接
    "quote",             # 名言/签名
    "friends-list",      # 好友列表
    "media-list",        # 书影音列表
    "merchandise-card",  # 谷子/周边展示
    "guestbook",         # 访客留言板
    "watchlist",         # 追番列表
    "gallery",           # 创作画廊
    "achievement-badges",# 成就徽章
    "memorial-calendar", # 纪念日历
    "cp-card",           # CP展示卡
    "media-card",        # 书影音高级卡片
    "support-record",    # 应援记录
    "divider",           # 分割线
    "spacer",            # 间距
]


# ============================================================================
# Component descriptions for LLM prompt
# ============================================================================

COMPONENT_DESCRIPTIONS = {
    "hero-section": "个人简介头图，展示名字、头像、签名",
    "oshi-card": "推し卡片，展示喜欢的角色/偶像",
    "attribute-wall": "属性墙，展示 MBTI、星座、血型等",
    "tag-group": "标签组，展示爱好、属性标签",
    "music-player": "音乐播放器，展示喜欢的歌",
    "social-links": "社交链接，展示 Twitter/X/Bilibili 等",
    "quote": "名言/签名，展示喜欢的台词或座右铭",
    "friends-list": "好友列表，展示同好",
    "media-list": "书影音列表，展示看过的番/电影/书",
    "merchandise-card": "谷子/周边展示",
    "guestbook": "访客留言板",
    "watchlist": "追番列表",
    "gallery": "创作画廊",
    "achievement-badges": "成就徽章墙",
    "memorial-calendar": "重要纪念日历",
    "cp-card": "CP展示卡",
    "media-card": "书影音高级卡片",
    "support-record": "应援记录",
    "divider": "分割线",
    "spacer": "间距",
}


# ============================================================================
# Input / Output models
# ============================================================================

class SuggestComponentsInput(BaseModel):
    """Input for component suggestion."""
    profile: Dict[str, Any] = Field(
        ..., description="User profile (mbti, oshi, hobbies, style_preference)"
    )
    max_components: int = Field(
        default=8, ge=2, le=12, description="Max number of components to suggest"
    )
    style_hint: Optional[str] = Field(
        None, description="Optional style hint (sakura, cyberpunk, etc.)"
    )


class SuggestComponentsOutput(BaseModel):
    """Output for component suggestion."""
    component_types: List[str] = Field(
        ..., description="Recommended component type list in order"
    )
    reasoning: str = Field(default="", description="Why these components were chosen")
    confidence: float = Field(default=0.8, ge=0, le=1, description="Confidence score")


# ============================================================================
# System prompt for LLM
# ============================================================================

SUGGEST_SYSTEM_PROMPT = """你是 Heya Studio 的组件推荐专家。

你的任务是根据用户画像推荐最适合的组件组合。

可用组件类型：
{component_list}

规则：
1. 推荐 4-8 个组件
2. 组件顺序就是页面展示顺序
3. 必须包含 hero-section（个人简介）
4. 如果用户有推し，推荐 oshi-card
5. 如果用户有 MBTI，推荐 attribute-wall
6. 如果用户有爱好，推荐 tag-group
7. 根据风格偏好调整组件选择

只输出 JSON，格式：
{"component_types": ["hero-section", "oshi-card", ...], "reasoning": "..."}"""


# ============================================================================
# Tool
# ============================================================================

class SuggestComponentsTool(BaseTool[SuggestComponentsInput, SuggestComponentsOutput]):
    """Tool for suggesting component combinations based on user profile.

    LLM makes choices: which components to include and in what order.
    Output is just a list of component type strings - no JSON assembly.
    """

    name = "suggest_components"
    description = "根据用户画像推荐组件组合"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None):
        super().__init__()
        self._llm_call = llm_call

    async def execute(self, input_data: SuggestComponentsInput) -> SuggestComponentsOutput:
        """Suggest components based on profile."""
        profile = input_data.profile

        # Build prompt
        component_list = "\n".join(
            f"- {t}: {COMPONENT_DESCRIPTIONS.get(t, '')}"
            for t in ALL_COMPONENT_TYPES
        )

        # Build profile summary
        profile_parts = []
        if profile.get("mbti"):
            profile_parts.append(f"MBTI: {profile['mbti']}")
        if profile.get("oshi"):
            oshi_names = [o.get("name", "") for o in profile["oshi"]]
            profile_parts.append(f"推: {', '.join(oshi_names)}")
        if profile.get("hobbies"):
            profile_parts.append(f"爱好: {', '.join(profile['hobbies'][:5])}")
        if input_data.style_hint:
            profile_parts.append(f"风格偏好: {input_data.style_hint}")

        profile_summary = "\n".join(profile_parts) if profile_parts else "未提供具体画像"

        prompt = f"""用户画像：
{profile_summary}

请推荐 {input_data.max_components} 个组件。"""

        system = SUGGEST_SYSTEM_PROMPT.format(component_list=component_list)

        # Call LLM
        if self._llm_call:
            try:
                result = await self._llm_call(
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ]
                )

                # Parse result
                import json
                if hasattr(result, 'content'):
                    data = json.loads(result.content)
                elif isinstance(result, dict):
                    data = result
                else:
                    data = json.loads(str(result))

                types = data.get("component_types", [])
                reasoning = data.get("reasoning", "")

                # Validate component types
                valid_types = [t for t in types if t in ALL_COMPONENT_TYPES]
                invalid = [t for t in types if t not in ALL_COMPONENT_TYPES]

                if invalid:
                    # Fallback: use only valid types
                    valid_types = self._fallback_suggest(profile, input_data.max_components)
                    reasoning = f"LLM 推荐了无效组件类型: {invalid}，使用 fallback 推荐"

                # Ensure hero-section is first
                if "hero-section" not in valid_types:
                    valid_types.insert(0, "hero-section")

                return SuggestComponentsOutput(
                    component_types=valid_types[:input_data.max_components],
                    reasoning=reasoning,
                    confidence=0.9 if not invalid else 0.6,
                )

            except Exception:
                pass

        # Fallback: rule-based suggestion
        return self._fallback_suggest_output(profile, input_data.max_components)

    def _fallback_suggest(self, profile: Dict[str, Any], max_components: int) -> List[str]:
        """Rule-based fallback when LLM fails."""
        components = ["hero-section"]

        if profile.get("oshi"):
            components.append("oshi-card")

        if profile.get("mbti"):
            components.append("attribute-wall")

        if profile.get("hobbies"):
            components.append("tag-group")

        # Add common components
        components.extend(["quote", "social-links"])

        return components[:max_components]

    def _fallback_suggest_output(self, profile: Dict[str, Any], max_components: int) -> SuggestComponentsOutput:
        """Rule-based fallback output."""
        types = self._fallback_suggest(profile, max_components)
        return SuggestComponentsOutput(
            component_types=types,
            reasoning="基于规则推荐（LLM 调用失败时的 fallback）",
            confidence=0.5,
        )

    def get_input_schema(self) -> type[SuggestComponentsInput]:
        return SuggestComponentsInput

    def get_output_schema(self) -> type[SuggestComponentsOutput]:
        return SuggestComponentsOutput


# Convenience function for direct use
def suggest_components_by_profile(
    profile: Dict[str, Any],
    max_components: int = 8,
    style_hint: Optional[str] = None,
) -> List[str]:
    """Synchronous rule-based component suggestion.

    Returns list of component type strings.
    """
    tool = SuggestComponentsTool()
    # Use fallback logic directly
    return tool._fallback_suggest(profile, max_components)
