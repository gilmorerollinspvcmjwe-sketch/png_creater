"""Agent base class."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from enum import Enum


class AgentType(str, Enum):
    """Agent types."""
    ROUTER = "router"
    DESIGN = "design"
    MODIFY = "modify"
    CHAT = "chat"
    PROFILE_EXTRACT = "profile_extract"
    COMPONENT_SEARCH = "component_search"
    VALIDATION = "validation"


class AgentResponse(BaseModel):
    """Agent response."""
    session_id: str
    response: str
    action: Optional[Dict[str, Any]] = None
    current_config: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[Dict[str, Any]]] = None
    requires_confirmation: bool = False
    state: Optional[str] = None


class BaseAgent(ABC):
    """Base agent class."""

    agent_type: AgentType
    name: str
    description: str
    max_iterations: int = 5
    timeout_ms: int = 30000

    def __init__(
        self,
        llm_client: "LLMClientManager",
        memory: "SessionMemory",
        tool_registry: "ToolRegistry"
    ):
        self.llm = llm_client
        self.memory = memory
        self.tools = tool_registry

    @abstractmethod
    async def run(
        self,
        user_input: str,
        session: "Session",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Run agent.

        Args:
            user_input: User input message
            session: Session data
            context: Additional context

        Returns:
            AgentResponse: Agent response
        """
        pass

    def get_system_prompt(self) -> str:
        """Get agent system prompt."""
        return ""

    async def call_llm(
        self,
        messages: List[Dict[str, str]],
        schema: Optional[type] = None
    ) -> Any:
        """Call LLM with messages.
        
        If schema is provided, returns the BaseModel instance directly.
        Otherwise, returns a dict with 'content' key.
        """
        from ..llm.client import Message

        formatted_messages = [
            Message(role=m["role"], content=m["content"])
            for m in messages
        ]

        if schema:
            result = await self.llm.chat_with_schema(
                messages=formatted_messages,
                schema=schema,
                temperature=0.7
            )
            # Return the BaseModel instance directly, not model_dump()
            return result
        else:
            response = await self.llm.chat(
                messages=formatted_messages,
                temperature=0.7
            )
            import json
            return {"content": response.content}

    async def spawn_subagent(
        self,
        agent_type: AgentType,
        user_input: str,
        session: "Session",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Spawn a sub-agent."""
        # Get sub-agent from registry
        from . import get_agent

        subagent = get_agent(agent_type)
        if not subagent:
            raise ValueError(f"Unknown agent type: {agent_type}")

        # Run sub-agent
        return await subagent.run(user_input, session, context)