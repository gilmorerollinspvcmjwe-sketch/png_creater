"""StateGraph-based pipeline for page generation.

Phase 2: Integrates Planner → Builder → Validator → (repair loop) → Human Review
into a cohesive StateGraph pipeline.
"""

from typing import Dict, Any, Optional, Callable, Awaitable
from dataclasses import field

from .graph import StateGraph
from .base import AgentResponse
from ..memory.session import Session, SessionState


# ============================================================================
# Pipeline nodes
# ============================================================================

async def plan_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Plan node: analyze user input, generate execution plan."""
    from .planner import PlannerAgent
    from ..memory.session import Session

    session_id = state.get("session_id", "pipeline")
    user_input = state.get("user_input", "")
    profile = state.get("profile", {})

    # Create a temporary session for planning
    session = Session(id=session_id)
    if profile:
        session.save_profile(profile)

    planner = PlannerAgent(
        llm_client=state.get("llm_client"),
        memory=None,
        tool_registry=None,
    )

    # 计划阶段要读取外部上下文，例如前端指定的主题覆盖。
    response = await planner.run(user_input, session, context=state.get("context"))
    plan_data = response.action.get("data", {}).get("plan", {})

    state["plan"] = plan_data
    state["profile"] = session.get_profile() or profile

    return state


async def build_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Build node: use BuilderAgent to generate config."""
    from .builder import BuilderAgent

    profile = state.get("profile", {})
    plan = state.get("plan", {})
    theme_id = plan.get("theme_id", "sakura")
    skill_id = plan.get("skill_id")

    builder = BuilderAgent(llm_call=state.get("llm_call"))
    result = await builder.build(
        user_profile=profile,
        theme_id=theme_id,
        skill_id=skill_id,
    )

    state["config"] = result.get("config")
    state["build_reasoning"] = result.get("reasoning", "")

    return state


async def validate_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Validate node: three-layer validation."""
    from .validator import ValidatorAgent

    config = state.get("config", {})
    profile = state.get("profile", {})
    plan = state.get("plan", {})
    theme_id = plan.get("theme_id", "sakura")

    validator = ValidatorAgent(
        llm_client=state.get("llm_client"),
        memory=None,
        tool_registry=None,
    )

    report = await validator.validate(
        config=config,
        profile=profile,
        theme_id=theme_id,
    )

    state["validation_report"] = report.model_dump()

    return state


async def repair_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Repair node: auto-fix validation issues."""
    from ..tools.repair_component import auto_fix_issues

    config = state.get("config", {})
    report = state.get("validation_report", {})

    # Collect all fixable issues
    all_issues = []
    all_issues.extend(report.get("l1_schema_issues", []))
    all_issues.extend(report.get("l3_business_issues", []))

    if all_issues:
        fixed_config, fixes, remaining = auto_fix_issues(config, all_issues)
        state["config"] = fixed_config
        state.setdefault("repair_log", []).append({
            "fixes_applied": fixes,
            "remaining_issues": remaining,
        })

    state["iteration_count"] = state.get("iteration_count", 0) + 1

    return state


# ============================================================================
# Conditional edges
# ============================================================================

def decide_after_plan(state: Dict[str, Any]) -> str:
    """After planning, decide whether to build or end."""
    plan = state.get("plan", {})
    intent = plan.get("intent", "chat")

    if intent in ("new_page", "modify_page"):
        return "build"
    return "__end__"


def decide_after_build(state: Dict[str, Any]) -> str:
    """After building, always validate."""
    config = state.get("config")
    if config:
        return "validate"
    # Build failed, end with error
    state["error"] = "BuilderAgent 生成配置失败"
    return "__end__"


def decide_after_validate(state: Dict[str, Any]) -> str:
    """After validation, decide: pass → done, fail → repair or done."""
    report = state.get("validation_report", {})
    passed = report.get("passed", False)

    if passed:
        return "__end__"

    # Check if auto-fix is possible
    can_auto_fix = report.get("can_auto_fix", False)
    iteration_count = state.get("iteration_count", 0)
    max_iterations = state.get("max_iterations", 3)

    if can_auto_fix and iteration_count < max_iterations:
        return "repair"

    # Max iterations or can't auto-fix
    state["error"] = f"校验未通过，已尝试 {iteration_count} 次修复"
    return "__end__"


def decide_after_repair(state: Dict[str, Any]) -> str:
    """After repair, go back to validate."""
    return "validate"


# ============================================================================
# Pipeline builder
# ============================================================================

def create_generation_pipeline(
    llm_client=None,
    llm_call=None,
    max_iterations: int = 3,
) -> StateGraph:
    """Create the full StateGraph pipeline.

    Args:
        llm_client: LLM client for agents that need it
        llm_call: LLM call wrapper for BuilderAgent
        max_iterations: Max repair iterations before giving up

    Returns:
        Configured StateGraph
    """
    graph = StateGraph()

    # Add nodes
    graph.add_node("plan", plan_node)
    graph.add_node("build", build_node)
    graph.add_node("validate", validate_node)
    graph.add_node("repair", repair_node)

    # Add edges
    graph.add_conditional_edge("plan", decide_after_plan)
    graph.add_conditional_edge("build", decide_after_build)
    graph.add_conditional_edge("validate", decide_after_validate)
    graph.add_conditional_edge("repair", decide_after_repair)

    return graph


async def run_pipeline(
    user_input: str,
    profile: Dict[str, Any],
    session_id: str = "pipeline",
    llm_client=None,
    llm_call=None,
    theme_id: str = "sakura",
    max_iterations: int = 3,
) -> Dict[str, Any]:
    """Run the full page generation pipeline.

    Args:
        user_input: User's request text
        profile: User profile dict
        session_id: Session identifier
        llm_client: LLM client
        llm_call: LLM call wrapper
        theme_id: Theme override
        max_iterations: Max repair attempts

    Returns:
        Final state dict with config, validation report, etc.
    """
    graph = create_generation_pipeline(
        llm_client=llm_client,
        llm_call=llm_call,
        max_iterations=max_iterations,
    )

    initial_state = {
        "session_id": session_id,
        "user_input": user_input,
        "profile": profile,
        "iteration_count": 0,
        "max_iterations": max_iterations,
        "context": {"theme_id": theme_id} if theme_id else None,
        "llm_client": llm_client,
        "llm_call": llm_call,
    }

    final_state = await graph.run(initial_state, max_steps=20)
    return final_state
