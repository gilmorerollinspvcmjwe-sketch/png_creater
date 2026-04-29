"""Guardrails - Generation limits and safety checks."""

from typing import Dict, Any
from pydantic import BaseModel
from enum import Enum


class UserTier(str, Enum):
    """User tier for limits."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class GenerationLimits(BaseModel):
    """Generation limits."""
    max_components: int = 12
    max_images: int = 8
    max_text_length: int = 5000
    max_config_size_kb: int = 100
    max_iterations: int = 10


# Limits by tier
TIER_LIMITS: Dict[UserTier, GenerationLimits] = {
    UserTier.FREE: GenerationLimits(
        max_components=8,
        max_images=5,
        max_text_length=3000,
        max_config_size_kb=50,
        max_iterations=5
    ),
    UserTier.PRO: GenerationLimits(
        max_components=20,
        max_images=20,
        max_text_length=10000,
        max_config_size_kb=200,
        max_iterations=15
    ),
    UserTier.ENTERPRISE: GenerationLimits(
        max_components=100,
        max_images=100,
        max_text_length=50000,
        max_config_size_kb=1000,
        max_iterations=50
    )
}


def get_limits(user_tier: UserTier = UserTier.FREE) -> GenerationLimits:
    """Get limits for user tier."""
    return TIER_LIMITS[user_tier]


def check_config_limits(config: Dict[str, Any], user_tier: UserTier = UserTier.FREE) -> Dict[str, Any]:
    """Check if config meets limits."""
    limits = get_limits(user_tier)
    issues = []
    
    # Check components count
    components = config.get("components", [])
    if len(components) > limits.max_components:
        issues.append({
            "type": "component_limit",
            "message": f"组件数量 {len(components)} 超过限制 {limits.max_components}",
            "severity": "error"
        })
    
    # Check images
    image_count = 0
    for comp in components:
        props = comp.get("props", {})
        if props.get("imageUrl") or props.get("avatarUrl") or props.get("coverUrl"):
            image_count += 1
    
    if image_count > limits.max_images:
        issues.append({
            "type": "image_limit",
            "message": f"图片数量 {image_count} 超过限制 {limits.max_images}",
            "severity": "warning"
        })
    
    return {
        "passed": len([i for i in issues if i["severity"] == "error"]) == 0,
        "issues": issues
    }


def estimate_config_size_kb(config: Dict[str, Any]) -> int:
    """Estimate config size in KB."""
    import json
    json_str = json.dumps(config, ensure_ascii=False)
    return len(json_str) // 1024


# Content safety checks
TRADEMARK_KEYWORDS = [
    "原神", "崩坏", "舰娘", "Fate", "EVA", "巨人", "进击的巨人",
    "鬼灭之刃", "咒术回战", "海贼王", "火影忍者"
]


def check_content_safety(content: str) -> Dict[str, Any]:
    """Check content for trademark/sensitive keywords."""
    warnings = []
    
    for keyword in TRADEMARK_KEYWORDS:
        if keyword.lower() in content.lower():
            warnings.append({
                "type": "trademark",
                "keyword": keyword,
                "message": f"内容包含作品关键词 '{keyword}'，请注意版权"
            })
    
    return {
        "passed": True,  # Trademarks are warnings, not blockers
        "warnings": warnings
    }