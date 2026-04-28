"""Skill application tool.

Tier 3 改进项 #2c: 扩展 ApplySkillTool
- execute() 新增输出 required_components, recommended_components, prompt_suffix, component_rules
- component_rules 为嵌套 Dict[str, Any] 结构（如 {quote: {style: cursive}}）
- 保持原有 colors/fonts/effects 应用逻辑
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission


class ApplySkillInput(BaseModel):
    """Input for applying skill."""
    skill_id: str = Field(..., description="Skill ID to apply")
    config: Dict[str, Any] = Field(..., description="Current config")


class ApplySkillOutput(BaseModel):
    """Output for applying skill.

    Tier 3 新增字段:
        required_components: 该风格下必须包含的组件类型列表
        recommended_components: 推荐但不强制的组件类型列表
        prompt_suffix: 追加到 LLM prompt 末尾的风格指导文本
        component_rules: 组件级规则，嵌套 dict 结构
    """
    config: Dict[str, Any]
    skill_name: str = ""
    changes: list = []
    # Tier 3: 新增输出字段
    required_components: List[str] = Field(default_factory=list)
    recommended_components: List[str] = Field(default_factory=list)
    prompt_suffix: str = ""
    component_rules: Dict[str, Any] = Field(default_factory=dict)


class ApplySkillTool(BaseTool[ApplySkillInput, ApplySkillOutput]):
    """Tool for applying skills to configuration."""
    
    name = "apply_skill"
    description = "应用 Skill 规则到配置"
    tool_type = ToolType.LOCAL
    permission = ToolPermission.AUTHENTICATED
    
    async def execute(self, input_data: ApplySkillInput) -> ApplySkillOutput:
        """Apply skill to config."""
        from ..skills.loader import get_skill_loader
        
        loader = get_skill_loader()
        skill = loader.get_skill(input_data.skill_id)
        
        if not skill:
            return ApplySkillOutput(
                config=input_data.config,
                skill_name="",
                changes=[]
            )
        
        config = input_data.config.copy()
        changes = []
        
        # Apply colors
        if skill.colors:
            if "theme" not in config:
                config["theme"] = {}
            config["theme"]["colors"] = skill.colors
            changes.append("Applied skill colors")
        
        # Apply fonts
        if skill.fonts:
            if "theme" not in config:
                config["theme"] = {}
            config["theme"]["fonts"] = skill.fonts
            changes.append("Applied skill fonts")
        
        # Apply effects
        if skill.effects:
            config["effects"] = skill.effects
            changes.append("Applied skill effects")
        
        return ApplySkillOutput(
            config=config,
            skill_name=skill.name,
            changes=changes,
            required_components=skill.required_components,
            recommended_components=skill.recommended_components,
            prompt_suffix=skill.prompt_suffix,
            component_rules=skill.component_rules
        )
    
    def get_input_schema(self) -> type[ApplySkillInput]:
        return ApplySkillInput
    
    def get_output_schema(self) -> type[ApplySkillOutput]:
        return ApplySkillOutput