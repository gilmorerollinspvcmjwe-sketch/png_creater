"""LLM semantic validator tool - LLM-driven semantic validation.

Phase 4: Enhances L2 validation with LLM holistic judgment.
Detects theme mismatches, missing components, and content personalization issues.
"""

import json
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission
from ..models.validation import SemanticValidationResult, SemanticIssue
from ..models.page import BackendPageConfig


# ============================================================================
# Input model
# ============================================================================

class SemanticValidatorInput(BaseModel):
    """Input for LLM semantic validation."""
    config: Dict[str, Any] = Field(..., description="Page configuration to validate")
    user_input: str = Field(..., description="Original user input")
    profile: Optional[Dict[str, Any]] = Field(
        None, description="User profile (mbti, oshi, hobbies, style_preference)"
    )


# ============================================================================
# System prompt
# ============================================================================

SEMANTIC_VALIDATOR_PROMPT = """你是 Heya Studio 的配置语义校验专家。

你的任务是评估 AI 生成的页面配置是否与用户需求语义匹配。

## 评估维度
1. **主题匹配** — 主题是否与用户描述和画像匹配？
2. **组件完整** — 关键组件是否缺失？（如用户有推し但无 oshi-card）
3. **内容个性化** — 文案是否个性化，还是通用占位文本？
4. **整体协调** — 组件数量、风格、布局是否协调？

## 评分标准
- score: 0-100，>=60 通过
- 90-100: 完美匹配
- 70-89: 良好，小问题
- 60-69: 基本通过，有改进空间
- 0-59: 不通过，需要修复

## 输出格式 (JSON)
{{
  "score": 75,
  "passed": true,
  "issues": [
    {{
      "severity": "medium",
      "category": "content_mismatch",
      "message": "hero-section 标题是通用占位文本",
      "suggestion": "根据用户推し生成个性化标题"
    }}
  ],
  "good_aspects": [
    "主题选择与用户画像匹配",
    "组件选择合理"
  ]
}}

## issue.category 常用值
- theme_mismatch: 主题不匹配用户偏好
- missing_component: 缺少关键组件
- content_mismatch: 内容/文案不个性化
- layout_issue: 布局不合理
- style_inconsistency: 风格不一致"""


# ============================================================================
# Tool
# ============================================================================

class LLMSemanticValidator(BaseTool[SemanticValidatorInput, SemanticValidationResult]):
    """Tool for LLM-driven semantic validation.

    Evaluates whether the generated page config semantically matches
    the user's intent, profile, and preferences.
    """

    name = "semantic_validation"
    description = "LLM 语义校验：评估配置是否语义匹配用户需求"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None, mock: bool = False):
        super().__init__()
        self._llm_call = llm_call
        self._mock = mock

    async def execute(self, input_data: SemanticValidatorInput) -> SemanticValidationResult:
        """Validate config semantically."""
        # 1. Mock mode
        if self._mock:
            return self._mock_validate(input_data)

        # 2. Try LLM
        if self._llm_call:
            try:
                result = await self._llm_validate(input_data)
                if result is not None:
                    return result
            except Exception:
                pass

        # 3. Fallback to rule-based
        return self._rule_based_validate(input_data)

    async def _llm_validate(self, input_data: SemanticValidatorInput) -> Optional[SemanticValidationResult]:
        """Use LLM for semantic validation."""
        config = input_data.config
        components = config.get("components", [])
        theme_id = config.get("theme", {}).get("id", "unknown")

        # Build component summary
        comp_summary = []
        for comp in components:
            props = comp.get("props", {})
            has_personalized = any(
                isinstance(v, str) and len(v) > 3 and "{{" not in v
                for v in props.values()
            )
            comp_summary.append({
                "type": comp.get("type"),
                "id": comp.get("id"),
                "has_personalized_text": has_personalized,
            })

        # Build profile summary
        profile = input_data.profile or {}
        profile_summary = {
            "mbti": profile.get("mbti"),
            "oshi": [o.get("name") for o in profile.get("oshi", [])] if profile.get("oshi") else None,
            "hobbies": profile.get("hobbies"),
            "style_preference": profile.get("style_preference"),
        }

        user_msg = (
            f"用户输入: {input_data.user_input}\n"
            f"用户画像: {json.dumps(profile_summary, ensure_ascii=False)}\n"
            f"选定主题: {theme_id}\n"
            f"组件列表: {json.dumps(comp_summary, ensure_ascii=False)}"
        )

        response = await self._llm_call(
            messages=[
                {"role": "system", "content": SEMANTIC_VALIDATOR_PROMPT},
                {"role": "user", "content": user_msg},
            ]
        )

        content = response.content if hasattr(response, "content") else str(response)
        json_str = self._extract_json(content)
        data = json.loads(json_str)

        issues = [
            SemanticIssue(**issue)
            for issue in data.get("issues", [])
        ]

        return SemanticValidationResult(
            score=data.get("score", 50),
            passed=data.get("passed", data.get("score", 50) >= 60),
            issues=issues,
            good_aspects=data.get("good_aspects", []),
        )

    def _mock_validate(self, input_data: SemanticValidatorInput) -> SemanticValidationResult:
        """Mock mode: return deterministic validation result."""
        config = input_data.config
        components = config.get("components", [])
        theme_id = config.get("theme", {}).get("id", "")
        profile = input_data.profile or {}

        issues: List[SemanticIssue] = []
        good_aspects: List[str] = []

        # Check theme mismatch
        style_pref = profile.get("style_preference", "")
        if "赛博" in style_pref and theme_id not in ("night", "cyberpunk"):
            issues.append(SemanticIssue(
                severity="high",
                category="theme_mismatch",
                message="[mock] 用户偏好赛博风格但主题不匹配",
                suggestion="建议切换到赛博朋克主题",
            ))

        # Check missing oshi-card
        comp_types = [c.get("type") for c in components]
        if profile.get("oshi") and "oshi-card" not in comp_types:
            issues.append(SemanticIssue(
                severity="high",
                category="missing_component",
                message="[mock] 用户有推し但缺少 oshi-card",
                suggestion="建议添加 oshi-card 组件",
            ))

        # Good aspects
        if "hero-section" in comp_types:
            good_aspects.append("[mock] 包含 hero-section，有首屏视觉焦点")

        score = 85 if len(issues) == 0 else 60 - len(issues) * 15
        passed = score >= 60

        return SemanticValidationResult(
            score=max(score, 0),
            passed=passed,
            issues=issues,
            good_aspects=good_aspects,
        )

    def _rule_based_validate(self, input_data: SemanticValidatorInput) -> SemanticValidationResult:
        """Rule-based fallback when LLM is unavailable."""
        config = input_data.config
        components = config.get("components", [])
        theme_id = config.get("theme", {}).get("id", "")
        profile = input_data.profile or {}

        issues: List[SemanticIssue] = []
        good_aspects: List[str] = []
        comp_types = [c.get("type") for c in components]

        # Check theme match with style preference
        style_pref = profile.get("style_preference", "")
        style_theme_map = {
            "樱花": "sakura", "赛博": "night", "薰衣草": "lavender",
            "薄荷": "mint", "极简": "mono", "像素": "pixel",
        }
        for keyword, expected_theme in style_theme_map.items():
            if keyword in style_pref and theme_id != expected_theme:
                issues.append(SemanticIssue(
                    severity="medium",
                    category="theme_mismatch",
                    message=f"用户偏好 '{keyword}' 风格，但当前主题是 {theme_id}",
                    suggestion=f"建议切换到 {expected_theme} 主题",
                ))
                break

        # Check missing components
        if profile.get("oshi") and "oshi-card" not in comp_types:
            issues.append(SemanticIssue(
                severity="high",
                category="missing_component",
                message="用户有推し信息但缺少 oshi-card 组件",
                suggestion="建议添加 oshi-card 组件",
            ))
        if profile.get("mbti") and "attribute-wall" not in comp_types:
            issues.append(SemanticIssue(
                severity="medium",
                category="missing_component",
                message="用户有 MBTI 信息但缺少 attribute-wall 组件",
                suggestion="建议添加 attribute-wall 组件",
            ))

        # Check for placeholder text
        placeholder_count = 0
        for comp in components:
            for value in (comp.get("props") or {}).values():
                if isinstance(value, str) and "{{" in value:
                    placeholder_count += 1
                    break
        if placeholder_count > 0:
            issues.append(SemanticIssue(
                severity="medium",
                category="content_mismatch",
                message=f"{placeholder_count} 个组件包含未填充的占位符",
                suggestion="建议使用个性化文案替换占位符",
            ))

        # Good aspects
        if "hero-section" in comp_types:
            good_aspects.append("包含 hero-section，有首屏视觉焦点")
        if len(components) >= 3:
            good_aspects.append(f"包含 {len(components)} 个组件，内容丰富")

        score = 85 - len(issues) * 12
        passed = score >= 60

        return SemanticValidationResult(
            score=max(score, 0),
            passed=passed,
            issues=issues,
            good_aspects=good_aspects,
        )

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON from LLM response."""
        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1)
        match = re.search(r"(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})", text, re.DOTALL)
        if match:
            return match.group(1)
        return text

    def get_input_schema(self) -> type[SemanticValidatorInput]:
        return SemanticValidatorInput

    def get_output_schema(self) -> type[SemanticValidationResult]:
        return SemanticValidationResult
