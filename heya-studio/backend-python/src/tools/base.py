"""Tool base classes and registry."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel
from enum import Enum


class ToolType(str, Enum):
    """Tool execution type."""
    READ = "read"          # Read-only, can run concurrently
    WRITE = "write"        # Write operations, must be serial
    LLM = "llm"            # LLM call
    LOCAL = "local"        # Local computation
    INTERACTION = "interaction"  # User interaction


class ToolPermission(str, Enum):
    """Tool permission level."""
    PUBLIC = "public"      # All users
    AUTHENTICATED = "authenticated"  # Logged-in users
    PRO = "pro"            # Pro tier users
    ADMIN = "admin"        # Admin only


InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)


class BaseTool(ABC, Generic[InputT, OutputT]):
    """Base tool class."""
    
    name: str
    description: str
    tool_type: ToolType
    permission: ToolPermission = ToolPermission.AUTHENTICATED
    
    @abstractmethod
    async def execute(self, input_data: InputT) -> OutputT:
        """Execute tool."""
        pass
    
    @abstractmethod
    def get_input_schema(self) -> type[InputT]:
        """Get input schema."""
        pass
    
    @abstractmethod
    def get_output_schema(self) -> type[OutputT]:
        """Get output schema."""
        pass


class ToolRegistry:
    """Tool registry for managing available tools."""
    
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool):
        """Register a tool."""
        self._tools[tool.name] = tool
    
    def get(self, name: str) -> Optional[BaseTool]:
        """Get tool by name."""
        return self._tools.get(name)
    
    def list_tools(self, tool_type: Optional[ToolType] = None) -> List[BaseTool]:
        """List all tools, optionally filtered by type."""
        tools = list(self._tools.values())
        if tool_type:
            tools = [t for t in tools if t.tool_type == tool_type]
        return tools
    
    def list_names(self) -> List[str]:
        """List all tool names."""
        return list(self._tools.keys())
    
    def check_permission(self, tool_name: str, user_tier: str = "free") -> bool:
        """Check if user can use this tool."""
        tool = self._tools.get(tool_name)
        if not tool:
            return False
        
        if tool.permission == ToolPermission.PUBLIC:
            return True
        if tool.permission == ToolPermission.AUTHENTICATED:
            return user_tier in ["free", "pro", "enterprise"]
        if tool.permission == ToolPermission.PRO:
            return user_tier in ["pro", "enterprise"]
        if tool.permission == ToolPermission.ADMIN:
            return user_tier == "admin"
        
        return False


# Global tool registry
tool_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get global tool registry."""
    global tool_registry
    if tool_registry is None:
        tool_registry = ToolRegistry()
        _register_default_tools()
    return tool_registry


def _register_default_tools():
    """Register default tools."""
    from .templates import QueryTemplatesTool
    from .components import SearchComponentsTool
    from .config import GenerateConfigTool, ValidateConfigTool, ModifyConfigTool
    from .skills import ApplySkillTool
    from .assemble_config import AssembleConfigTool
    from .auto_layout import AutoLayoutTool
    from .suggest_components import SuggestComponentsTool
    from .personalized_text import GeneratePersonalizedTextTool
    # Phase 4: LLM-driven tools
    from .theme_matcher import ThemeMatcherTool
    from .layout_strategy import LayoutStrategyTool
    from .semantic_validator import LLMSemanticValidator
    
    registry = tool_registry
    
    # Register all default tools
    registry.register(QueryTemplatesTool())
    registry.register(SearchComponentsTool())
    registry.register(GenerateConfigTool())
    registry.register(ValidateConfigTool())
    registry.register(ModifyConfigTool())
    registry.register(ApplySkillTool())
    
    # Phase 1 MVP: new tools for builder pipeline
    registry.register(AssembleConfigTool())
    registry.register(AutoLayoutTool())
    registry.register(SuggestComponentsTool())
    registry.register(GeneratePersonalizedTextTool())
    
    # Phase 4: LLM-driven strategy and validation tools
    registry.register(ThemeMatcherTool())
    registry.register(LayoutStrategyTool())
    registry.register(LLMSemanticValidator())