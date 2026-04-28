"""Check semantic match tool - LLM evaluates whether components match user profile.

Phase 2: Validator Agent uses this to assess if generated components
actually fit the user's persona, not just pass schema validation.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission


# ============================================================================
# Input / Output models
# ============================================================================

class SemanticMatchInput(BaseModel):
    """Input for semantic match evaluation."""
    profile: Dict[str, Any] = Field(
        ..., description="User profile (mbti, oshi, hobbies, style)"
    )
    components: List[Dict[str, Any]] = Field(
        ..., description="Generated component list"
    )
    theme_id: str = Field(default="sakura", description="Selected theme")


class ComponentMatchResult(BaseModel):
    """Match result for a single component."""
    component_type: str = Field(..., description="Component type")
    component_id: str = Field(default="", description="Component ID")
    match_score: float = Field(..., ge=0, le=10, description="Match score 0-10")
    reasoning: str = Field(default="", description="Why this score")
    suggestion: str = Field(default="", description="How to improve")


class SemanticMatchOutput(BaseModel):
    """Output for semantic match evaluation."""
    overall_score: float = Field(..., ge=0, le=10, description="Overall match score")
    component_results: List[ComponentMatchResult] = Field(
        default_factory=list, description="Per-component results"
    )
    missing_suggestions: List[str] = Field(
        default_factory=list, description="Components that should be added"
    )
    remove_suggestions: List[str] = Field(
        default_factory=list, description="Components that could be removed"
    )
    passed: bool = Field(default=True, description="Overall pass/fail (>= 6.0)")


# ============================================================================
# System prompt
# ============================================================================

EVALUATE_SYSTEM_PROMPT = """你是 Heya Studio 的配置语义评估专家。

你的任务是评估 AI 生成的组件是否与用户画像真正匹配。

评估维度：
1. **组件选择是否匹配画像** - 比如有推し应该有 oshi-card，有 MBTI 应该有 attribute-wall
2. **文案是否个性化** - 不应使用通用占位文本，应基于用户画像生成具体内容
3. **风格是否一致** - 所有组件应与选定主题风格一致
4. **组件数量是否适当** - 建议 4-8 个，太多信息过载，太少不够丰富

评分标准（每个组件 0-10）：
- 9-10: 完美匹配，文案高度个性化
- 7-8: 良好匹配，小瑕疵
- 5-6: 基本匹配，但文案或组件选择不理想
- 3-4: 匹配度低，组件或文案不适合该用户
- 0-2: 完全不匹配

整体评分 >= 6.0 通过。

请输出 JSON，格式：
{
  "overall_score": 7.5,
  "component_results": [
    {"component_type": "hero-section", "component_id": "...", "match_score": 8, "reasoning": "...", "suggestion": "..."}
  ],
  "missing_suggestions": ["建议添加 oshi-card，用户有推し"],
  "remove_suggestions": []
}"""


# ============================================================================
# Rule-based fallback evaluator (when LLM is unavailable)
# ============================================================================

RULE_COMPONENT_RELEVANCE = {
    "hero-section": 10,    # Always relevant
    "oshi-card": 9,        # Very relevant if user has oshi
    "attribute-wall": 8,   # Relevant if user has MBTI
    "tag-group": 7,        # Relevant if user has hobbies
    "quote": 7,            # Generally relevant
    "music-player": 5,     # Somewhat relevant
    "social-links": 5,     # Somewhat relevant
    "friends-list": 4,     # Less relevant
    "media-list": 5,       # Somewhat relevant
    "merchandise-card": 4,
    "guestbook": 3,
    "watchlist": 6,        # Relevant for anime fans
    "gallery": 3,
    "achievement-badges": 3,
    "memorial-calendar": 3,
    "cp-card": 3,
    "support-record": 3,
    "divider": 2,          # Structural, not content
    "spacer": 1,           # Structural
}

EXPECTED_COMPONENTS_BY_PROFILE = {
    "oshi": ["oshi-card"],
    "mbti": ["attribute-wall"],
    "hobbies": ["tag-group"],
}


def _rule_based_evaluate(
    profile: Dict[str, Any],
    components: List[Dict[str, Any]],
    theme_id: str,
) -> SemanticMatchOutput:
    """Rule-based semantic evaluation fallback."""
    component_results = []
    total_score = 0

    for comp in components:
        comp_type = comp.get("type", "unknown")
        comp_id = comp.get("id", "")

        # Base relevance score
        base_score = RULE_COMPONENT_RELEVANCE.get(comp_type, 3)

        # Adjust based on profile
        adjusted_score = base_score

        # oshi-card: should only be high if user has oshi
        if comp_type == "oshi-card":
            if profile.get("oshi"):
                adjusted_score = max(adjusted_score, 8)
            else:
                adjusted_score = min(adjusted_score, 3)

        # attribute-wall: should only be high if user has MBTI
        if comp_type == "attribute-wall":
            if profile.get("mbti"):
                adjusted_score = max(adjusted_score, 7)
            else:
                adjusted_score = min(adjusted_score, 4)

        # tag-group: should only be high if user has hobbies
        if comp_type == "tag-group":
            if profile.get("hobbies"):
                adjusted_score = max(adjusted_score, 7)
            else:
                adjusted_score = min(adjusted_score, 4)

        # Check for personalization (no generic text)
        props = comp.get("props", {})
        has_personalized_text = False
        for key, value in props.items():
            if isinstance(value, str) and len(value) > 3:
                # Check it's not just a placeholder
                if "{{" not in value and value not in [
                    "探索无限可能 ✨", "做自己，不被定义 ✨",
                    "正在播放...", "我的个人主页",
                ]:
                    has_personalized_text = True
                    break

        if has_personalized_text:
            adjusted_score = min(adjusted_score + 1, 10)

        component_results.append(ComponentMatchResult(
            component_type=comp_type,
            component_id=comp_id,
            match_score=adjusted_score,
            reasoning=f"基础相关性 {base_score}/10" + (
                "，文案已个性化 (+1)" if has_personalized_text else ""
            ),
            suggestion="" if adjusted_score >= 6 else "建议替换或删除此组件",
        ))
        total_score += adjusted_score

    # Overall score (average)
    overall_score = total_score / len(components) if components else 0

    # Check for missing components
    missing_suggestions = []
    for profile_key, expected_types in EXPECTED_COMPONENTS_BY_PROFILE.items():
        if profile.get(profile_key):
            actual_types = [c.get("type") for c in components]
            for expected in expected_types:
                if expected not in actual_types:
                    missing_suggestions.append(
                        f"建议添加 {expected}，用户有 {profile_key}"
                    )

    # Check for components to remove
    remove_suggestions = []
    for result in component_results:
        if result.match_score <= 3:
            remove_suggestions.append(
                f"组件 {result.component_type} ({result.component_id}) 匹配度低"
            )

    return SemanticMatchOutput(
        overall_score=round(overall_score, 1),
        component_results=component_results,
        missing_suggestions=missing_suggestions,
        remove_suggestions=remove_suggestions,
        passed=overall_score >= 6.0,
    )


# ============================================================================
# Tool
# ============================================================================

class CheckSemanticMatchTool(BaseTool[SemanticMatchInput, SemanticMatchOutput]):
    """Tool for evaluating whether generated components match user profile."""

    name = "check_semantic_match"
    description = "评估组件是否匹配用户画像"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None):
        super().__init__()
        self._llm_call = llm_call

    async def execute(self, input_data: SemanticMatchInput) -> SemanticMatchOutput:
        """Evaluate semantic match between components and profile."""
        # Build component summary
        comp_summary = []
        for comp in input_data.components[:10]:
            comp_summary.append({
                "type": comp.get("type"),
                "id": comp.get("id"),
                "has_text": any(
                    isinstance(v, str) and len(v) > 3
                    for v in (comp.get("props") or {}).values()
                ),
            })

        profile_summary = {
            "mbti": input_data.profile.get("mbti"),
            "oshi": input_data.profile.get("oshi"),
            "hobbies": input_data.profile.get("hobbies"),
            "style": input_data.profile.get("style_preference"),
        }

        # Try LLM evaluation
        if self._llm_call:
            try:
                result = await self._llm_call(
                    messages=[
                        {"role": "system", "content": EVALUATE_SYSTEM_PROMPT},
                        {"role": "user", "content": (
                            f"用户画像: {profile_summary}\n"
                            f"选定风格: {input_data.theme_id}\n"
                            f"组件列表:\n{comp_summary}"
                        )},
                    ]
                )

                import json
                content = result.content if hasattr(result, 'content') else str(result)
                data = json.loads(content)

                # Parse results
                component_results = [
                    ComponentMatchResult(**cr)
                    for cr in data.get("component_results", [])
                ]
                return SemanticMatchOutput(
                    overall_score=data.get("overall_score", 5.0),
                    component_results=component_results,
                    missing_suggestions=data.get("missing_suggestions", []),
                    remove_suggestions=data.get("remove_suggestions", []),
                    passed=data.get("overall_score", 0) >= 6.0,
                )

            except Exception:
                pass

        # Fallback: rule-based evaluation
        return _rule_based_evaluate(
            input_data.profile,
            input_data.components,
            input_data.theme_id,
        )

    def get_input_schema(self) -> type[SemanticMatchInput]:
        return SemanticMatchInput

    def get_output_schema(self) -> type[SemanticMatchOutput]:
        return SemanticMatchOutput


# Convenience function
def evaluate_semantic_match(
    profile: Dict[str, Any],
    components: List[Dict[str, Any]],
    theme_id: str = "sakura",
) -> SemanticMatchOutput:
    """Synchronous rule-based semantic evaluation.

    Returns SemanticMatchOutput with scores and suggestions.
    """
    return _rule_based_evaluate(profile, components, theme_id)
