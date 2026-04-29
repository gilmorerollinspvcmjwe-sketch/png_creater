"""Smart copywriting - LLM generates personalized text with anime/pop culture references.

Phase 3: Instead of generic placeholder text, generates quotes and copy
that reference the user's favorite characters/works.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


# ============================================================================
# Famous quotes database (seed data)
# ============================================================================

FAMOUS_QUOTES = {
    # Spy x Family
    "阿尼亚": [
        {"text": "Waku Waku! ✨", "context": "阿尼亚的口头禅"},
        {"text": "阿尼亚，最喜欢爸爸了！", "context": "对洛伊德的告白"},
        {"text": "计划通！(￣^￣)", "context": "阿尼亚的得意表情"},
        {"text": "花生🥜！阿尼亚要吃花生！", "context": "最爱的零食"},
    ],
    "约尔": [
        {"text": "为了保护家人，我什么都做得出来。", "context": "约尔的觉悟"},
    ],
    "黄昏": [
        {"text": "为了任务，也为了家人。", "context": "黄昏的信念"},
    ],
    # 鬼灭之刃
    "炭治郎": [
        {"text": "我会变得更强，保护大家！", "context": "炭治郎的决心"},
        {"text": "不管多少次，我都会站起来！", "context": "不屈的意志"},
    ],
    "祢豆子": [
        {"text": "唔唔！(｀・ω・´)", "context": "祢豆子的可爱叫声"},
    ],
    # 咒术回战
    "五条悟": [
        {"text": "天上天下，唯我独尊。", "context": "五条悟的名言"},
        {"text": "没关系，我是最强的。", "context": "五条悟的自信"},
    ],
    # 进击的巨人
    "艾伦": [
        {"text": "我要把他们全部驱逐出去！一个不留！", "context": "艾伦的誓言"},
        {"text": "海的那边，是敌人。", "context": "艾伦的觉悟"},
    ],
    # 我的英雄学院
    "绿谷出久": [
        {"text": "我来这里，是为了成为最棒的英雄！", "context": "绿谷的决心"},
    ],
    # 海贼王
    "路飞": [
        {"text": "我是要成为海贼王的男人！", "context": "路飞的梦想"},
    ],
    # 火影忍者
    "鸣人": [
        {"text": "说到做到，这就是我的忍道！", "context": "鸣人的忍道"},
    ],
    # 原神
    "钟离": [
        {"text": "此世群魔诸神并起，我虽无意逐鹿，却知苍生苦楚。", "context": "钟离的感慨"},
    ],
    "雷电将军": [
        {"text": "浮世景色百千年依旧，人之在世，却如白露与泡影。", "context": "将军的感悟"},
    ],
    # 崩坏：星穹铁道
    "三月七": [
        {"text": "名字是三月七！因为想不起自己几岁了嘛~", "context": "三月七的自我介绍"},
    ],
    "星": [
        {"text": "银河那么大，我想去看看。", "context": "开拓者的冒险心"},
    ],
}

# Generic quotes by vibe/style
GENERIC_QUOTES = {
    "cute": [
        "今天也是元气满满的一天呢！(◕‿◕) ✨",
        "被爱包围着，好幸福~ 💕",
        "想做什么都可以做到，因为我有大家的支持！",
    ],
    "cool": [
        "不必追随光，成为光就好。",
        "我的道路，我自己开辟。",
        "沉默，是最好的回答。",
    ],
    "minimal": [
        "简单，即是最美。",
        "少即是多。",
        "留白，也是一种表达。",
    ],
    "warm": [
        "愿你的每一天，都被温柔以待。",
        "生活不是等待暴风雨过去，而是学会在雨中跳舞。",
        "每一段旅程，都值得被记录。",
    ],
    "anime": [
        "只要不放弃，梦想就会实现。",
        "无论多少次跌倒，我都会再次站起来。",
        "重要的不是发生了什么，而是你如何面对它。",
    ],
}


# ============================================================================
# Input / Output models
# ============================================================================

class CopywritingInput(BaseModel):
    """Input for smart copywriting."""
    component_type: str = Field(..., description="Component type (hero-section, quote, etc.)")
    profile: Dict[str, Any] = Field(..., description="User profile with oshi, mbti, etc.")
    context: Optional[str] = Field(None, description="Additional context or style hint")
    max_length: int = Field(default=50, ge=10, le=200, description="Max text length")


class CopywritingOutput(BaseModel):
    """Output for smart copywriting."""
    text: str = Field(..., description="Generated personalized text")
    source: str = Field(default="generic", description="Source: character_quote, style_generic, llm_generated")
    character: Optional[str] = Field(None, description="Character name if from famous quotes")


# ============================================================================
# Smart copywriter
# ============================================================================

class SmartCopywriter:
    """Generates personalized copy with character references."""

    def generate(
        self,
        component_type: str,
        profile: Dict[str, Any],
        context: Optional[str] = None,
        max_length: int = 50,
    ) -> CopywritingOutput:
        """Generate personalized copy for a component."""
        # Strategy 1: Character quote (highest priority)
        result = self._try_character_quote(component_type, profile, max_length)
        if result:
            return result

        # Strategy 2: Style-based generic quote
        result = self._try_style_quote(component_type, profile, context, max_length)
        if result:
            return result

        # Strategy 3: Profile-based fallback
        return self._profile_fallback(component_type, profile, max_length)

    def _try_character_quote(
        self,
        component_type: str,
        profile: Dict[str, Any],
        max_length: int,
    ) -> Optional[CopywritingOutput]:
        """Try to find a famous quote from user's favorite characters."""
        oshis = profile.get("oshi", [])
        if not oshis:
            return None

        for oshi in oshis:
            name = oshi.get("name", "")
            if name in FAMOUS_QUOTES:
                quotes = FAMOUS_QUOTES[name]
                # Pick based on component type
                if component_type == "quote":
                    # Use the first (most iconic) quote
                    chosen = quotes[0]
                elif component_type == "hero-section":
                    # Use signature-style quote
                    chosen = quotes[0]
                else:
                    chosen = quotes[0]

                text = chosen["text"]
                if len(text) <= max_length:
                    return CopywritingOutput(
                        text=text,
                        source="character_quote",
                        character=name,
                    )

        return None

    def _try_style_quote(
        self,
        component_type: str,
        profile: Dict[str, Any],
        context: Optional[str],
        max_length: int,
    ) -> Optional[CopywritingOutput]:
        """Try to find a generic quote matching user's style."""
        style = self._detect_style(profile, context)

        if style in GENERIC_QUOTES:
            quotes = GENERIC_QUOTES[style]
            import random
            chosen = random.choice(quotes)
            if len(chosen) <= max_length:
                return CopywritingOutput(
                    text=chosen,
                    source="style_generic",
                )

        return None

    def _profile_fallback(
        self,
        component_type: str,
        profile: Dict[str, Any],
        max_length: int,
    ) -> CopywritingOutput:
        """Fallback: generate from profile data."""
        mbti = profile.get("mbti", "INFP")
        oshis = profile.get("oshi", [])
        oshi_names = ", ".join(o.get("name", "") for o in oshis[:2])

        fallbacks = {
            "hero-section": f"{mbti} · {oshi_names + ' 的二次元世界' if oshi_names else '探索无限可能'} ✨",
            "quote": f"做真实的自己，就是最好的风格。—— {mbti}",
            "oshi-card": f"最爱的{oshi_names}，永远的推！💕" if oshi_names else "这里是我的推～",
            "tag-group": "我的属性标签",
            "music-player": "正在播放...",
        }

        text = fallbacks.get(component_type, "个性化内容")
        if len(text) > max_length:
            text = text[:max_length - 3] + "..."

        return CopywritingOutput(
            text=text,
            source="profile_fallback",
        )

    def _detect_style(self, profile: Dict[str, Any], context: Optional[str]) -> str:
        """Detect user's preferred style."""
        style_pref = profile.get("style_preference", "")
        theme = profile.get("theme", "")

        style_map = {
            "sakura": "cute",
            "樱花": "cute",
            "粉色": "cute",
            "night": "cool",
            "赛博": "cool",
            "mono": "minimal",
            "极简": "minimal",
            "lavender": "warm",
            "薰衣草": "warm",
            "mint": "warm",
            "薄荷": "warm",
        }

        # Check context first
        if context:
            for keyword, style in style_map.items():
                if keyword in context:
                    return style

        # Check profile
        for keyword, style in style_map.items():
            if keyword in style_pref or keyword in theme:
                return style

        # MBTI-based guess
        mbti = profile.get("mbti", "")
        if mbti in ("INFP", "INFJ", "ENFP"):
            return "anime"
        elif mbti in ("INTJ", "INTP", "ENTJ"):
            return "cool"
        elif mbti in ("ISFJ", "ESFJ", "ISFP"):
            return "warm"

        return "anime"  # Default


# ============================================================================
# Global instance
# ============================================================================

_copywriter: Optional[SmartCopywriter] = None


def get_copywriter() -> SmartCopywriter:
    """Get or create global copywriter instance."""
    global _copywriter
    if _copywriter is None:
        _copywriter = SmartCopywriter()
    return _copywriter


def generate_smart_copy(
    component_type: str,
    profile: Dict[str, Any],
    context: Optional[str] = None,
    max_length: int = 50,
) -> str:
    """Convenience function for smart copywriting."""
    result = get_copywriter().generate(
        component_type=component_type,
        profile=profile,
        context=context,
        max_length=max_length,
    )
    return result.text
