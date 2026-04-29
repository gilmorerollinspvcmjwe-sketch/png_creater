"""Layout strategy tool - LLM-driven high-level layout strategy.

Phase 4: LLM decides 'how to arrange' (layout strategy),
code decides 'exact positions' (coordinate calculation).
"""

import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission
from ..models.layout import LayoutStrategy


# ============================================================================
# Input model
# ============================================================================

class LayoutStrategyInput(BaseModel):
    """Input for layout strategy generation."""
    user_input: str = Field(..., description="User's natural language input")
    component_types: List[str] = Field(
        ..., description="List of component types in the page"
    )
    theme_id: str = Field(default="sakura", description="Selected theme ID")


# ============================================================================
# System prompt
# ============================================================================

LAYOUT_STRATEGY_PROMPT = """你是 Heya Studio 的布局策略专家。

你的任务是根据用户意图和组件列表，选择最合适的布局策略。

## 布局策略类型

1. **hero-first** — 首屏大图/hero，其他内容在下方。适合：个人品牌展示、首屏冲击力。
2. **gallery-grid** — 等宽网格排列。适合：展示照片、作品集、多卡片。
3. **asymmetric** — 不对称布局，打破视觉平衡。适合：艺术感、创意展示、叛逆风格。
4. **centerpiece** — 一个核心组件居中突出，其他围绕排列。适合：突出推し/角色、主次分明。
5. **magazine** — 杂志式多栏布局。适合：内容丰富、分类展示。
6. **timeline** — 时间线/纵向流式。适合：记录、历程、成长。
7. **minimal-list** — 极简列表，大量留白。适合：极简风格、少量内容。

## 选择规则
1. 用户明确要求"突出XX" → centerpiece
2. 用户要"展示照片/作品" → gallery-grid
3. 用户要"记录/历程" → timeline
4. 用户要"极简/简洁" → minimal-list
5. 用户要"创意/艺术" → asymmetric
6. 有 hero-section 且内容不多 → hero-first
7. 内容丰富多样 → magazine
8. 默认 → centerpiece

## 输出格式 (JSON)
{{
  "type": "centerpiece",
  "primary_component": "oshi-card",
  "spacing": "normal",
  "symmetry": "symmetric",
  "alignment": "center",
  "responsive_behavior": "reflow-columns",
  "reason": "用户希望突出推し角色，centerpiece 将 oshi-card 居中放大"
}}"""


# ============================================================================
# Tool
# ============================================================================

class LayoutStrategyTool(BaseTool[LayoutStrategyInput, LayoutStrategy]):
    """Tool for LLM-driven layout strategy generation.

    LLM decides the high-level layout strategy (how to arrange),
    then auto_layout.py applies the strategy to calculate exact positions.
    """

    name = "generate_layout_strategy"
    description = "根据用户意图和组件列表，生成布局策略"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None, mock: bool = False):
        super().__init__()
        self._llm_call = llm_call
        self._mock = mock

    async def execute(self, input_data: LayoutStrategyInput) -> LayoutStrategy:
        """Generate layout strategy based on user input and components."""
        # 1. Mock mode
        if self._mock:
            return self._mock_strategy(input_data)

        # 2. Try LLM
        if self._llm_call:
            try:
                result = await self._llm_strategy(input_data)
                if result is not None:
                    return result
            except Exception:
                pass

        # 3. Fallback to rule-based
        return self._rule_based_strategy(input_data)

    async def _llm_strategy(self, input_data: LayoutStrategyInput) -> Optional[LayoutStrategy]:
        """Use LLM to generate layout strategy."""
        user_msg = (
            f"用户输入: {input_data.user_input}\n"
            f"组件列表: {json.dumps(input_data.component_types, ensure_ascii=False)}\n"
            f"主题: {input_data.theme_id}"
        )

        response = await self._llm_call(
            messages=[
                {"role": "system", "content": LAYOUT_STRATEGY_PROMPT},
                {"role": "user", "content": user_msg},
            ]
        )

        content = response.content if hasattr(response, "content") else str(response)
        json_str = self._extract_json(content)
        data = json.loads(json_str)

        strategy = LayoutStrategy.model_validate(data)
        return strategy

    def _mock_strategy(self, input_data: LayoutStrategyInput) -> LayoutStrategy:
        """Mock mode: return deterministic strategy based on input."""
        text = input_data.user_input.lower()
        comp_types = input_data.component_types

        if "突出" in text or "推し" in text or "中心" in text:
            primary = "oshi-card" if "oshi-card" in comp_types else comp_types[0] if comp_types else None
            return LayoutStrategy(
                type="centerpiece",
                primary_component=primary,
                spacing="normal",
                symmetry="symmetric",
                alignment="center",
                responsive_behavior="reflow-columns",
                reason="[mock] 用户希望突出核心内容",
            )

        if "照片" in text or "作品" in text or "展示" in text or "画廊" in text:
            return LayoutStrategy(
                type="gallery-grid",
                spacing="normal",
                symmetry="symmetric",
                alignment="center",
                responsive_behavior="reflow-columns",
                reason="[mock] 用户要展示照片/作品",
            )

        return LayoutStrategy(
            type="centerpiece",
            primary_component=comp_types[0] if comp_types else None,
            spacing="normal",
            symmetry="symmetric",
            alignment="center",
            responsive_behavior="reflow-columns",
            reason="[mock] 默认居中布局",
        )

    def _rule_based_strategy(self, input_data: LayoutStrategyInput) -> LayoutStrategy:
        """Rule-based fallback when LLM is unavailable."""
        text = input_data.user_input
        comp_types = input_data.component_types

        # Keyword-based routing
        if any(kw in text for kw in ["突出", "推し", "中心", "重点", "显眼"]):
            primary = "oshi-card" if "oshi-card" in comp_types else None
            return LayoutStrategy(
                type="centerpiece",
                primary_component=primary,
                reason="用户希望突出核心内容",
            )
        if any(kw in text for kw in ["照片", "作品", "展示", "画廊", "图片"]):
            return LayoutStrategy(
                type="gallery-grid",
                reason="用户要展示照片/作品集",
            )
        if any(kw in text for kw in ["记录", "历程", "时间线", "成长"]):
            return LayoutStrategy(
                type="timeline",
                reason="用户要展示时间线/历程",
            )
        if any(kw in text for kw in ["极简", "简洁", "简单", "留白"]):
            return LayoutStrategy(
                type="minimal-list",
                spacing="loose",
                reason="用户偏好极简风格",
            )
        if any(kw in text for kw in ["创意", "艺术", "不对称", "打破"]):
            return LayoutStrategy(
                type="asymmetric",
                symmetry="asymmetric",
                reason="用户偏好创意/艺术风格",
            )

        # Default: centerpiece if there's an oshi-card
        if "oshi-card" in comp_types:
            return LayoutStrategy(
                type="centerpiece",
                primary_component="oshi-card",
                reason="推し卡片适合居中突出",
            )

        return LayoutStrategy(
            type="gallery-grid",
            reason="默认等宽网格布局",
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

    def get_input_schema(self) -> type[LayoutStrategyInput]:
        return LayoutStrategyInput

    def get_output_schema(self) -> type[LayoutStrategy]:
        return LayoutStrategy
