"""Repair component tool - automatic fix for common config issues.

Phase 2: Validator Agent discovers issues → this tool fixes them automatically
for structural problems, or generates repair guidance for semantic issues.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .base import BaseTool, ToolType, ToolPermission
from ..models.page import (
    BackendPageConfig,
    BackendComponentConfig,
    ComponentPosition,
    ThemeConfig,
    ThemeColors,
    ThemeFonts,
)


# ============================================================================
# Input / Output models
# ============================================================================

class RepairComponentInput(BaseModel):
    """Input for component repair."""
    config: Dict[str, Any] = Field(..., description="Current config dict")
    issues: List[Dict[str, Any]] = Field(
        ...,
        description="Validation issues to fix [{severity, code, message, field}]"
    )


class RepairComponentOutput(BaseModel):
    """Output for component repair."""
    config: Dict[str, Any] = Field(..., description="Repaired config")
    fixes_applied: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Description of fixes applied"
    )
    remaining_issues: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Issues that could not be auto-fixed"
    )


# ============================================================================
# Repair strategies
# ============================================================================

# Known fixable error codes
AUTO_FIXABLE_CODES = {
    "INVALID_COMPONENT_TYPE",       # Remove or replace invalid type
    "MISSING_COMPONENT_ID",         # Generate missing ID
    "MISSING_COMPONENT_TYPE",       # Add default type
    "MISSING_THEME_ID",            # Add default theme
    "COMPONENT_POSITION_MISSING",   # Add default position
    "COMPONENT_OVERLAP",            # Adjust overlapping positions
    "INVALID_COLOR_FORMAT",         # Fix hex color format
    "EMPTY_COMPONENT_PROPS",        # Add default props
    "DUPLICATE_COMPONENT_ID",      # Deduplicate IDs
    "COMPONENT_COUNT_EXCEEDED",     # Remove excess components
}


def _fix_invalid_component_type(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Replace invalid component type with 'text' fallback."""
    components = config.get("components", [])
    field = issue.get("field", "")

    # Extract component index from field like "components[3].type"
    import re
    match = re.search(r"components\[(\d+)\]", field)
    if match:
        idx = int(match.group(1))
        if 0 <= idx < len(components):
            old_type = components[idx].get("type", "unknown")
            components[idx]["type"] = "text"
            components[idx]["props"] = components[idx].get("props") or {"text": "个性化内容"}
            fix = {
                "type": "component_type_replaced",
                "component_index": idx,
                "old_type": old_type,
                "new_type": "text",
            }
            return config, fix

    return config, {"type": "no_fix_applied", "reason": "Could not locate component"}


def _fix_missing_component_id(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Generate missing component ID."""
    components = config.get("components", [])
    field = issue.get("field", "")

    import re
    match = re.search(r"components\[(\d+)\]", field)
    if match:
        idx = int(match.group(1))
        if 0 <= idx < len(components):
            comp_type = components[idx].get("type", "component")
            new_id = f"{comp_type}-{idx}"
            components[idx]["id"] = new_id
            return config, {
                "type": "component_id_generated",
                "component_index": idx,
                "new_id": new_id,
            }

    return config, {"type": "no_fix_applied", "reason": "Could not locate component"}


def _fix_missing_theme_id(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Add default theme ID."""
    if not config.get("theme"):
        config["theme"] = {}
    config["theme"]["id"] = "sakura"
    return config, {"type": "theme_id_set", "value": "sakura"}


def _fix_component_overlap(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Fix overlapping component positions by pushing down."""
    components = config.get("components", [])

    # Sort by y position
    positioned = []
    for comp in components:
        pos = comp.get("position", {})
        y = pos.get("y", 0)
        h = pos.get("height", 100)
        positioned.append((comp, y, h))

    positioned.sort(key=lambda x: x[1])

    # Fix overlaps
    overlap_count = 0
    for i in range(len(positioned) - 1):
        comp_i, y_i, h_i = positioned[i]
        comp_j, y_j, h_j = positioned[i + 1]

        # If component j starts before component i ends, push j down
        if y_j < y_i + h_i:
            new_y = y_i + h_i + 10  # 10px gap
            positioned[i + 1] = (comp_j, new_y, h_j)
            comp_j["position"]["y"] = new_y
            overlap_count += 1

    return config, {
        "type": "overlaps_resolved",
        "count": overlap_count,
    }


def _fix_duplicate_component_id(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Deduplicate component IDs."""
    components = config.get("components", [])
    seen_ids: Dict[str, int] = {}
    duplicates_fixed = 0

    for comp in components:
        comp_id = comp.get("id", "")
        if comp_id in seen_ids:
            seen_ids[comp_id] += 1
            comp_type = comp.get("type", "component")
            new_id = f"{comp_type}-{seen_ids[comp_id]}"
            comp["id"] = new_id
            duplicates_fixed += 1
        else:
            seen_ids[comp_id] = 0

    return config, {
        "type": "duplicate_ids_fixed",
        "count": duplicates_fixed,
    }


def _fix_component_count_exceeded(config: Dict, issue: Dict) -> tuple[Dict, Dict]:
    """Remove excess components, keeping the most important ones."""
    components = config.get("components", [])

    # Priority order: hero-section > oshi-card > attribute-wall > quote > tag-group > others
    priority = {
        "hero-section": 10,
        "oshi-card": 9,
        "attribute-wall": 8,
        "quote": 7,
        "tag-group": 6,
        "music-player": 5,
        "social-links": 4,
        "friends-list": 3,
        "media-list": 2,
    }

    max_count = 8
    if len(components) > max_count:
        # Sort by priority, keep top 8
        sorted_comps = sorted(
            enumerate(components),
            key=lambda x: priority.get(x[1].get("type", ""), 0),
            reverse=True,
        )
        keep_indices = set(idx for idx, _ in sorted_comps[:max_count])
        removed = [components[i] for i in range(len(components)) if i not in keep_indices]
        config["components"] = [components[i] for i in keep_indices]
        return config, {
            "type": "excess_components_removed",
            "count": len(removed),
            "removed_types": [r.get("type", "unknown") for r in removed],
        }

    return config, {"type": "no_fix_applied", "reason": "Component count within limits"}


# Registry of fix functions
REPAIR_FUNCTIONS = {
    "INVALID_COMPONENT_TYPE": _fix_invalid_component_type,
    "MISSING_COMPONENT_ID": _fix_missing_component_id,
    "MISSING_THEME_ID": _fix_missing_theme_id,
    "COMPONENT_OVERLAP": _fix_component_overlap,
    "DUPLICATE_COMPONENT_ID": _fix_duplicate_component_id,
    "COMPONENT_COUNT_EXCEEDED": _fix_component_count_exceeded,
}


# ============================================================================
# Tool
# ============================================================================

class RepairComponentTool(BaseTool[RepairComponentInput, RepairComponentOutput]):
    """Tool for automatically fixing common component config issues."""

    name = "repair_component"
    description = "自动修复组件配置问题"
    tool_type = ToolType.LOCAL
    permission = ToolPermission.AUTHENTICATED

    async def execute(self, input_data: RepairComponentInput) -> RepairComponentOutput:
        """Attempt to auto-fix validation issues."""
        config = input_data.config.copy()
        fixes_applied = []
        remaining_issues = []

        for issue in input_data.issues:
            code = issue.get("code", "")
            severity = issue.get("severity", "error")

            # Only auto-fix errors (not warnings/info)
            if severity != "error":
                continue

            # Check if we have an auto-fix strategy
            if code in REPAIR_FUNCTIONS:
                config, fix = REPAIR_FUNCTIONS[code](config, issue)
                if fix.get("type") != "no_fix_applied":
                    fixes_applied.append(fix)
                    continue

            # Could not auto-fix
            remaining_issues.append(issue)

        return RepairComponentOutput(
            config=config,
            fixes_applied=fixes_applied,
            remaining_issues=remaining_issues,
        )

    def get_input_schema(self) -> type[RepairComponentInput]:
        return RepairComponentInput

    def get_output_schema(self) -> type[RepairComponentOutput]:
        return RepairComponentOutput


# Convenience function
def auto_fix_issues(
    config: Dict[str, Any],
    issues: List[Dict[str, Any]],
) -> tuple[Dict[str, Any], List[Dict], List[Dict]]:
    """Synchronous convenience function for auto-fixing issues.

    Returns (fixed_config, fixes_applied, remaining_issues).
    """
    config_copy = config.copy()
    fixes = []
    remaining = []

    for issue in issues:
        code = issue.get("code", "")
        severity = issue.get("severity", "error")
        if severity != "error" or code not in REPAIR_FUNCTIONS:
            remaining.append(issue)
            continue
        config_copy, fix = REPAIR_FUNCTIONS[code](config_copy, issue)
        if fix.get("type") != "no_fix_applied":
            fixes.append(fix)
        else:
            remaining.append(issue)

    return config_copy, fixes, remaining
