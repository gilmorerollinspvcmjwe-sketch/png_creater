"""验证 DesignAgent 主生成链路走 Planner → Builder → Validator。

这个文件覆盖 API 主路径和 DesignAgent V2 路径，防止后续退回到
“LLM 直接生成完整 JSON”的不稳定实现。
"""

import pytest

from src.agents.design import DesignAgent
from src.llm.client import MockLLMClient
from src.main import WorkflowCollector, _run_design_agent_with_workflow
from src.memory.session import Session, SessionMemory, SessionState
from src.tools.base import get_tool_registry


def _make_design_agent() -> DesignAgent:
    """创建启用 V2 主链路的 DesignAgent。"""
    return DesignAgent(
        llm_client=MockLLMClient(),
        memory=SessionMemory(use_redis=False),
        tool_registry=get_tool_registry(),
        use_v2=True,
    )


def _make_ready_session() -> Session:
    """创建已经具备生成所需画像信息的会话。"""
    session = Session(id="pipeline-session", state=SessionState.COLLECTING)
    session.save_profile({
        "mbti": "INFP",
        "oshi": [{"name": "初音未来"}],
        "hobbies": ["追番", "听音乐"],
    })
    return session


@pytest.mark.asyncio
async def test_design_v2_reports_planner_builder_validator_pipeline():
    """DesignAgent V2 生成结果要暴露计划、构建、校验三段信息。"""
    agent = _make_design_agent()
    session = _make_ready_session()

    response = await agent.run(
        "帮我做一个樱花风主页，我是 INFP，推是初音未来",
        session,
        context={},
    )

    data = response.action.get("data", {})
    assert data.get("pipeline") == "planner_builder_validator"
    assert data.get("plan", {}).get("intent") == "new_page"
    assert data.get("validation", {}).get("passed") is True
    assert response.current_config is not None
    assert session.state == SessionState.PREVIEW


@pytest.mark.asyncio
async def test_workflow_design_generation_uses_stable_pipeline_not_full_json_llm():
    """API 工作流提示应体现稳定链路，而不是提示 LLM 直接生成完整配置。"""
    agent = _make_design_agent()
    session = _make_ready_session()
    workflow = WorkflowCollector()

    response = await _run_design_agent_with_workflow(
        agent,
        "帮我做一个樱花风主页，我是 INFP，推是初音未来",
        session,
        {},
        workflow,
    )

    workflow_text = "\n".join(step.message for step in workflow.steps)
    assert response.action.get("data", {}).get("pipeline") == "planner_builder_validator"
    assert "Planner" in workflow_text
    assert "Builder" in workflow_text
    assert "Validator" in workflow_text
    assert "调用 LLM 生成完整配置" not in workflow_text
