"""Theme matcher tool - LLM-driven semantic style mapping.

Phase 4: Replaces hardcoded MBTI_THEME_MAP with LLM semantic reasoning.
Matches user input + MBTI to the best theme, with caching and fallback.
"""

import time
import hashlib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission
from ..models.theme import ThemeMatchResult, ThemeAlternative


# ============================================================================
# Available themes registry
# ============================================================================

THEME_CATALOG: Dict[str, Dict[str, str]] = {
    "sakura": {
        "name": "樱花粉",
        "description": "浪漫温柔的樱花粉色主题，适合甜美系",
        "vibe": "温柔、浪漫、甜美",
    },
    "cyberpunk": {
        "name": "赛博朋克",
        "description": "霓虹高对比的赛博朋克主题，酷炫前卫",
        "vibe": "酷炫、前卫、高对比",
    },
    "lavender": {
        "name": "薰衣草紫",
        "description": "安静优雅的薰衣草紫色主题，宁静内敛",
        "vibe": "安静、优雅、内敛",
    },
    "mint": {
        "name": "薄荷绿",
        "description": "清新自然的薄荷绿色主题，活力十足",
        "vibe": "清新、自然、活力",
    },
    "minimal": {
        "name": "极简黑白",
        "description": "极简黑白主题，干净利落",
        "vibe": "简约、干净、利落",
    },
    "merry-christmas": {
        "name": "圣诞红绿",
        "description": "圣诞红绿配色主题，温暖节日感",
        "vibe": "温暖、节日、欢乐",
    },
}


# ============================================================================
# Cache implementation
# ============================================================================

class _ThemeCache:
    """Simple in-memory cache with TTL support."""

    def __init__(self, ttl: int = 3600):
        self._store: Dict[str, tuple[ThemeMatchResult, float]] = {}
        self._ttl = ttl

    def _make_key(self, user_input: str, mbti: Optional[str]) -> str:
        raw = f"{user_input}:{mbti or ''}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    def get(self, user_input: str, mbti: Optional[str]) -> Optional[ThemeMatchResult]:
        key = self._make_key(user_input, mbti)
        entry = self._store.get(key)
        if entry is None:
            return None
        result, ts = entry
        if time.time() - ts > self._ttl:
            del self._store[key]
            return None
        return result

    def set(self, user_input: str, mbti: Optional[str], result: ThemeMatchResult) -> None:
        key = self._make_key(user_input, mbti)
        self._store[key] = (result, time.time())

    def clear(self) -> None:
        self._store.clear()


# ============================================================================
# Input model
# ============================================================================

class ThemeMatcherInput(BaseModel):
    """Input for theme matching."""
    user_input: str = Field(..., description="User's natural language input")
    mbti: Optional[str] = Field(None, description="User's MBTI type")
    history: Optional[Dict[str, Any]] = Field(
        None, description="User preference history (liked/disliked themes)"
    )


# ============================================================================
# System prompt
# ============================================================================

THEME_MATCHER_PROMPT = """你是 Heya Studio 的风格匹配专家。

你的任务是根据用户的描述和 MBTI，推荐最匹配的主题风格。

## 可用主题
{theme_list}

## 推理规则
1. 优先考虑用户自然语言描述中的风格倾向
2. MBTI 作为辅助参考，但用户明确偏好优先
3. 考虑用户历史偏好（喜欢的/不喜欢的主题）
4. confidence 范围 0-1，1 表示完全确定

## 输出格式 (JSON)
{{
  "theme_id": "最佳匹配的主题ID",
  "confidence": 0.85,
  "reason": "为什么选这个主题",
  "alternatives": [
    {{"theme_id": "备选主题ID", "confidence": 0.6, "reason": "备选原因"}}
  ]
}}"""


# ============================================================================
# Tool
# ============================================================================

class ThemeMatcherTool(BaseTool[ThemeMatcherInput, ThemeMatchResult]):
    """Tool for LLM-driven semantic theme matching.

    Replaces hardcoded MBTI_THEME_MAP with LLM reasoning.
    Includes in-memory caching (TTL 3600s) and mock mode support.
    """

    name = "match_theme"
    description = "根据用户描述和MBTI，语义匹配最佳主题风格"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED

    def __init__(self, llm_call=None, mock: bool = False):
        super().__init__()
        self._llm_call = llm_call
        self._mock = mock
        self._cache = _ThemeCache(ttl=3600)

    async def execute(self, input_data: ThemeMatcherInput) -> ThemeMatchResult:
        """Match user input to the best theme."""
        # 1. Check cache
        cached = self._cache.get(input_data.user_input, input_data.mbti)
        if cached is not None:
            return cached

        # 2. Mock mode
        if self._mock:
            result = self._mock_match(input_data)
            self._cache.set(input_data.user_input, input_data.mbti, result)
            return result

        # 3. Try LLM semantic reasoning
        if self._llm_call:
            try:
                result = await self._llm_match(input_data)
                if result is not None:
                    self._cache.set(input_data.user_input, input_data.mbti, result)
                    return result
            except Exception:
                pass

        # 4. Fallback to rule-based matching
        result = self._rule_based_match(input_data)
        self._cache.set(input_data.user_input, input_data.mbti, result)
        return result

    async def _llm_match(self, input_data: ThemeMatcherInput) -> Optional[ThemeMatchResult]:
        """Use LLM to semantically match theme."""
        theme_list = "\n".join(
            f"- {tid}: {info['name']} — {info['description']}（氛围：{info['vibe']}）"
            for tid, info in THEME_CATALOG.items()
        )

        history_str = ""
        if input_data.history:
            liked = input_data.history.get("liked_themes", [])
            disliked = input_data.history.get("disliked_themes", [])
            if liked:
                history_str += f"\n用户喜欢的主题: {', '.join(liked)}"
            if disliked:
                history_str += f"\n用户不喜欢的主题: {', '.join(disliked)}"

        mbti_str = f"\n用户 MBTI: {input_data.mbti}" if input_data.mbti else ""

        system = THEME_MATCHER_PROMPT.format(theme_list=theme_list)
        user_msg = f"用户输入: {input_data.user_input}{mbti_str}{history_str}"

        response = await self._llm_call(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ]
        )

        import json
        content = response.content if hasattr(response, "content") else str(response)

        # Try to extract JSON from the response
        data = json.loads(self._extract_json(content))

        result = ThemeMatchResult(
            theme_id=data["theme_id"],
            confidence=data.get("confidence", 0.7),
            reason=data.get("reason", ""),
            alternatives=[
                ThemeAlternative(**alt)
                for alt in data.get("alternatives", [])
            ],
        )

        # Validate theme_id
        if result.theme_id not in THEME_CATALOG:
            # Try to find closest match
            for tid in THEME_CATALOG:
                if tid in result.theme_id or result.theme_id in tid:
                    result = result.model_copy(update={"theme_id": tid})
                    break
            else:
                return None  # Invalid theme, let fallback handle it

        return result

    def _mock_match(self, input_data: ThemeMatcherInput) -> ThemeMatchResult:
        """Mock mode: return deterministic result based on input."""
        mbti = input_data.mbti or ""
        text = input_data.user_input.lower()

        # Simple keyword-based mock
        if "赛博" in text or "朋克" in text or "酷炫" in text:
            return ThemeMatchResult(
                theme_id="cyberpunk",
                confidence=0.9,
                reason="[mock] 用户描述包含赛博朋克关键词",
                alternatives=[
                    ThemeAlternative(theme_id="minimal", confidence=0.5, reason="[mock] 极简风格也有酷感")
                ],
            )
        if "安静" in text or "优雅" in text or "内省" in text:
            return ThemeMatchResult(
                theme_id="lavender",
                confidence=0.85,
                reason="[mock] 用户偏好安静优雅",
                alternatives=[],
            )
        if mbti in ("INFP", "INFJ", "ISFP"):
            return ThemeMatchResult(
                theme_id="lavender",
                confidence=0.8,
                reason=f"[mock] {mbti} 默认推荐薰衣草紫",
                alternatives=[
                    ThemeAlternative(theme_id="sakura", confidence=0.6, reason="[mock] INFP 也适合樱花粉")
                ],
            )

        return ThemeMatchResult(
            theme_id="sakura",
            confidence=0.7,
            reason="[mock] 默认主题",
            alternatives=[],
        )

    def _rule_based_match(self, input_data: ThemeMatcherInput) -> ThemeMatchResult:
        """Rule-based fallback when LLM is unavailable."""
        text = input_data.user_input
        mbti = input_data.mbti or ""

        # Check user input for style keywords
        keyword_map = {
            "樱花": "sakura", "粉色": "sakura", "萌系": "sakura", "浪漫": "sakura",
            "赛博": "cyberpunk", "朋克": "cyberpunk", "霓虹": "cyberpunk",
            "薰衣草": "lavender", "紫色": "lavender", "安静": "lavender", "优雅": "lavender",
            "薄荷": "mint", "清新": "mint", "绿色": "mint", "自然": "mint",
            "极简": "minimal", "简约": "minimal", "黑白": "minimal",
            "圣诞": "merry-christmas", "节日": "merry-christmas",
        }

        for keyword, theme_id in keyword_map.items():
            if keyword in text:
                return ThemeMatchResult(
                    theme_id=theme_id,
                    confidence=0.7,
                    reason=f"关键词匹配: '{keyword}' → {theme_id}",
                    alternatives=[],
                )

        # MBTI-based fallback
        mbti_map = {
            "INFP": "lavender", "INFJ": "sakura", "ISFP": "mint", "ISFJ": "sakura",
            "INTJ": "cyberpunk", "INTP": "minimal", "ISTP": "minimal", "ISTJ": "minimal",
            "ENFP": "sakura", "ENFJ": "merry-christmas", "ESFP": "sakura", "ESFJ": "sakura",
            "ENTP": "cyberpunk", "ENTJ": "cyberpunk", "ESTP": "cyberpunk", "ESTJ": "minimal",
        }

        theme_id = mbti_map.get(mbti, "sakura")
        return ThemeMatchResult(
            theme_id=theme_id,
            confidence=0.5,
            reason=f"MBTI fallback: {mbti} → {theme_id}",
            alternatives=[],
        )

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON from LLM response (may be wrapped in markdown)."""
        # Try to find JSON block in markdown code fence
        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1)
        # Try to find raw JSON object
        match = re.search(r"(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})", text, re.DOTALL)
        if match:
            return match.group(1)
        return text

    def get_input_schema(self) -> type[ThemeMatcherInput]:
        return ThemeMatcherInput

    def get_output_schema(self) -> type[ThemeMatchResult]:
        return ThemeMatchResult
