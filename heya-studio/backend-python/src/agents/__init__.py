"""Agents package."""

from .base import BaseAgent, AgentType, AgentResponse

# Import functions from the module that defines them
# (defined in this same __init__.py file previously)

__all__ = [
    "BaseAgent",
    "AgentType",
    "AgentResponse",
    "register_agent",
    "get_agent",
    "initialize_agents",
    "ensure_initialized",
]

# Late import of agent classes to avoid circular imports
def _import_agents():
    from .design import DesignAgent
    from .modify import ModifyAgent
    from .chat import ChatAgent
    from .profile_extract import ProfileExtractAgent
    from .component_search import ComponentSearchAgent
    from .validation import ValidationAgent
    return {
        "DesignAgent": DesignAgent,
        "ModifyAgent": ModifyAgent,
        "ChatAgent": ChatAgent,
        "ProfileExtractAgent": ProfileExtractAgent,
        "ComponentSearchAgent": ComponentSearchAgent,
        "ValidationAgent": ValidationAgent,
    }

# Define these after __all__ to avoid circular import issues
# These were previously in a separate module

_agent_registry = {}
_initialized = False

def register_agent(agent: BaseAgent):
    """Register an agent."""
    _agent_registry[agent.agent_type] = agent

def get_agent(agent_type: AgentType):
    """Get agent by type."""
    return _agent_registry.get(agent_type)

def initialize_agents(llm_client, memory, tool_registry):
    """Initialize all agents."""
    agents_module = _import_agents()
    from ..router.agent import RouterAgent
    
    agents = {
        AgentType.ROUTER: RouterAgent(llm_client, memory, tool_registry),
        # 当前主线启用 V2：Planner 理解、Builder 生成、Validator 兜底。
        AgentType.DESIGN: agents_module['DesignAgent'](
            llm_client, memory, tool_registry, use_v2=True
        ),
        AgentType.MODIFY: agents_module['ModifyAgent'](llm_client, memory, tool_registry),
        AgentType.CHAT: agents_module['ChatAgent'](llm_client, memory, tool_registry),
        AgentType.PROFILE_EXTRACT: agents_module['ProfileExtractAgent'](llm_client, memory, tool_registry),
        AgentType.COMPONENT_SEARCH: agents_module['ComponentSearchAgent'](llm_client, memory, tool_registry),
        AgentType.VALIDATION: agents_module['ValidationAgent'](llm_client, memory, tool_registry),
    }
    
    for agent_type, agent in agents.items():
        register_agent(agent)
    
    return agents

def ensure_initialized():
    """Ensure agents are initialized."""
    global _initialized
    if _initialized:
        return
    
    from ..config import config
    from ..llm.client import create_llm_client
    from ..memory.session import get_session_memory
    from ..tools.base import get_tool_registry
    
    llm_client = create_llm_client(config)
    memory = get_session_memory()
    tool_registry = get_tool_registry()
    
    initialize_agents(llm_client, memory, tool_registry)
    _initialized = True
