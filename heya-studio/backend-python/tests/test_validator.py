"""Tests for Validator Agent - Three-layer validation."""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.agents.validator import ValidatorAgent, ValidationReport
from src.models.page import ComponentType


# ============================================================================
# Fixtures
# ============================================================================

def make_valid_config():
    """Create a valid config for testing."""
    return {
        "version": "1.0",
        "theme": {"id": "sakura"},
        "layout": {"width": 680, "height": 2000, "responsive": True},
        "components": [
            {
                "id": "hero-section-1",
                "type": "hero-section",
                "position": {"x": 0, "y": 0, "width": 680, "height": 200},
                "props": {"title": "欢迎来到我的世界", "subtitle": "INFP · 二次元爱好者"},
            },
            {
                "id": "oshi-card-1",
                "type": "oshi-card",
                "position": {"x": 0, "y": 220, "width": 680, "height": 300},
                "props": {
                    "name": "阿尼亚",
                    "from_work": "Spy x Family",
                    "description": "最可爱的超能力少女！Waku Waku~",
                },
            },
            {
                "id": "quote-1",
                "type": "quote",
                "position": {"x": 0, "y": 540, "width": 680, "height": 80},
                "props": {"text": "做真实的自己，就是最好的风格。"},
            },
        ],
    }


def make_valid_profile():
    """Create a valid user profile."""
    return {
        "mbti": "INFP",
        "oshi": [{"name": "阿尼亚", "from_work": "Spy x Family"}],
        "hobbies": ["看动漫", "听音乐", "画画"],
    }


# ============================================================================
# L1 Schema Validation Tests
# ============================================================================

class TestL1SchemaValidation:
    """Test L1: Schema validation."""

    def test_valid_config_passes(self):
        """Valid config should pass schema validation."""
        agent = ValidatorAgent()
        passed, issues = agent._validate_schema(make_valid_config())
        assert passed is True
        assert len(issues) == 0

    def test_missing_theme_id_fails(self):
        """Config without theme ID should fail."""
        config = make_valid_config()
        config["theme"] = {"id": ""}
        agent = ValidatorAgent()
        passed, issues = agent._validate_schema(config)
        assert passed is False
        assert any(i["code"] == "MISSING_THEME_ID" for i in issues)

    def test_invalid_component_type_fails(self):
        """Invalid component type should fail."""
        config = make_valid_config()
        config["components"][0]["type"] = "nonexistent_type"
        agent = ValidatorAgent()
        passed, issues = agent._validate_schema(config)
        assert passed is False
        assert any(i["code"] == "INVALID_COMPONENT_TYPE" for i in issues)

    def test_missing_component_id_fails(self):
        """Component without ID should fail."""
        config = make_valid_config()
        del config["components"][0]["id"]
        agent = ValidatorAgent()
        passed, issues = agent._validate_schema(config)
        assert passed is False
        assert any(i["code"] == "MISSING_COMPONENT_ID" for i in issues)

    def test_missing_component_type_fails(self):
        """Component without type should fail."""
        config = make_valid_config()
        del config["components"][0]["type"]
        agent = ValidatorAgent()
        passed, issues = agent._validate_schema(config)
        assert passed is False
        assert any(i["code"] == "MISSING_COMPONENT_TYPE" for i in issues)


# ============================================================================
# L2 Semantic Validation Tests
# ============================================================================

class TestL2SemanticValidation:
    """Test L2: Semantic validation (component-profile matching)."""

    def test_oshi_card_matches_oshi_profile(self):
        """oshi-card should match user with oshi profile."""
        agent = ValidatorAgent()
        config = make_valid_config()
        profile = make_valid_profile()

        report = agent.validate_sync(config, profile, theme_id="sakura")
        assert report.l2_semantic_score >= 6.0
        assert "oshi-card" in [cr.component_type for cr in report.l2_semantic_results if cr.match_score >= 6]

    def test_missing_oshi_card_for_oshi_user(self):
        """User with oshi should have oshi-card."""
        config = {
            "version": "1.0",
            "theme": {"id": "sakura"},
            "layout": {"width": 680, "height": 1000, "responsive": True},
            "components": [
                {
                    "id": "hero-1",
                    "type": "hero-section",
                    "position": {"x": 0, "y": 0, "width": 680, "height": 200},
                    "props": {"title": "Welcome"},
                },
            ],
        }
        profile = make_valid_profile()  # Has oshi

        agent = ValidatorAgent()
        report = agent.validate_sync(config, profile, theme_id="sakura")
        assert report.l2_missing_suggestions, "Should suggest adding oshi-card"

    def test_attribute_wall_matches_mbti(self):
        """User with MBTI should benefit from attribute-wall."""
        config = make_valid_config()
        config["components"].append({
            "id": "attr-1",
            "type": "attribute-wall",
            "position": {"x": 0, "y": 640, "width": 680, "height": 150},
            "props": {"mbti": "INFP", "traits": ["理想主义", "共情力强"]},
        })
        profile = make_valid_profile()

        agent = ValidatorAgent()
        report = agent.validate_sync(config, profile, theme_id="sakura")
        # Adding attribute-wall should improve score
        assert report.l2_semantic_score >= 6.0

    def test_personalized_text_boosts_score(self):
        """Personalized text should boost semantic score."""
        config = make_valid_config()
        profile = make_valid_profile()

        agent = ValidatorAgent()
        report = agent.validate_sync(config, profile, theme_id="sakura")

        # Config has personalized text (not generic placeholders)
        assert report.l2_semantic_score >= 6.0


# ============================================================================
# L3 Business Rules Tests
# ============================================================================

class TestL3BusinessRules:
    """Test L3: Business rules validation."""

    def test_component_count_within_limits(self):
        """Config with 3-8 components should pass."""
        agent = ValidatorAgent()
        config = make_valid_config()
        passed, issues = agent._validate_business_rules(config)
        assert passed is True

    def test_too_few_components_warns(self):
        """Config with 0-1 components should warn."""
        agent = ValidatorAgent()
        config = {
            "version": "1.0",
            "theme": {"id": "sakura"},
            "layout": {"width": 680, "height": 500, "responsive": True},
            "components": [
                {
                    "id": "hero-1",
                    "type": "hero-section",
                    "position": {"x": 0, "y": 0, "width": 680, "height": 200},
                    "props": {"title": "Welcome"},
                },
            ],
        }
        passed, issues = agent._validate_business_rules(config)
        # Warning, not error (still passes)
        assert any(i["code"] == "TOO_FEW_COMPONENTS" for i in issues)

    def test_too_many_components_fails(self):
        """Config with > 8 components should fail."""
        agent = ValidatorAgent()
        config = make_valid_config()
        # Add 7 more components (total 10)
        for i in range(7):
            config["components"].append({
                "id": f"extra-{i}",
                "type": "text",
                "position": {"x": 0, "y": 800 + i * 100, "width": 680, "height": 80},
                "props": {"text": f"Extra {i}"},
            })
        passed, issues = agent._validate_business_rules(config)
        assert passed is False
        assert any(i["code"] == "COMPONENT_COUNT_EXCEEDED" for i in issues)

    def test_duplicate_ids_fail(self):
        """Duplicate component IDs should fail."""
        config = make_valid_config()
        config["components"][0]["id"] = "duplicate-id"
        config["components"][1]["id"] = "duplicate-id"

        agent = ValidatorAgent()
        passed, issues = agent._validate_business_rules(config)
        assert passed is False
        assert any(i["code"] == "DUPLICATE_COMPONENT_ID" for i in issues)

    def test_overlapping_positions_fail(self):
        """Overlapping components should fail."""
        config = make_valid_config()
        config["components"][0]["position"] = {"x": 0, "y": 0, "width": 680, "height": 400}
        config["components"][1]["position"] = {"x": 0, "y": 100, "width": 680, "height": 300}

        agent = ValidatorAgent()
        passed, issues = agent._validate_business_rules(config)
        assert passed is False
        assert any(i["code"] == "COMPONENT_OVERLAP" for i in issues)

    def test_unfilled_placeholders_warn(self):
        """Unfilled placeholders should warn."""
        config = make_valid_config()
        config["components"][0]["props"]["subtitle"] = "{{user_name}}的个人主页"

        agent = ValidatorAgent()
        passed, issues = agent._validate_business_rules(config)
        assert any(i["code"] == "UNFILLED_PLACEHOLDER" for i in issues)

    def test_missing_hero_section_warns(self):
        """Config without hero-section should warn."""
        config = make_valid_config()
        config["components"] = [c for c in config["components"] if c["type"] != "hero-section"]

        agent = ValidatorAgent()
        passed, issues = agent._validate_business_rules(config)
        assert any(i["code"] == "MISSING_HERO_SECTION" for i in issues)

    def test_no_overlap_passes(self):
        """Non-overlapping components should pass overlap check."""
        agent = ValidatorAgent()
        config = make_valid_config()
        # All positions are well-spaced
        overlaps = agent._check_overlaps(config["components"])
        assert overlaps == 0


# ============================================================================
# Overall Validation Tests
# ============================================================================

class TestOverallValidation:
    """Test overall validation pipeline."""

    def test_valid_config_passes_all_layers(self):
        """Valid config should pass all three layers."""
        agent = ValidatorAgent()
        config = make_valid_config()
        profile = make_valid_profile()

        report = agent.validate_sync(config, profile, theme_id="sakura")
        assert report.l1_schema_passed is True
        assert report.l2_semantic_passed is True
        assert report.l3_business_passed is True
        assert report.passed is True
        assert report.overall_score >= 60

    def test_overall_score_calculation(self):
        """Overall score should be weighted average of layers."""
        agent = ValidatorAgent()
        config = make_valid_config()
        profile = make_valid_profile()

        report = agent.validate_sync(config, profile, theme_id="sakura")
        # Score should be reasonable
        assert 0 <= report.overall_score <= 100

    def test_report_serializable(self):
        """ValidationReport should be serializable to dict."""
        agent = ValidatorAgent()
        config = make_valid_config()
        profile = make_valid_profile()

        report = agent.validate_sync(config, profile, theme_id="sakura")
        data = report.model_dump()
        assert "passed" in data
        assert "overall_score" in data
        assert "l1_schema_passed" in data
        assert "l2_semantic_passed" in data
        assert "l3_business_passed" in data
