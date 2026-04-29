"""Tests for assemble_config tool."""

import pytest
from src.tools.assemble_config import assemble_page_config, build_config


# ============================================================================
# Fixtures
# ============================================================================

def _make_template(theme_id="sakura"):
    return {
        "version": "1.0",
        "metadata": {
            "title": "{{user.name}}的个人主页",
            "description": "Heya Studio 生成",
        },
        "theme": {
            "id": theme_id,
            "colors": {
                "primary": "#F2A7B3",
                "secondary": "#FFEEF2",
            },
            "fonts": {
                "heading": "Noto Sans SC",
                "body": "Noto Sans SC",
            },
        },
        "layout": {"type": "single-column", "width": 680},
        "components": [],
    }


def _make_components():
    return [
        {"type": "hero-section", "props": {"name": "{{user.name}}", "signature": "{{user.signature}}"}},
        {"type": "oshi-card", "props": {"name": "{{oshi.name}}", "description": "{{oshi.description}}"}},
        {"type": "quote", "props": {"text": "默认名言", "author": ""}},
    ]


def _make_profile():
    return {
        "name": "小明",
        "mbti": "INFP",
        "signature": "探索无限可能 ✨",
        "oshi": [{"name": "阿尼亚", "from_work": "SPY×FAMILY", "description": "Waku Waku!"}],
        "hobbies": ["追番", "画画"],
    }


def _make_skill():
    return {
        "colors": {"primary": "#FF69B4", "accent": "#FFB6C1"},
        "fonts": {"heading": "Comic Sans"},
        "component_rules": {
            "quote": {"style": "cursive", "animation": "fade-in"},
        },
        "prompt_suffix": "使用可爱的语气",
    }


# ============================================================================
# Tests
# ============================================================================

class TestAssemblePageConfig:
    """Tests for assemble_page_config function."""

    def test_basic_assembly(self):
        """Basic assembly with template + components."""
        template = _make_template()
        components = _make_components()
        profile = _make_profile()

        config, warnings = assemble_page_config(
            template=template,
            components=components,
            profile=profile,
        )

        assert config["version"] == "1.0"
        assert len(config["components"]) == 3
        assert config["components"][0]["type"] == "hero-section"
        assert config["components"][1]["type"] == "oshi-card"
        assert config["components"][2]["type"] == "quote"

    def test_placeholder_filling(self):
        """Profile placeholders should be filled."""
        template = _make_template()
        components = [
            {"type": "hero-section", "props": {"name": "{{user.name}}", "signature": "{{user.signature}}"}},
        ]
        profile = _make_profile()

        config, _ = assemble_page_config(
            template=template,
            components=components,
            profile=profile,
        )

        hero = config["components"][0]
        assert hero["props"]["name"] == "小明"
        assert hero["props"]["signature"] == "探索无限可能 ✨"

    def test_oshi_placeholder_filling(self):
        """Oshi placeholders should be filled."""
        template = _make_template()
        components = [
            {"type": "oshi-card", "props": {"name": "{{oshi.name}}", "description": "{{oshi.description}}"}},
        ]
        profile = _make_profile()

        config, _ = assemble_page_config(
            template=template,
            components=components,
            profile=profile,
        )

        oshi = config["components"][0]
        assert oshi["props"]["name"] == "阿尼亚"
        assert oshi["props"]["description"] == "Waku Waku!"

    def test_metadata_placeholder(self):
        """Metadata title placeholder should be filled."""
        template = _make_template()
        template["metadata"]["title"] = "{{user.name}}的主页"
        profile = _make_profile()

        config, _ = assemble_page_config(
            template=template,
            components=[],
            profile=profile,
        )

        assert config["metadata"]["title"] == "小明的主页"

    def test_skill_color_override(self):
        """Skill colors should override template colors."""
        template = _make_template()
        skill = _make_skill()

        config, _ = assemble_page_config(
            template=template,
            components=[],
            skill=skill,
        )

        assert config["theme"]["colors"]["primary"] == "#FF69B4"
        assert config["theme"]["colors"]["accent"] == "#FFB6C1"
        # Original secondary should remain
        assert config["theme"]["colors"]["secondary"] == "#FFEEF2"

    def test_skill_font_override(self):
        """Skill fonts should override template fonts."""
        template = _make_template()
        skill = _make_skill()

        config, _ = assemble_page_config(
            template=template,
            components=[],
            skill=skill,
        )

        assert config["theme"]["fonts"]["heading"] == "Comic Sans"
        # Original body font should remain
        assert config["theme"]["fonts"]["body"] == "Noto Sans SC"

    def test_skill_component_rules(self):
        """Skill component_rules should be applied to matching components."""
        template = _make_template()
        components = [
            {"type": "quote", "props": {"text": "test", "author": "me"}},
        ]
        skill = _make_skill()

        config, _ = assemble_page_config(
            template=template,
            components=components,
            skill=skill,
        )

        quote = config["components"][0]
        assert quote["props"]["style"] == "cursive"
        assert quote["props"]["animation"] == "fade-in"
        # Original props should remain
        assert quote["props"]["text"] == "test"

    def test_personalized_texts(self):
        """Personalized texts should replace component text fields."""
        template = _make_template()
        components = [
            {"type": "hero-section", "props": {"name": "user", "signature": "old"}},
            {"type": "quote", "props": {"text": "old quote", "author": ""}},
        ]
        texts = {
            "hero-section": "我的个性签名",
            "quote": "Waku Waku!",
        }

        config, _ = assemble_page_config(
            template=template,
            components=components,
            personalized_texts=texts,
        )

        assert config["components"][0]["props"]["signature"] == "我的个性签名"
        assert config["components"][1]["props"]["text"] == "Waku Waku!"

    def test_component_ids_generated(self):
        """Components should have unique IDs."""
        template = _make_template()
        components = [
            {"type": "hero-section", "props": {}},
            {"type": "quote", "props": {}},
            {"type": "quote", "props": {}},
        ]

        config, _ = assemble_page_config(
            template=template,
            components=components,
        )

        ids = [c["id"] for c in config["components"]]
        assert len(ids) == len(set(ids)), "Component IDs should be unique"

    def test_explicit_component_id_preserved(self):
        """Explicit component IDs should be preserved."""
        template = _make_template()
        components = [
            {"type": "hero-section", "id": "my-hero", "props": {}},
        ]

        config, _ = assemble_page_config(
            template=template,
            components=components,
        )

        assert config["components"][0]["id"] == "my-hero"

    def test_empty_components(self):
        """Should handle empty component list."""
        template = _make_template()

        config, _ = assemble_page_config(
            template=template,
            components=[],
        )

        assert config["components"] == []

    def test_build_config_convenience(self):
        """build_config should return a dict."""
        template = _make_template()
        components = _make_components()
        profile = _make_profile()

        config = build_config(
            template=template,
            components=components,
            profile=profile,
        )

        assert isinstance(config, dict)
        assert "components" in config
        assert len(config["components"]) == 3

    def test_no_profile_no_crash(self):
        """Should work without profile (placeholders left as-is or empty)."""
        template = _make_template()
        components = [
            {"type": "hero-section", "props": {"name": "{{user.name}}"}},
        ]

        config, _ = assemble_page_config(
            template=template,
            components=components,
            profile=None,
        )

        # Placeholder should be filled with default
        hero = config["components"][0]
        assert hero["props"]["name"] == "用户"  # default fallback

    def test_no_skill_no_crash(self):
        """Should work without skill."""
        template = _make_template()
        components = _make_components()

        config, _ = assemble_page_config(
            template=template,
            components=components,
            skill=None,
        )

        assert len(config["components"]) == 3
