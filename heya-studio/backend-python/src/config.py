"""Configuration management for Heya Studio Backend."""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class LLMConfig(BaseModel):
    """LLM provider configuration."""
    provider: str = "deepseek"
    mock: bool = False
    
    # MiniMax
    minimax_api_key: Optional[str] = None
    minimax_model: str = "abab6.5s-chat"
    minimax_base_url: str = "https://api.minimax.chat/v1"
    
    # Qwen
    qwen_api_key: Optional[str] = None
    qwen_model: str = "qwen-plus"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    
    # DeepSeek
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"


class RedisConfig(BaseModel):
    """Redis configuration."""
    url: str = "redis://localhost:6379/0"
    enabled: bool = False


class SupabaseConfig(BaseModel):
    """Supabase configuration."""
    url: Optional[str] = None
    key: Optional[str] = None
    enabled: bool = False


class SecurityConfig(BaseModel):
    """Security and generation limits."""
    max_components: int = 12
    max_images: int = 8
    max_text_length: int = 5000
    max_config_size_kb: int = 100
    
    # Rate limits
    rate_limit_generate: int = 10
    rate_limit_chat: int = 30
    rate_limit_modify: int = 20


class ServerConfig(BaseModel):
    """Server configuration."""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True


class Config(BaseModel):
    """Main configuration."""
    llm: LLMConfig
    redis: RedisConfig
    supabase: SupabaseConfig
    security: SecurityConfig
    server: ServerConfig
    skills_dir: str = "src/skills"


def load_config() -> Config:
    """Load configuration from environment variables."""
    return Config(
        llm=LLMConfig(
            provider=os.getenv("LLM_PROVIDER", "deepseek"),
            mock=os.getenv("MOCK_LLM", "false").lower() == "true",
            minimax_api_key=os.getenv("MINIMAX_API_KEY"),
            minimax_model=os.getenv("MINIMAX_MODEL", "abab6.5s-chat"),
            minimax_base_url=os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1"),
            qwen_api_key=os.getenv("QWEN_API_KEY"),
            qwen_model=os.getenv("QWEN_MODEL", "qwen-plus"),
            qwen_base_url=os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/api/v1"),
            deepseek_api_key=os.getenv("DEEPSEEK_API_KEY"),
            deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            deepseek_base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        ),
        redis=RedisConfig(
            url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            enabled=os.getenv("REDIS_ENABLED", "false").lower() == "true",
        ),
        supabase=SupabaseConfig(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_KEY"),
            enabled=os.getenv("SUPABASE_ENABLED", "false").lower() == "true",
        ),
        security=SecurityConfig(
            max_components=int(os.getenv("MAX_COMPONENTS", "12")),
            max_images=int(os.getenv("MAX_IMAGES", "8")),
            max_text_length=int(os.getenv("MAX_TEXT_LENGTH", "5000")),
            max_config_size_kb=int(os.getenv("MAX_CONFIG_SIZE_KB", "100")),
            rate_limit_generate=int(os.getenv("RATE_LIMIT_GENERATE", "10")),
            rate_limit_chat=int(os.getenv("RATE_LIMIT_CHAT", "30")),
            rate_limit_modify=int(os.getenv("RATE_LIMIT_MODIFY", "20")),
        ),
        server=ServerConfig(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            debug=os.getenv("DEBUG", "true").lower() == "true",
        ),
        skills_dir=os.getenv("SKILLS_DIR", "src/skills"),
    )


# Global config instance
config = load_config()