"""MiniMax API adapter."""

import json
import httpx
from typing import List, Optional, Type
from pydantic import BaseModel
from .client import LLMClient, LLMResponse, Message, ModelProvider


class MiniMaxClient(LLMClient):
    """MiniMax API client."""
    
    provider = ModelProvider.MINIMAX
    
    def __init__(
        self,
        api_key: str,
        model: str = "abab6.5s-chat",
        base_url: str = "https://api.minimax.chat/v1"
    ):
        if not api_key:
            raise ValueError("MiniMax API key is required")
        
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """Call MiniMax API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": self.format_messages(messages),
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Structured output
        if schema:
            payload["response_format"] = {
                "type": "json_object"
            }
            # Add schema hint in last message
            schema_hint = f"\n\n请严格按照以下 JSON Schema 格式输出：\n{json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)}"
            formatted_messages = self.format_messages(messages)
            formatted_messages[-1]["content"] += schema_hint
            payload["messages"] = formatted_messages
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=data.get("model", self.model),
                input_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                output_tokens=data.get("usage", {}).get("completion_tokens", 0),
                finish_reason=data["choices"][0].get("finish_reason", "stop")
            )
        except httpx.HTTPError as e:
            raise RuntimeError(f"MiniMax API error: {e}")
    
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """Structured output."""
        response = await self.chat(messages, schema=schema, temperature=temperature)
        data = json.loads(response.content)
        return schema(**data)
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()