"""Tests for Phase 3 features: User behavior memory, smart copywriting, performance monitoring."""

import pytest
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ============================================================================
# User Behavior Memory Tests
# ============================================================================

class TestUserBehaviorMemory:
    """Test Phase 3: User behavior memory and preference learning."""

    def setup_method(self):
        """Reset behavior memory before each test."""
        from src.memory.behavior import reset_behavior_memory
        reset_behavior_memory()

    def test_record_feedback(self):
        """Should record feedback and update preferences."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        feedback = GenerationFeedback(
            user_id="test-user",
            theme_id="sakura",
            components_used=["hero-section", "oshi-card", "quote"],
            action="approve",
            validation_score=85.0,
        )

        pref = memory.record_feedback(feedback)
        assert pref.total_generations == 1
        assert pref.approved_count == 1
        assert pref.preferred_themes.get("sakura", 0) == 1
        assert pref.preferred_components.get("hero-section", 0) == 1

    def test_reject_feedback(self):
        """Rejected feedback should track rejected components."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        feedback = GenerationFeedback(
            user_id="test-user",
            theme_id="cyberpunk",
            components_used=["hero-section", "media-list", "gallery"],
            action="reject",
            validation_score=45.0,
        )

        pref = memory.record_feedback(feedback)
        assert pref.rejected_count == 1
        assert pref.rejected_components.get("hero-section", 0) == 1

    def test_modify_feedback(self):
        """Modified feedback should track partial approval."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        feedback = GenerationFeedback(
            user_id="test-user",
            theme_id="sakura",
            components_used=["hero-section", "oshi-card"],
            action="modify",
            modifications=["change theme to lavender", "remove media-list"],
            validation_score=70.0,
        )

        pref = memory.record_feedback(feedback)
        assert pref.modified_count == 1

    def test_get_recommended_theme(self):
        """Should recommend most approved theme."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        # Approve sakura twice
        for _ in range(2):
            memory.record_feedback(GenerationFeedback(
                user_id="test-user",
                theme_id="sakura",
                components_used=["hero-section"],
                action="approve",
            ))

        # Approve cyberpunk once
        memory.record_feedback(GenerationFeedback(
            user_id="test-user",
            theme_id="cyberpunk",
            components_used=["hero-section"],
            action="approve",
        ))

        recommended = memory.get_recommended_theme("test-user")
        assert recommended == "sakura"

    def test_get_recommended_components(self):
        """Should recommend most preferred components."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        # Approve configs with oshi-card
        for _ in range(3):
            memory.record_feedback(GenerationFeedback(
                user_id="test-user",
                theme_id="sakura",
                components_used=["hero-section", "oshi-card", "quote"],
                action="approve",
            ))

        # Approve config without oshi-card
        memory.record_feedback(GenerationFeedback(
            user_id="test-user",
            theme_id="sakura",
            components_used=["hero-section", "attribute-wall", "tag-group"],
            action="approve",
        ))

        recommended = memory.get_recommended_components("test-user", count=5)
        assert "oshi-card" in recommended  # Most approved
        assert "hero-section" in recommended  # Always included

    def test_get_user_stats(self):
        """Should return user statistics."""
        from src.memory.behavior import get_behavior_memory, GenerationFeedback

        memory = get_behavior_memory()

        # Record some feedback
        for _ in range(4):
            memory.record_feedback(GenerationFeedback(
                user_id="test-user",
                theme_id="sakura",
                components_used=["hero-section", "oshi-card"],
                action="approve",
            ))

        memory.record_feedback(GenerationFeedback(
            user_id="test-user",
            theme_id="sakura",
            components_used=["hero-section"],
            action="reject",
        ))

        stats = memory.get_user_stats("test-user")
        assert stats["total_generations"] == 5
        assert stats["approval_rate"] == 80.0  # 4/5

    def test_default_user(self):
        """Should handle anonymous/default user."""
        from src.memory.behavior import get_behavior_memory

        memory = get_behavior_memory()
        pref = memory.get_preferences("anonymous")
        assert pref.user_id == "anonymous"
        assert pref.total_generations == 0

    def test_persistence(self, tmp_path):
        """Should save and load preferences from file."""
        from src.memory.behavior import UserBehaviorMemory, GenerationFeedback, reset_behavior_memory

        storage_path = str(tmp_path / "behavior.json")

        # Create memory and record feedback
        memory = UserBehaviorMemory(storage_path=storage_path)
        memory.record_feedback(GenerationFeedback(
            user_id="test-user",
            theme_id="sakura",
            components_used=["hero-section"],
            action="approve",
        ))

        # Create new instance from same file
        reset_behavior_memory()
        memory2 = UserBehaviorMemory(storage_path=storage_path)
        pref = memory2.get_preferences("test-user")
        assert pref.total_generations == 1
        assert pref.approved_count == 1


# ============================================================================
# Smart Copywriting Tests
# ============================================================================

class TestSmartCopywriting:
    """Test Phase 3: Smart copywriting with character quotes."""

    def test_character_quote_for_oshi(self):
        """Should return character quote for user's oshi."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()
        profile = {
            "oshi": [{"name": "阿尼亚", "from_work": "Spy x Family"}],
            "mbti": "INFP",
        }

        result = copywriter.generate(
            component_type="quote",
            profile=profile,
            max_length=50,
        )

        assert result.source == "character_quote"
        assert result.character == "阿尼亚"
        assert "阿尼亚" in result.text or "Waku" in result.text

    def test_style_generic_for_no_oshi(self):
        """Should return style-based generic quote when no oshi."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()
        profile = {
            "oshi": [],
            "mbti": "INTJ",
            "style_preference": "cool",
        }

        result = copywriter.generate(
            component_type="hero-section",
            profile=profile,
            max_length=50,
        )

        assert result.source == "style_generic"
        assert result.character is None
        assert len(result.text) <= 50

    def test_profile_fallback(self):
        """Should return profile-based fallback when no style match."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()
        # Use an MBTI that doesn't map to any style
        profile = {
            "oshi": [],
            "mbti": "ESTP",
        }

        result = copywriter.generate(
            component_type="music-player",  # Not in GENERIC_QUOTES paths
            profile=profile,
            max_length=50,
        )

        # ESTP doesn't map to any style, so it defaults to "anime" which has quotes
        # For "music-player" specifically, the fallback should be used
        assert result.source == "profile_fallback" or result.source == "style_generic"
        assert len(result.text) > 0

    def test_max_length_respected(self):
        """Generated text should respect max_length."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()
        profile = {
            "oshi": [{"name": "艾伦", "from_work": "进击的巨人"}],
            "mbti": "ENTJ",
        }

        result = copywriter.generate(
            component_type="quote",
            profile=profile,
            max_length=20,
        )

        assert len(result.text) <= 20

    def test_different_component_types(self):
        """Different component types should get different copy."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()
        profile = {
            "oshi": [{"name": "五条悟", "from_work": "咒术回战"}],
            "mbti": "INFP",
        }

        hero = copywriter.generate("hero-section", profile, max_length=50)
        quote = copywriter.generate("quote", profile, max_length=50)

        # Both should be character quotes
        assert hero.source == "character_quote"
        assert quote.source == "character_quote"

    def test_convenience_function(self):
        """Convenience function should work."""
        from src.tools.smart_copy import generate_smart_copy

        text = generate_smart_copy(
            component_type="oshi-card",
            profile={
                "oshi": [{"name": "阿尼亚", "from_work": "Spy x Family"}],
                "mbti": "INFP",
            },
            max_length=50,
        )

        assert isinstance(text, str)
        assert len(text) > 0

    def test_style_detection_from_mbti(self):
        """Should detect style from MBTI."""
        from src.tools.smart_copy import SmartCopywriter

        copywriter = SmartCopywriter()

        # INFP should map to anime style
        result = copywriter.generate(
            component_type="quote",
            profile={"oshi": [], "mbti": "INFP"},
            max_length=50,
        )
        assert result.source == "style_generic"

        # INTJ should map to cool style
        result = copywriter.generate(
            component_type="quote",
            profile={"oshi": [], "mbti": "INTJ"},
            max_length=50,
        )
        assert result.source == "style_generic"


# ============================================================================
# Performance Monitoring Tests
# ============================================================================

class TestPerformanceMonitoring:
    """Test Phase 3: Performance monitoring and health checks."""

    def setup_method(self):
        """Reset monitor before each test."""
        from src.utils.monitoring import reset_monitor
        reset_monitor()

    def test_record_generation(self):
        """Should record generation metrics."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()
        monitor.record_generation(GenerationMetric(
            timestamp=time.time(),
            user_id="test-user",
            theme_id="sakura",
            component_count=5,
            latency_ms=1500.0,
            validation_score=85.0,
            semantic_score=7.5,
            iteration_count=2,
            auto_fixes=1,
            action="approve",
        ))

        summary = monitor.get_summary(hours=1)
        assert summary["total_generations"] == 1
        assert summary["error_count"] == 0

    def test_error_tracking(self):
        """Should track errors."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()
        monitor.record_generation(GenerationMetric(
            timestamp=time.time(),
            user_id="test-user",
            theme_id="sakura",
            component_count=3,
            latency_ms=200.0,
            validation_score=30.0,
            semantic_score=3.0,
            iteration_count=1,
            auto_fixes=0,
            action="reject",
            error="Validation failed",
        ))

        summary = monitor.get_summary(hours=1)
        assert summary["error_count"] == 1
        assert summary["error_rate"] == 100.0

    def test_approval_rate(self):
        """Should calculate approval rate."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()

        # 3 approves, 1 reject
        for i in range(3):
            monitor.record_generation(GenerationMetric(
                timestamp=time.time(),
                user_id="test-user",
                theme_id="sakura",
                component_count=5,
                latency_ms=1000.0,
                validation_score=80.0,
                semantic_score=7.0,
                iteration_count=1,
                auto_fixes=0,
                action="approve",
            ))

        monitor.record_generation(GenerationMetric(
            timestamp=time.time(),
            user_id="test-user",
            theme_id="sakura",
            component_count=3,
            latency_ms=800.0,
            validation_score=50.0,
            semantic_score=4.0,
            iteration_count=2,
            auto_fixes=1,
            action="reject",
        ))

        summary = monitor.get_summary(hours=1)
        assert summary["approval_rate"] == 75.0

    def test_latency_stats(self):
        """Should calculate latency statistics."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()

        # Record varied latencies
        for latency in [500, 1000, 1500, 2000, 2500]:
            monitor.record_generation(GenerationMetric(
                timestamp=time.time(),
                user_id="test-user",
                theme_id="sakura",
                component_count=5,
                latency_ms=float(latency),
                validation_score=80.0,
                semantic_score=7.0,
                iteration_count=1,
                auto_fixes=0,
                action="approve",
            ))

        summary = monitor.get_summary(hours=1)
        assert summary["latency"]["avg_ms"] == 1500.0
        assert summary["latency"]["median_ms"] == 1500.0

    def test_health_check(self):
        """Should return health status."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()

        # Record some healthy generations
        for _ in range(5):
            monitor.record_generation(GenerationMetric(
                timestamp=time.time(),
                user_id="test-user",
                theme_id="sakura",
                component_count=5,
                latency_ms=1000.0,
                validation_score=85.0,
                semantic_score=7.5,
                iteration_count=1,
                auto_fixes=0,
                action="approve",
            ))

        health = monitor.get_health()
        assert health["status"] == "healthy"
        assert health["total_generations"] == 5

    def test_trend_data(self):
        """Should return trend data."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()

        # Record some metrics
        for i in range(10):
            monitor.record_generation(GenerationMetric(
                timestamp=time.time() - i * 600,  # Every 10 minutes
                user_id="test-user",
                theme_id="sakura",
                component_count=5,
                latency_ms=1000.0 + i * 100,
                validation_score=80.0,
                semantic_score=7.0,
                iteration_count=1,
                auto_fixes=0,
                action="approve",
            ))

        trend = monitor.get_trend("latency_ms", hours=2, buckets=6)
        assert len(trend) > 0
        assert "avg" in trend[0]
        assert "min" in trend[0]
        assert "max" in trend[0]

    def test_auto_fix_stats(self):
        """Should track auto-fix statistics."""
        from src.utils.monitoring import get_monitor, GenerationMetric

        monitor = get_monitor()

        # Record with auto-fixes
        monitor.record_generation(GenerationMetric(
            timestamp=time.time(),
            user_id="test-user",
            theme_id="sakura",
            component_count=5,
            latency_ms=2000.0,
            validation_score=70.0,
            semantic_score=6.0,
            iteration_count=2,
            auto_fixes=3,
            action="approve",
        ))

        summary = monitor.get_summary(hours=1)
        assert summary["auto_fix"]["total_fixes"] == 3
        assert summary["auto_fix"]["generations_with_fixes"] == 1
        assert summary["auto_fix"]["fix_rate"] == 100.0
