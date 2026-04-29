"""Assemble config tool - pure code assembly, no LLM involved.

Phase 1 MVP: Assembles BackendPageConfig from template + components + skill + texts.
Key principle: LLM makes choices, code assembles JSON.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
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
)


# ============================================================================
# Input / Output models
# ============================================================================

class AssembleConfigInput(BaseModel):
    """Input for config assembly."""
    template: Dict[str, Any] = Field(
        ..., description="Base template structure (dict form)"
    )
    components: List[Dict[str, Any]] = Field(
        ..., description="Selected component definitions [{type, props?}]"
    )
    skill: Optional[Dict[str, Any]] = Field(
        None, description="Skill rules (colors, fonts, component_rules)"
    )
    personalized_texts: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="{component_type: text} personalized copy"
    )
    profile: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="User profile for placeholder filling"
    )


class AssembleConfigOutput(BaseModel):
    """Output for config assembly."""
    config: Dict[str, Any] = Field(..., description="Assembled BackendPageConfig as dict")
    assembled_components: int = Field(..., description="Number of components assembled")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings")


# ============================================================================
# Helper functions
# ============================================================================

def _deep_merge(base: Dict, override: Dict) -> Dict:
    """Deep merge two dicts, override wins."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _fill_placeholders(text: str, profile: Dict[str, Any]) -> str:
    """Fill profile placeholders like {{user.name}} -> actual value."""
    if not text or not isinstance(text, str):
        return text

    placeholder_map = {
        "{{user.name}}": profile.get("name", "用户"),
        "{{user.mbti}}": profile.get("mbti", "INFP"),
        "{{user.zodiac}}": profile.get("zodiac", ""),
        "{{user.blood_type}}": profile.get("blood_type", ""),
        "{{user.signature}}": profile.get("signature", "探索无限可能 ✨"),
    }

    # Add oshi placeholders
    oshis = profile.get("oshi", [])
    if oshis:
        oshi = oshis[0]
        placeholder_map["{{oshi.name}}"] = oshi.get("name", "推")
        placeholder_map["{{oshi.from_work}}"] = oshi.get("from_work", "")
        placeholder_map["{{oshi.description}}"] = oshi.get("description", "")

    result = text
    for placeholder, value in placeholder_map.items():
        result = result.replace(placeholder, str(value) if value else "")

    return result


def _fill_props_placeholders(props: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively fill placeholders in all string props."""
    result = {}
    for key, value in props.items():
        if isinstance(value, str):
            result[key] = _fill_placeholders(value, profile)
        elif isinstance(value, dict):
            result[key] = _fill_props_placeholders(value, profile)
        elif isinstance(value, list):
            result[key] = [
                _fill_placeholders(item, profile) if isinstance(item, str) else item
                for item in value
            ]
        else:
            result[key] = value
    return result


def _apply_skill_rules(comp_type: str, props: Dict[str, Any], skill: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply skill component_rules to component props."""
    if not skill:
        return props

    component_rules = skill.get("component_rules", {})
    if comp_type in component_rules:
        rules = component_rules[comp_type]
        if isinstance(rules, dict):
            return _deep_merge(props.copy(), rules)

    return props


def _guess_text_field(comp_type: str) -> Optional[str]:
    """Guess which prop field holds the main text for a component type."""
    field_map = {
        "hero-section": "signature",
        "quote": "text",
        "text": "text",
        "oshi-card": "description",
        "music-player": "title",
        "tag-group": "title",
    }
    return field_map.get(comp_type)


# ============================================================================
# Assembly engine
# ============================================================================

def assemble_page_config(
    template: Dict[str, Any],
    components: List[Dict[str, Any]],
    skill: Optional[Dict[str, Any]] = None,
    personalized_texts: Optional[Dict[str, str]] = None,
    profile: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Pure function: assemble config from parts. No LLM, no async.

    Args:
        template: Base template with theme, layout, metadata
        components: Selected component definitions
        skill: Style rules (colors, fonts, component_rules)
        personalized_texts: {component_type: text} for personalized copy
        profile: User profile for placeholder filling

    Returns:
        (config_dict, warnings)
    """
    warnings: List[str] = []
    personalized_texts = personalized_texts or {}
    profile = profile or {}

    # 1. Copy template base structure
    config = {
        "version": template.get("version", "1.0"),
        "metadata": _deep_merge(
            {"title": "我的个人主页", "description": "Heya Studio 生成的个人主页"},
            template.get("metadata", {})
        ),
        "theme": _deep_merge(
            {"id": "sakura", "colors": {}, "fonts": {}},
            template.get("theme", {})
        ),
        "layout": _deep_merge(
            {"type": "single-column", "width": 680},
            template.get("layout", {})
        ),
        "components": [],
    }

    # 2. Apply skill colors/fonts override
    if skill:
        if skill.get("colors"):
            config["theme"]["colors"] = _deep_merge(
                config["theme"].get("colors", {}),
                skill["colors"]
            )
        if skill.get("fonts"):
            config["theme"]["fonts"] = _deep_merge(
                config["theme"].get("fonts", {}),
                skill["fonts"]
            )

    # Fill profile placeholders in metadata
    if config["metadata"].get("title"):
        config["metadata"]["title"] = _fill_placeholders(
            config["metadata"]["title"], profile
        )

    # 3. Assemble components
    assembled_components: List[Dict[str, Any]] = []

    for idx, comp_def in enumerate(components):
        comp_type = comp_def.get("type", "text")
        comp_id = comp_def.get("id") or f"{comp_type}-{idx}"

        # Base props from component definition
        base_props = comp_def.get("props", {}).copy()

        # Apply skill component_rules
        base_props = _apply_skill_rules(comp_type, base_props, skill)

        # Fill personalized text for this component type
        if comp_type in personalized_texts:
            text_key = _guess_text_field(comp_type)
            if text_key:
                base_props[text_key] = personalized_texts[comp_type]

        # Fill profile placeholders
        base_props = _fill_props_placeholders(base_props, profile)

        # Build component
        component = {
            "id": comp_id,
            "type": comp_type,
            "props": base_props,
            "position": {"x": 0, "y": 0, "width": 680, "height": 100},
        }

        # Copy style if present in comp_def
        if comp_def.get("style"):
            component["style"] = comp_def["style"].copy()

        assembled_components.append(component)

    config["components"] = assembled_components

    return config, warnings


# ============================================================================
# Tool
# ============================================================================

class AssembleConfigTool(BaseTool[AssembleConfigInput, AssembleConfigOutput]):
    """Tool for assembling page config from parts.

    Phase 1 MVP: Pure code assembly, no LLM involved.
    LLM makes choices (which components, which style), code assembles JSON.
    """

    name = "assemble_config"
    description = "从模板、组件、风格和文案拼装页面配置"
    tool_type = ToolType.LOCAL
    permission = ToolPermission.AUTHENTICATED

    async def execute(self, input_data: AssembleConfigInput) -> AssembleConfigOutput:
        """Assemble config from template + components + skill + texts."""
        config, warnings = assemble_page_config(
            template=input_data.template,
            components=input_data.components,
            skill=input_data.skill,
            personalized_texts=input_data.personalized_texts,
            profile=input_data.profile,
        )

        # Validate with pydantic
        try:
            validated = BackendPageConfig.model_validate(config)
            config = validated.model_dump()
        except Exception as e:
            warnings.append(f"Schema validation warning: {e}")

        return AssembleConfigOutput(
            config=config,
            assembled_components=len(input_data.components),
            warnings=warnings,
        )

    def get_input_schema(self) -> type[AssembleConfigInput]:
        return AssembleConfigInput

    def get_output_schema(self) -> type[AssembleConfigOutput]:
        return AssembleConfigOutput


# ============================================================================
# Convenience functions for direct use (no async, no tool wrapping)
# ============================================================================

def build_config(
    template: Dict[str, Any],
    components: List[Dict[str, Any]],
    skill: Optional[Dict[str, Any]] = None,
    personalized_texts: Optional[Dict[str, str]] = None,
    profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Synchronous convenience function for config assembly.

    Returns assembled BackendPageConfig as dict.
    """
    config, _ = assemble_page_config(
        template=template,
        components=components,
        skill=skill,
        personalized_texts=personalized_texts,
        profile=profile,
    )
    return config
