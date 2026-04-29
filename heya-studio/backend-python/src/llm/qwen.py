"""Qwen (Alibaba DashScope) API adapter."""

import json
import httpx
from typing import List, Optional, Type
from pydantic import BaseModel
from .client import LLMClient, LLMResponse, Message, ModelProvider


class QwenClient(LLMClient):
    """Qwen API client via DashScope."""
    
    provider = ModelProvider.QWEN
    
    def __init__(
        self,
        api_key: str,
        model: str = "qwen-plus",
        base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    ):
        if not api_key:
            raise ValueError("Qwen API key is required")
        
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
        """Call Qwen API via DashScope."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": {
                "messages": self.format_messages(messages)
            },
            "parameters": {
                "temperature": temperature,
                "max_tokens": max_tokens,
                "result_format": "message"
            }
        }
        
        # Structured output
        if schema:
            payload["parameters"]["result_format"] = "json"
            schema_hint = f"\n\n请严格按照以下 JSON Schema 格式输出：\n{json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)}"
            formatted_messages = self.format_messages(messages)
            formatted_messages[-1]["content"] += schema_hint
            payload["input"]["messages"] = formatted_messages
        
        try:
            response = await self.client.post(
                f"{self.base_url}/services/aigc/text-generation/generation",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return LLMResponse(
                content=data["output"]["choices"][0]["message"]["content"],
                model=data.get("model", self.model),
                input_tokens=data.get("usage", {}).get("input_tokens", 0),
                output_tokens=data.get("usage", {}).get("output_tokens", 0),
                finish_reason=data["output"]["choices"][0].get("finish_reason", "stop")
            )
        except httpx.HTTPError as e:
            raise RuntimeError(f"Qwen API error: {e}")
    
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