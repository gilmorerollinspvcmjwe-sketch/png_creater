"""Unified LLM client interface."""

from abc import ABC, abstractmethod
from typing import List, Optional, Type, Union
from pydantic import BaseModel
from enum import Enum


class ModelProvider(str, Enum):
    """LLM provider types."""
    MINIMAX = "minimax"
    QWEN = "qwen"
    MOCK = "mock"


class Message(BaseModel):
    """Chat message."""
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMResponse(BaseModel):
    """LLM response."""
    content: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    finish_reason: str = "stop"


class LLMClient(ABC):
    """Abstract LLM client interface."""
    
    provider: ModelProvider
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """
        Call LLM.
        
        Args:
            messages: Message list
            schema: Pydantic schema for structured output
            temperature: Temperature parameter
            max_tokens: Max token limit
        
        Returns:
            LLMResponse: Response from LLM
        """
        pass
    
    @abstractmethod
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """
        Structured output - force schema format.
        
        Args:
            messages: Message list
            schema: Pydantic schema
            temperature: Temperature
        
        Returns:
            BaseModel: Structured result
        """
        pass
    
    def format_messages(self, messages: List[Message]) -> List[dict]:
        """Format messages for API."""
        return [{"role": m.role, "content": m.content} for m in messages]


class MockLLMClient(LLMClient):
    """Mock LLM client for testing without API keys."""
    
    provider = ModelProvider.MOCK
    
    def __init__(self):
        self.mock_responses = {
            "intent": "new_page",
            "style": "sakura",
            "response": "好的！我来帮你生成一个漂亮的樱花风格主页！",
        }
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """Mock chat - returns predefined responses."""
        
        # Analyze last user message to determine mock response
        last_message = messages[-1].content.lower() if messages else ""
        
        # Intent classification
        if any(kw in last_message for kw in ["生成", "创建", "做一个", "帮我做"]):
            content = '{"intent": "new_page", "confidence": 0.95}'
        elif any(kw in last_message for kw in ["修改", "改", "换", "换成"]):
            content = '{"intent": "modify_page", "confidence": 0.9}'
        else:
            content = '{"intent": "chat", "confidence": 0.8}'
        
        return LLMResponse(
            content=content,
            model="mock-model",
            input_tokens=100,
            output_tokens=50,
            finish_reason="stop"
        )
    
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """Mock structured output."""
        # Return a default instance of the schema
        # This should be overridden in specific implementations
        response = await self.chat(messages, schema, temperature)
        
        # Try to create from mock JSON
        import json
        try:
            data = json.loads(response.content)
            return schema(**data)
        except:
            # Return default values based on schema fields
            # Handle both direct annotations and Optional/List wrappers
            default_data = {}
            for field_name, field_info in schema.model_fields.items():
                ann = field_info.annotation
                # Get the actual type, handling Optional and List
                origin = getattr(ann, '__origin__', None)
                if origin is list or str(ann).startswith('List['):
                    default_data[field_name] = []
                elif origin is dict or str(ann).startswith('Dict['):
                    default_data[field_name] = {}
                elif origin is Union or str(ann).startswith('Optional['):
                    # For Optional, get the inner type
                    args = getattr(ann, '__args__', (type(None),))
                    inner = args[0] if args and args[0] is not type(None) else str
                    if inner == str:
                        default_data[field_name] = ""
                    elif inner == int:
                        default_data[field_name] = 0
                    elif inner == float:
                        default_data[field_name] = 0.0
                    elif inner == bool:
                        default_data[field_name] = False
                    elif str(inner).startswith('List['):
                        default_data[field_name] = []
                    elif str(inner).startswith('Dict['):
                        default_data[field_name] = {}
                    else:
                        default_data[field_name] = None
                elif ann == str:
                    default_data[field_name] = ""
                elif ann == int:
                    default_data[field_name] = 0
                elif ann == float:
                    default_data[field_name] = 0.0
                elif ann == bool:
                    default_data[field_name] = False
                else:
                    default_data[field_name] = None
            return schema(**default_data)


class LLMClientManager:
    """LLM client manager with primary/fallback support."""
    
    def __init__(
        self,
        primary: LLMClient,
        fallback: Optional[LLMClient] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.primary = primary
        self.fallback = fallback
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """Call LLM with retry and fallback."""
        import asyncio
        
        last_error = None
        
        # Try primary
        for attempt in range(self.max_retries):
            try:
                return await self.primary.chat(
                    messages, schema, temperature, max_tokens
                )
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        # Try fallback
        if self.fallback:
            try:
                return await self.fallback.chat(
                    messages, schema, temperature, max_tokens
                )
            except Exception as e:
                last_error = e
        
        # All failed - if primary is mock, just use it directly
        if self.primary.provider == ModelProvider.MOCK:
            return await self.primary.chat(messages, schema, temperature, max_tokens)
        
        raise RuntimeError(f"LLM call failed: {last_error}")
    
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """Structured output with retry."""
        response = await self.chat(messages, schema=schema, temperature=temperature)
        
        import json
        data = json.loads(response.content)
        return schema(**data)


def create_llm_client(config) -> LLMClientManager:
    """Create LLM client manager from config."""
    from .minimax import MiniMaxClient
    from .qwen import QwenClient
    from .deepseek import DeepSeekClient
    
    # Check mock mode
    if config.llm.mock:
        mock_client = MockLLMClient()
        return LLMClientManager(primary=mock_client, fallback=None)
    
    # Create primary client
    if config.llm.provider == "minimax":
        primary = MiniMaxClient(
            api_key=config.llm.minimax_api_key,
            model=config.llm.minimax_model,
            base_url=config.llm.minimax_base_url
        )
        fallback = None
        if config.llm.qwen_api_key:
            fallback = QwenClient(
                api_key=config.llm.qwen_api_key,
                model=config.llm.qwen_model,
                base_url=config.llm.qwen_base_url
            )
    elif config.llm.provider == "qwen":
        primary = QwenClient(
            api_key=config.llm.qwen_api_key,
            model=config.llm.qwen_model,
            base_url=config.llm.qwen_base_url
        )
        fallback = None
        if config.llm.minimax_api_key:
            fallback = MiniMaxClient(
                api_key=config.llm.minimax_api_key,
                model=config.llm.minimax_model,
                base_url=config.llm.minimax_base_url
            )
    elif config.llm.provider == "deepseek":
        primary = DeepSeekClient(
            api_key=config.llm.deepseek_api_key,
            model=config.llm.deepseek_model,
            base_url=config.llm.deepseek_base_url
        )
        fallback = None
        if config.llm.qwen_api_key:
            fallback = QwenClient(
                api_key=config.llm.qwen_api_key,
                model=config.llm.qwen_model,
                base_url=config.llm.qwen_base_url
            )
    else:
        raise ValueError(f"Unknown LLM provider: {config.llm.provider}")
    
    return LLMClientManager(primary=primary, fallback=fallback)