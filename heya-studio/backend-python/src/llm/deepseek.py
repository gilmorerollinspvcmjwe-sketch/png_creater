"""DeepSeek API adapter (OpenAI-compatible)."""

import json
import httpx
from typing import List, Optional, Type
from pydantic import BaseModel
from .client import LLMClient, LLMResponse, Message, ModelProvider


class DeepSeekClient(LLMClient):
    """DeepSeek API client via OpenAI-compatible interface."""
    
    provider = ModelProvider.QWEN  # Reuse QWEN slot as "non-minimax" provider
    
    def __init__(
        self,
        api_key: str,
        model: str = "deepseek-chat",
        base_url: str = "https://api.deepseek.com"
    ):
        if not api_key:
            raise ValueError("DeepSeek API key is required")
        
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """Call DeepSeek API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": self.format_messages(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        # Structured output via schema hint
        if schema:
            schema_hint = f"\n\n请严格按照以下 JSON Schema 格式输出，只输出合法 JSON，不要添加任何其他文字：\n```json\n{json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)}\n```"
            formatted_messages = self.format_messages(messages)
            formatted_messages[-1]["content"] += schema_hint
            payload["messages"] = formatted_messages
            payload["response_format"] = {"type": "json_object"}
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            
            choice = data["choices"][0]
            return LLMResponse(
                content=choice["message"]["content"],
                model=data.get("model", self.model),
                input_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                output_tokens=data.get("usage", {}).get("completion_tokens", 0),
                finish_reason=choice.get("finish_reason", "stop"),
            )
        except httpx.HTTPStatusError as e:
            body = ""
            try:
                body = e.response.text
            except Exception:
                pass
            raise RuntimeError(f"DeepSeek API HTTP {e.response.status_code}: {body}")
        except httpx.HTTPError as e:
            raise RuntimeError(f"DeepSeek API error: {e}")
    
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
