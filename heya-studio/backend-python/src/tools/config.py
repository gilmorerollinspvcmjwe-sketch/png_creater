"""Config generation, validation, and modification tools."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission
from ..models.page import (
    BackendPageConfig,
    BackendComponentConfig,
    ComponentPosition,
    ThemeConfig,
    ThemeColors,
    ThemeFonts,
    LayoutConfig,
    PageMetadata,
    create_hero_section,
    create_oshi_card,
    create_attribute_wall,
    create_tag_group,
    create_music_player,
    create_social_links,
    create_quote,
)


class GenerateConfigInput(BaseModel):
    """Input for config generation."""
    user_profile: Dict[str, Any] = Field(..., description="User profile data")
    theme_id: str = Field(default="sakura", description="Theme ID")
    components: Optional[List[str]] = Field(None, description="Component types to include")


class GenerateConfigOutput(BaseModel):
    """Output for config generation."""
    config: BackendPageConfig
    reasoning: str = ""


class ValidateConfigInput(BaseModel):
    """Input for config validation."""
    config: Dict[str, Any] = Field(..., description="Config to validate")


class ValidationIssue(BaseModel):
    """Validation issue."""
    severity: str = Field(..., description="error, warning, info")
    code: str
    message: str
    field: Optional[str] = None


class ValidateConfigOutput(BaseModel):
    """Output for config validation."""
    passed: bool
    issues: List[ValidationIssue] = Field(default_factory=list)
    score: float = Field(default=100.0)


class ModifyConfigInput(BaseModel):
    """Input for config modification."""
    config: Dict[str, Any] = Field(..., description="Current config")
    instruction: str = Field(..., description="Modification instruction")
    target_ids: Optional[List[str]] = Field(None, description="Target component IDs")
    llm_params: Optional[Dict[str, Any]] = Field(None, description="LLM 解析的参数")


class ModifyConfigOutput(BaseModel):
    """Output for config modification."""
    config: Dict[str, Any]
    changes: List[Dict[str, Any]] = Field(default_factory=list)
    success: bool = True


# Theme configurations
THEME_CONFIGS = {
    "sakura": {
        "colors": {
            "primary": "#F2A7B3",
            "secondary": "#FFEEF2",
            "accent": "#E8D4E8",
            "text": "#2A2A2A",
            "background": "#FFF5F8"
        },
        "fonts": {
            "heading": "Noto Sans SC",
            "body": "Noto Sans SC"
        }
    },
    "lavender": {
        "colors": {
            "primary": "#B8A9C9",
            "secondary": "#E6E0F0",
            "accent": "#D4C5E0",
            "text": "#2A2A2A",
            "background": "#F5F0FA"
        },
        "fonts": {
            "heading": "Noto Sans SC",
            "body": "Noto Sans SC"
        }
    },
    "mint": {
        "colors": {
            "primary": "#98D4BB",
            "secondary": "#E0F5E8",
            "accent": "#C4E4D0",
            "text": "#2A2A2A",
            "background": "#F5FAF8"
        },
        "fonts": {
            "heading": "Noto Sans SC",
            "body": "Noto Sans SC"
        }
    },
    "cream": {
        "colors": {
            "primary": "#E8D4B8",
            "secondary": "#F5F0E8",
            "accent": "#D4C4A8",
            "text": "#2A2A2A",
            "background": "#FAF8F5"
        },
        "fonts": {
            "heading": "Noto Sans SC",
            "body": "Noto Sans SC"
        }
    },
    "night": {
        "colors": {
            "primary": "#4A90D9",
            "secondary": "#1A1A2A",
            "accent": "#00D4FF",
            "text": "#FFFFFF",
            "background": "#0D0D1A"
        },
        "fonts": {
            "heading": "Orbitron",
            "body": "Noto Sans SC"
        }
    },
    "pixel": {
        "colors": {
            "primary": "#4CAF50",
            "secondary": "#2E7D32",
            "accent": "#8BC34A",
            "text": "#1B5E20",
            "background": "#C8E6C9"
        },
        "fonts": {
            "heading": "Press Start 2P",
            "body": "Noto Sans SC"
        }
    },
    "mono": {
        "colors": {
            "primary": "#333333",
            "secondary": "#FFFFFF",
            "accent": "#666666",
            "text": "#1A1A1A",
            "background": "#FFFFFF"
        },
        "fonts": {
            "heading": "Noto Sans SC",
            "body": "Noto Sans SC"
        }
    },
    "millennial": {
        "colors": {
            "primary": "#FF6B6B",
            "secondary": "#4ECDC4",
            "accent": "#FFE66D",
            "text": "#2A2A2A",
            "background": "#F7F7F7"
        },
        "fonts": {
            "heading": "Montserrat",
            "body": "Noto Sans SC"
        }
    }
}


class GenerateConfigTool(BaseTool[GenerateConfigInput, GenerateConfigOutput]):
    """Tool for generating page configuration."""
    
    name = "generate_config"
    description = "生成页面配置"
    tool_type = ToolType.LLM
    permission = ToolPermission.AUTHENTICATED
    
    async def execute(self, input_data: GenerateConfigInput) -> GenerateConfigOutput:
        """Generate page config from user profile."""
        profile = input_data.user_profile
        theme_id = input_data.theme_id
        
        # Get theme config
        theme_data = THEME_CONFIGS.get(theme_id, THEME_CONFIGS["sakura"])
        
        # Build components based on profile
        components = []
        y_offset = 0
        
        # Hero section
        name = profile.get("oshi", [{}])[0].get("name", "用户") if profile.get("oshi") else "用户"
        mbti = profile.get("mbti", "INFP")
        
        hero = create_hero_section(
            name=name,
            signature="探索无限可能 ✨",
            attributes={"MBTI": mbti}
        )
        hero.position = ComponentPosition(x=0, y=y_offset, width=680, height=200)
        components.append(hero)
        y_offset += 210
        
        # Oshi card if has oshi
        if profile.get("oshi"):
            for oshi in profile.get("oshi", [])[:2]:  # Max 2 oshi cards
                oshi_card = create_oshi_card(
                    name=oshi.get("name", "推"),
                    from_work=oshi.get("from_work"),
                    description=oshi.get("description")
                )
                oshi_card.position = ComponentPosition(x=0, y=y_offset, width=340, height=200)
                components.append(oshi_card)
                y_offset += 210
        
        # Attribute wall
        attr_wall = create_attribute_wall(
            mbti=mbti,
            zodiac=profile.get("zodiac"),
            blood_type=profile.get("blood_type")
        )
        attr_wall.position = ComponentPosition(x=340, y=200, width=340, height=200)
        components.append(attr_wall)
        
        # Tag group for hobbies
        hobbies = profile.get("hobbies", [])
        if hobbies:
            tags = create_tag_group(tags=hobbies[:6], title="爱好")
            tags.position = ComponentPosition(x=0, y=y_offset, width=680, height=100)
            components.append(tags)
            y_offset += 110
        
        # Social links
        if profile.get("social_links"):
            links = create_social_links(links=profile.get("social_links", [])[:5])
            links.position = ComponentPosition(x=0, y=y_offset, width=680, height=80)
            components.append(links)
            y_offset += 90
        
        # Quote
        quote = create_quote(text="做自己，不被定义 ✨")
        quote.position = ComponentPosition(x=0, y=y_offset, width=680, height=100)
        components.append(quote)
        
        # Build full config
        config = BackendPageConfig(
            version="1.0",
            metadata=PageMetadata(
                title=f"{name}的个人主页",
                description="Heya Studio 生成的个人主页"
            ),
            theme=ThemeConfig(
                id=theme_id,
                colors=ThemeColors(**theme_data["colors"]),
                fonts=ThemeFonts(**theme_data["fonts"])
            ),
            layout=LayoutConfig(
                type="single-column",
                width=680
            ),
            components=components
        )
        
        return GenerateConfigOutput(
            config=config,
            reasoning=f"基于用户画像生成{theme_id}风格主页，包含{len(components)}个组件"
        )
    
    def get_input_schema(self) -> type[GenerateConfigInput]:
        return GenerateConfigInput
    
    def get_output_schema(self) -> type[GenerateConfigOutput]:
        return GenerateConfigOutput


class ValidateConfigTool(BaseTool[ValidateConfigInput, ValidateConfigOutput]):
    """Tool for validating page configuration."""
    
    name = "validate_config"
    description = "校验页面配置"
    tool_type = ToolType.LOCAL
    permission = ToolPermission.AUTHENTICATED
    
    async def execute(self, input_data: ValidateConfigInput) -> ValidateConfigOutput:
        """Validate config."""
        config = input_data.config
        issues = []
        
        # Check version
        if config.get("version") != "1.0":
            issues.append(ValidationIssue(
                severity="warning",
                code="VERSION_MISMATCH",
                message="版本号应为 1.0"
            ))
        
        # Check theme
        theme = config.get("theme", {})
        if not theme.get("id"):
            issues.append(ValidationIssue(
                severity="error",
                code="MISSING_THEME_ID",
                message="缺少主题 ID"
            ))
        
        # Check components
        components = config.get("components", [])
        
        # Validate component types
        valid_types = [
            "container", "text", "image", "avatar", "tag-group",
            "social-links", "oshi-card", "attribute-wall",
            "friends-list", "music-player", "quote",
            "divider", "spacer", "hero-section", "media-list"
        ]
        
        for comp in components:
            comp_type = comp.get("type")
            if comp_type not in valid_types:
                issues.append(ValidationIssue(
                    severity="error",
                    code="INVALID_COMPONENT_TYPE",
                    message=f"无效组件类型: {comp_type}",
                    field=f"components[{components.index(comp)}].type"
                ))
        
        # Check component count
        if len(components) > 12:
            issues.append(ValidationIssue(
                severity="warning",
                code="COMPONENT_COUNT_WARNING",
                message=f"组件数量 {len(components)} 超过建议值 12"
            ))
        
        # Calculate score
        passed = not any(i.severity == "error" for i in issues)
        score = 100.0 - len(issues) * 5
        
        return ValidateConfigOutput(
            passed=passed,
            issues=issues,
            score=score
        )
    
    def get_input_schema(self) -> type[ValidateConfigInput]:
        return ValidateConfigInput
    
    def get_output_schema(self) -> type[ValidateConfigOutput]:
        return ValidateConfigOutput


class ModifyConfigTool(BaseTool[ModifyConfigInput, ModifyConfigOutput]):
    """Tool for modifying page configuration - LLM + fallback."""
    
    name = "modify_config"
    description = "修改页面配置"
    tool_type = ToolType.WRITE
    permission = ToolPermission.AUTHENTICATED
    
    async def execute(self, input_data: ModifyConfigInput) -> ModifyConfigOutput:
        """Modify config based on instruction - LLM 解析 + 关键词 fallback."""
        config = input_data.config
        instruction = input_data.instruction.lower()
        target_ids = input_data.target_ids or []
        llm_params = input_data.llm_params
        changes = []
        
        # === LLM 解析的参数优先 ===
        if llm_params:
            # 使用 LLM 解析的具体参数
            components = config.get("components", [])
            for comp in components:
                if comp.get("id") in target_ids:
                    # 根据 LLM params 修改
                    if llm_params.get("color"):
                        comp["props"] = comp.get("props", {})
                        comp["props"]["color"] = llm_params["color"]
                        changes.append({
                            "type": "color_change",
                            "component_id": comp.get("id"),
                            "value": llm_params["color"]
                        })
                    if llm_params.get("text"):
                        comp["props"] = comp.get("props", {})
                        comp["props"]["text"] = llm_params["text"]
                        changes.append({
                            "type": "text_change",
                            "component_id": comp.get("id"),
                            "value": llm_params["text"]
                        })
            
            if changes:
                return ModifyConfigOutput(config=config, changes=changes, success=True)
        
        # === Fallback: 关键词匹配 ===
        # Change theme
        if "换成" in instruction or "改风格" in instruction:
            new_theme = None
            if "樱花" in instruction or "粉色" in instruction:
                new_theme = "sakura"
            elif "赛博" in instruction or "科技" in instruction:
                new_theme = "night"
            elif "薰衣草" in instruction or "紫色" in instruction:
                new_theme = "lavender"
            elif "薄荷" in instruction or "绿色" in instruction:
                new_theme = "mint"
            elif "奶油" in instruction or "米色" in instruction:
                new_theme = "cream"
            
            if new_theme and config.get("theme"):
                old_theme = config["theme"].get("id")
                config["theme"]["id"] = new_theme
                theme_data = THEME_CONFIGS.get(new_theme, {})
                config["theme"]["colors"] = theme_data.get("colors", {})
                changes.append({
                    "type": "theme_change",
                    "from": old_theme,
                    "to": new_theme
                })
        
        # Change colors
        if "颜色" in instruction or "配色" in instruction:
            # 简单颜色修改
            color_map = {
                "红色": "#FF6B6B",
                "粉色": "#F2A7B3",
                "紫色": "#B8A9C9",
                "蓝色": "#4A90D9",
                "绿色": "#98D4BB",
                "黄色": "#FFE66D",
                "白色": "#FFFFFF",
                "黑色": "#1A1A1A",
            }
            for color_name, color_value in color_map.items():
                if color_name in instruction:
                    components = config.get("components", [])
                    for comp in components:
                        if comp.get("id") in target_ids or not target_ids:
                            comp["props"] = comp.get("props", {})
                            comp["props"]["color"] = color_value
                            changes.append({
                                "type": "color_change",
                                "component_id": comp.get("id"),
                                "value": color_value
                            })
                    break
        
        # Change text / 签名
        if "签名" in instruction or "名字" in instruction:
            components = config.get("components", [])
            for comp in components:
                if comp.get("id") in target_ids and comp.get("type") == "hero-section":
                    comp["props"] = comp.get("props", {})
                    # 尝试提取新文本（简单逻辑）
                    if "改成" in instruction:
                        new_text = instruction.split("改成")[-1].strip()
                        if "签名" in instruction:
                            comp["props"]["signature"] = new_text
                            changes.append({
                                "type": "text_change",
                                "component_id": comp.get("id"),
                                "field": "signature",
                                "value": new_text
                            })
        
        return ModifyConfigOutput(
            config=config,
            changes=changes,
            success=len(changes) > 0
        )
    
    def get_input_schema(self) -> type[ModifyConfigInput]:
        return ModifyConfigInput
    
    def get_output_schema(self) -> type[ModifyConfigOutput]:
        return ModifyConfigOutput