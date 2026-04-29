"""Tests for BuilderAgent."""

import pytest
import asyncio
from src.agents.builder import BuilderAgent, _get_default_props


# ============================================================================
# Fixtures
# ============================================================================

def _make_profile():
    return {
        "name": "小明",
        "mbti": "INFP",
        "signature": "探索无限可能 ✨",
        "oshi": [{"name": "阿尼亚", "from_work": "SPY×FAMILY", "description": "Waku Waku!"}],
        "hobbies": ["追番", "画画"],
    }


def _make_minimal_profile():
    return {
        "mbti": "INTJ",
    }


# ============================================================================
# Tests for _get_default_props
# ============================================================================

class TestGetDefaultProps:
    """Tests for default props function."""

    def test_hero_section(self):
        props = _get_default_props("hero-section")
        assert "name" in props
        assert "signature" in props

    def test_oshi_card(self):
        props = _get_default_props("oshi-card")
        assert "name" in props

    def test_quote(self):
        props = _get_default_props("quote")
        assert "text" in props

    def test_unknown_type(self):
        props = _get_default_props("unknown-component")
        assert props == {}


# ============================================================================
# Tests for BuilderAgent
# ============================================================================

class TestBuilderAgent:
    """Tests for BuilderAgent."""

    def test_init_without_llm(self):
        """Should initialize without LLM."""
        agent = BuilderAgent()
        assert agent._llm_call is None

    def test_init_with_llm(self):
        """Should initialize with LLM call function."""
        async def mock_llm(messages, **kwargs):
            return {"content": "test"}
        agent = BuilderAgent(llm_call=mock_llm)
        assert agent._llm_call is not None

    @pytest.mark.asyncio
    async def test_build_without_llm(self):
        """Should build config without LLM (rule-based fallback)."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(
            user_profile=profile,
            theme_id="sakura",
        )

        assert "config" in result
        assert "reasoning" in result
        assert "component_count" in result
        config = result["config"]
        assert config["version"] == "1.0"
        assert config["theme"]["id"] == "sakura"
        assert len(config["components"]) > 0

    @pytest.mark.asyncio
    async def test_build_has_hero_section(self):
        """Built config should always include hero-section."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]

        component_types = [c["type"] for c in config["components"]]
        assert "hero-section" in component_types

    @pytest.mark.asyncio
    async def test_build_with_oshi_profile(self):
        """Profile with oshi should include oshi-card."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]

        component_types = [c["type"] for c in config["components"]]
        assert "oshi-card" in component_types

    @pytest.mark.asyncio
    async def test_build_with_mbti_profile(self):
        """Profile with MBTI should include attribute-wall."""
        agent = BuilderAgent()
        profile = _make_minimal_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]

        component_types = [c["type"] for c in config["components"]]
        assert "attribute-wall" in component_types

    @pytest.mark.asyncio
    async def test_build_components_have_positions(self):
        """All components should have position data."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]

        for comp in config["components"]:
            assert "position" in comp
            pos = comp["position"]
            assert "x" in pos
            assert "y" in pos
            assert "width" in pos
            assert "height" in pos

    @pytest.mark.asyncio
    async def test_build_components_no_overlap(self):
        """Components should not overlap after auto layout."""
        from src.tools.auto_layout import _rects_overlap

        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]
        components = config["components"]

        for i in range(len(components)):
            for j in range(i + 1, len(components)):
                pi = components[i]["position"]
                pj = components[j]["position"]
                rect_i = (pi["x"], pi["y"], pi["width"], pi["height"])
                rect_j = (pj["x"], pj["y"], pj["width"], pj["height"])
                assert not _rects_overlap(rect_i, rect_j), \
                    f"Components {components[i]['id']} and {components[j]['id']} overlap"

    @pytest.mark.asyncio
    async def test_build_validation_passes(self):
        """Built config should pass validation."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")

        assert result["validation"]["passed"] is True

    @pytest.mark.asyncio
    async def test_build_different_themes(self):
        """Should work with different themes."""
        agent = BuilderAgent()
        profile = _make_profile()

        for theme in ["sakura", "night", "lavender", "mint", "mono"]:
            result = await agent.build(user_profile=profile, theme_id=theme)
            config = result["config"]
            assert config["theme"]["id"] == theme

    @pytest.mark.asyncio
    async def test_build_empty_profile(self):
        """Should handle empty profile gracefully."""
        agent = BuilderAgent()

        result = await agent.build(user_profile={}, theme_id="sakura")
        config = result["config"]

        assert len(config["components"]) > 0
        # Should still have hero-section
        types = [c["type"] for c in config["components"]]
        assert "hero-section" in types

    @pytest.mark.asyncio
    async def test_build_placeholders_filled(self):
        """Profile placeholders should be filled in component props."""
        agent = BuilderAgent()
        profile = _make_profile()

        result = await agent.build(user_profile=profile, theme_id="sakura")
        config = result["config"]

        # Check no remaining placeholders
        for comp in config["components"]:
            for key, value in (comp.get("props") or {}).items():
                if isinstance(value, str):
                    assert "{{" not in value, \
                        f"Unfilled placeholder in {comp['id']}.{key}: {value}"
