"""Validation Agent - Validates page configuration."""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session


class ValidationAgent(BaseAgent):
    """Validation agent."""
    
    agent_type = AgentType.VALIDATION
    name = "Validation Agent"
    description = "校验配置合规性"
    max_iterations = 2
    timeout_ms = 5000
    
    SYSTEM_PROMPT = """你是一个配置验证专家。

验证页面配置：
1. 结构完整性：version、theme、layout、components
2. 类型正确性：组件类型必须是前端支持的
3. 数量限制：组件数量不超过限制
4. 内容安全：检查敏感词、版权问题

组件类型列表：
container, text, image, avatar, tag-group, social-links,
oshi-card, attribute-wall, friends-list, music-player,
quote, divider, spacer, hero-section, media-list

主题 ID：
sakura, lavender, mint, cream, night, pixel, mono, millennial"""
    
    VALID_COMPONENT_TYPES = [
        "container", "text", "image", "avatar", "tag-group",
        "social-links", "oshi-card", "attribute-wall",
        "friends-list", "music-player", "quote",
        "divider", "spacer", "hero-section", "media-list"
    ]
    
    VALID_THEME_IDS = [
        "sakura", "lavender", "mint", "cream",
        "night", "pixel", "mono", "millennial"
    ]
    
    def get_system_prompt(self) -> str:
        return self.SYSTEM_PROMPT
    
    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Validate configuration."""
        
        config = context.get("config", session.get_config()) or {}
        check_types = context.get("check_types", ["structure", "compatibility", "performance"])
        
        issues = []
        
        # Structure validation
        if "structure" in check_types:
            issues.extend(self._validate_structure(config))
        
        # Compatibility validation
        if "compatibility" in check_types:
            issues.extend(self._validate_compatibility(config))
        
        # Performance validation
        if "performance" in check_types:
            issues.extend(self._validate_performance(config))
        
        passed = len([i for i in issues if i["severity"] == "error"]) == 0
        score = 100.0 - len(issues) * 5
        
        return AgentResponse(
            session_id=session.id,
            response="",
            action={
                "type": "validate",
                "data": {
                    "passed": passed,
                    "issues": issues,
                    "score": score
                }
            },
            state=session.state.value
        )
    
    def _validate_structure(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate structure."""
        issues = []
        
        # Check version
        if config.get("version") != "1.0":
            issues.append({
                "severity": "warning",
                "code": "VERSION_MISMATCH",
                "message": "版本号应为 1.0",
                "field": "version"
            })
        
        # Check theme
        theme = config.get("theme", {})
        if not theme.get("id"):
            issues.append({
                "severity": "error",
                "code": "MISSING_THEME_ID",
                "message": "缺少主题 ID",
                "field": "theme.id"
            })
        
        # Check layout
        if not config.get("layout"):
            issues.append({
                "severity": "warning",
                "code": "MISSING_LAYOUT",
                "message": "缺少布局配置",
                "field": "layout"
            })
        
        return issues
    
    def _validate_compatibility(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate component compatibility."""
        issues = []
        
        theme_id = config.get("theme", {}).get("id", "")
        if theme_id and theme_id not in self.VALID_THEME_IDS:
            issues.append({
                "severity": "error",
                "code": "INVALID_THEME_ID",
                "message": f"无效主题 ID: {theme_id}",
                "field": "theme.id"
            })
        
        components = config.get("components", [])
        for i, comp in enumerate(components):
            comp_type = comp.get("type")
            if comp_type not in self.VALID_COMPONENT_TYPES:
                issues.append({
                    "severity": "error",
                    "code": "INVALID_COMPONENT_TYPE",
                    "message": f"无效组件类型: {comp_type}",
                    "field": f"components[{i}].type"
                })
            
            # Check required fields
            if not comp.get("id"):
                issues.append({
                    "severity": "error",
                    "code": "MISSING_COMPONENT_ID",
                    "message": "组件缺少 ID",
                    "field": f"components[{i}].id"
                })
        
        return issues
    
    def _validate_performance(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate performance limits."""
        issues = []
        
        from ..guardrails.limits import get_limits, check_config_limits
        
        limits = get_limits()
        
        # Check component count
        components = config.get("components", [])
        if len(components) > limits.max_components:
            issues.append({
                "severity": "warning",
                "code": "COMPONENT_LIMIT",
                "message": f"组件数量 {len(components)} 超过建议值 {limits.max_components}",
                "suggestion": "减少组件数量以提升加载速度"
            })
        
        # Check image count
        image_count = 0
        for comp in components:
            props = comp.get("props", {})
            if props.get("imageUrl") or props.get("avatarUrl") or props.get("coverUrl"):
                image_count += 1
        
        if image_count > limits.max_images:
            issues.append({
                "severity": "warning",
                "code": "IMAGE_LIMIT",
                "message": f"图片数量 {image_count} 超过建议值 {limits.max_images}",
                "suggestion": "减少图片数量以提升加载速度"
            })
        
        return issues