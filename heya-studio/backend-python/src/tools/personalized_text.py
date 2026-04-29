"""Personalized text generation tool - LLM writes copy, not JSON.

Phase 1 MVP: LLM generates personalized text for components.
Key principle: LLM only outputs plain text, never touches JSON structure.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission


# ============================================================================
# Input / Output models
# ============================================================================

class PersonalizedTextInput(BaseModel):
    """Input for personalized text generation."""
    component_type: str = Field(..., description="Component type to generate text for")
    profile: Dict[str, Any] = Field(..., description="User profile")
    context: Optional[str] = Field(
        None, description="Additional context (e.g., skill prompt_suffix)"
    )
    max_length: int = Field(default=100, ge=10, le=500, description="Max text length")


class PersonalizedTextOutput(BaseModel):
    """Output for personalized text generation."""
    text: str = Field(..., description="Generated personalized text")
    component_type: str = Field(..., description="Component type")
    field: str = Field(default="text", description="Which prop field this text is for")


# ============================================================================
# Component-specific prompts
# ============================================================================

COMPONENT_PROMPTS = {
    "hero-section": {
        "field": "signature",
        "template": """为用户生成个人主页签名/介绍语。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 体现用户个性和风格
- 可以使用 emoji
- 避免通用模板文案

只输出签名文本，不要任何其他内容。"""
    },
    "quote": {
        "field": "text",
        "template": """为用户生成一句喜欢的名言/台词/座右铭。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 符合用户风格和个性
- 可以是动漫台词、歌词、书籍名言等
- 注明出处（如果有）

只输出名言文本，不要任何其他内容。"""
    },
    "oshi-card": {
        "field": "description",
        "template": """为用户喜欢的角色/偶像生成一段介绍文案。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 体现对推し的喜爱
- 避免过于通用的描述

只输出介绍文案，不要任何其他内容。"""
    },
    "tag-group": {
        "field": "title",
        "template": """为用户生成标签组的标题。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 简短有趣

只输出标题文本，不要任何其他内容。"""
    },
    "music-player": {
        "field": "title",
        "template": """为用户生成音乐播放器正在播放的歌曲标题。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 符合用户风格

只输出歌曲标题，不要任何其他内容。"""
    },
}

DEFAULT_PROMPT = {
    "field": "text",
    "template": """为 {component_type} 组件生成个性化文案。

用户画像：
{profile_summary}

要求：
- 长度不超过 {max_length} 字
- 个性化，避免通用模板

只输出文案文本，不要任何其他内容。"""
}


# ============================================================================
# Helper functions
# ============================================================================

def _build_profile_summary(profile: Dict[str, Any]) -> str:
    """Build human-readable profile summary."""
    parts = []

    if profile.get("mbti"):
        parts.append(f"MBTI: {profile['mbti']}")

    if profile.get("oshi"):
        oshis = profile["oshi"]
        names = [o.get("name", "") for o in oshis]
        parts.append(f"推: {', '.join(names)}")

    if profile.get("hobbies"):
        parts.append(f"爱好: {', '.join(profile['hobbies'][:5])}")

    if profile.get("style_preference"):
        parts.append(f"风格偏好: {profile['style_preference']}")

    if profile.get("signature"):
        parts.append(f"现有签名: {profile['signature']}")

    return "\n".join(parts) if parts else "未提供具体画像信息"


def _get_fallback_text(component_type: str, profile: Dict[str, Any]) -> str:
    """Generate fallback text when LLM fails."""
    oshi_name = ""
    if profile.get("oshi"):
        oshi_name = profile["oshi"][0].get("name", "推")

    mbti = profile.get("mbti", "INFP")

    fallbacks = {
        "hero-section": f"你好！我是 {mbti}，欢迎来到我的二次元世界 ✨",
        "quote": f"做自己，不被定义 ✨ —— {oshi_name if oshi_name else '未知'}",
        "oshi-card": f"最爱 {oshi_name}！Waku Waku！" if oshi_name else "这里是我的推",
        "tag-group": "我的属性标签",
        "music-player": "正在播放...",
    }

    return fallbacks.get(component_type, "个性化内容")


# ============================================================================
# Tool
# ============================================================================

class GeneratePersonalizedTextTool(BaseTool[PersonalizedTextInput, PersonalizedTextOutput]):
    """Tool for generating personalized text for components.

    LLM only outputs plain text - never JSON, never structured data.
    The text is then inserted into component props by assemble_config.
    """

    name = "generate_personalized_text"
    description = "为组件生成个性化文案"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None):
        super().__init__()
        self._llm_call = llm_call

    async def execute(self, input_data: PersonalizedTextInput) -> PersonalizedTextOutput:
        """Generate personalized text for a component."""
        comp_type = input_data.component_type
        profile = input_data.profile

        # Get prompt template
        prompt_config = COMPONENT_PROMPTS.get(comp_type, DEFAULT_PROMPT)
        field = prompt_config["field"]
        template = prompt_config["template"]

        # Build prompt
        profile_summary = _build_profile_summary(profile)
        prompt = template.format(
            component_type=comp_type,
            profile_summary=profile_summary,
            max_length=input_data.max_length,
        )

        # Add context if provided
        if input_data.context:
            prompt += f"\n\n额外风格指导：{input_data.context}"

        # Call LLM
        if self._llm_call:
            try:
                result = await self._llm_call(
                    messages=[
                        {"role": "system", "content": "你是 Heya Studio 的文案生成专家。只输出纯文本，不要 Markdown、不要 JSON、不要解释。"},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.8,
                )

                text = ""
                if hasattr(result, 'content'):
                    text = result.content.strip()
                elif isinstance(result, dict):
                    text = result.get("content", "").strip()
                elif isinstance(result, str):
                    text = result.strip()

                # Clean up
                text = text.strip('"\'').strip()

                # Truncate if too long
                if len(text) > input_data.max_length:
                    text = text[:input_data.max_length].rsplit(" ", 1)[0] + "..."

                if text:
                    return PersonalizedTextOutput(
                        text=text,
                        component_type=comp_type,
                        field=field,
                    )

            except Exception:
                pass

        # Fallback
        fallback_text = _get_fallback_text(comp_type, profile)
        return PersonalizedTextOutput(
            text=fallback_text,
            component_type=comp_type,
            field=field,
        )

    def get_input_schema(self) -> type[PersonalizedTextInput]:
        return PersonalizedTextInput

    def get_output_schema(self) -> type[PersonalizedTextOutput]:
        return PersonalizedTextOutput


# Convenience function for direct use
def generate_text(
    component_type: str,
    profile: Dict[str, Any],
    context: Optional[str] = None,
    max_length: int = 100,
) -> str:
    """Synchronous fallback text generation.

    Returns plain text string.
    """
    return _get_fallback_text(component_type, profile)
