"""Tests for StateGraph Pipeline - Phase 2 integration."""

import pytest
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.agents.pipeline import (
    plan_node, build_node, validate_node, repair_node,
    decide_after_plan, decide_after_build, decide_after_validate,
    decide_after_repair, create_generation_pipeline,
)


# ============================================================================
# Fixtures
# ============================================================================

def make_oshi_profile():
    return {
        "mbti": "INFP",
        "oshi": [{"name": "阿尼亚", "from_work": "Spy x Family"}],
        "hobbies": ["看动漫", "听音乐"],
        "style_preference": "sakura",
    }


def run_async(coro):
    """Helper to run async code in tests."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================================
# Pipeline Node Tests
# ============================================================================

class TestPlanNode:
    """Test the planning node."""

    def test_plan_node_runs(self):
        """Plan node should return state with plan."""
        state = {
            "session_id": "test-1",
            "user_input": "帮我做一个樱花风的个人主页，我是 INFP，喜欢阿尼亚",
            "profile": make_oshi_profile(),
        }

        result = run_async(plan_node(state))

        assert "plan" in result
        assert "profile" in result

    def test_plan_node_new_page_intent(self):
        """Plan node should detect new_page intent."""
        state = {
            "session_id": "test-1",
            "user_input": "生成一个新的主页",
            "profile": make_oshi_profile(),
        }

        result = run_async(plan_node(state))
        plan = result.get("plan", {})
        assert plan.get("intent") == "new_page"


class TestBuildNode:
    """Test the building node."""

    def test_build_node_generates_config(self):
        """Build node should generate a config dict."""
        state = {
            "session_id": "test-1",
            "user_input": "生成主页",
            "profile": make_oshi_profile(),
            "plan": {
                "intent": "new_page",
                "theme_id": "sakura",
                "skill_id": None,
            },
            "llm_call": None,
        }

        result = run_async(build_node(state))

        assert "config" in result
        assert result["config"] is not None
        assert "components" in result["config"]


class TestValidateNode:
    """Test the validation node."""

    def test_validate_node_runs_validation(self):
        """Validate node should produce a validation report."""
        from src.agents.builder import BuilderAgent

        # First build a config (async)
        builder = BuilderAgent()
        build_result = run_async(builder.build(
            user_profile=make_oshi_profile(),
            theme_id="sakura",
        ))

        state = {
            "session_id": "test-1",
            "user_input": "",
            "profile": make_oshi_profile(),
            "plan": {"theme_id": "sakura"},
            "config": build_result["config"],
            "llm_client": None,
        }

        result = run_async(validate_node(state))

        assert "validation_report" in result
        report = result["validation_report"]
        assert "passed" in report
        assert "overall_score" in report


class TestRepairNode:
    """Test the repair node."""

    def test_repair_node_fixes_issues(self):
        """Repair node should apply fixes to config."""
        # Create a config with a known issue
        state = {
            "session_id": "test-1",
            "config": {
                "version": "1.0",
                "theme": {"id": ""},  # Missing theme ID
                "layout": {"width": 680, "height": 1000, "responsive": True},
                "components": [
                    {
                        "id": "hero-1",
                        "type": "hero-section",
                        "position": {"x": 0, "y": 0, "width": 680, "height": 200},
                        "props": {"title": "Welcome"},
                    },
                ],
            },
            "validation_report": {
                "l1_schema_issues": [
                    {
                        "severity": "error",
                        "code": "MISSING_THEME_ID",
                        "message": "缺少主题 ID",
                    }
                ],
                "l3_business_issues": [],
            },
            "repair_log": [],
        }

        result = run_async(repair_node(state))

        # Theme should be fixed
        assert result["config"]["theme"]["id"] == "sakura"
        assert len(result.get("repair_log", [])) > 0


# ============================================================================
# Conditional Edge Tests
# ============================================================================

class TestConditionalEdges:
    """Test the conditional edge decision functions."""

    def test_decide_after_plan_new_page(self):
        """New page intent should go to build."""
        state = {
            "plan": {"intent": "new_page", "theme_id": "sakura"},
        }
        assert decide_after_plan(state) == "build"

    def test_decide_after_plan_modify_page(self):
        """Modify page intent should go to build."""
        state = {
            "plan": {"intent": "modify_page"},
        }
        assert decide_after_plan(state) == "build"

    def test_decide_after_plan_chat(self):
        """Chat intent should end."""
        state = {
            "plan": {"intent": "chat"},
        }
        assert decide_after_plan(state) == "__end__"

    def test_decide_after_build_with_config(self):
        """Build with config should go to validate."""
        state = {"config": {"version": "1.0"}}
        assert decide_after_build(state) == "validate"

    def test_decide_after_build_without_config(self):
        """Build without config should end with error."""
        state = {"config": None}
        assert decide_after_build(state) == "__end__"
        assert "error" in state

    def test_decide_after_validate_pass(self):
        """Validation pass should end."""
        state = {
            "validation_report": {"passed": True},
            "iteration_count": 0,
        }
        assert decide_after_validate(state) == "__end__"

    def test_decide_after_validate_can_repair(self):
        """Validation fail with auto-fix should go to repair."""
        state = {
            "validation_report": {
                "passed": False,
                "can_auto_fix": True,
            },
            "iteration_count": 0,
            "max_iterations": 3,
        }
        assert decide_after_validate(state) == "repair"

    def test_decide_after_validate_max_iterations(self):
        """Validation fail at max iterations should end."""
        state = {
            "validation_report": {
                "passed": False,
                "can_auto_fix": True,
            },
            "iteration_count": 3,
            "max_iterations": 3,
        }
        assert decide_after_validate(state) == "__end__"

    def test_decide_after_repair(self):
        """After repair, always go back to validate."""
        state = {"config": {}}
        assert decide_after_repair(state) == "validate"


# ============================================================================
# Pipeline Creation Tests
# ============================================================================

class TestPipelineCreation:
    """Test pipeline creation and configuration."""

    def test_create_generation_pipeline(self):
        """Should create a valid StateGraph pipeline."""
        graph = create_generation_pipeline()
        assert graph is not None

        # Check nodes exist (use internal _nodes attribute)
        assert "plan" in graph._nodes
        assert "build" in graph._nodes
        assert "validate" in graph._nodes
        assert "repair" in graph._nodes

    def test_pipeline_with_custom_max_iterations(self):
        """Should accept custom max_iterations."""
        graph = create_generation_pipeline(max_iterations=5)
        assert graph is not None
