"""Auto-layout tool - calculates component positions to avoid overlap.

Phase 1 MVP: Simple grid layout algorithm with overlap detection and
responsive breakpoint support.
"""

from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission
from ..models.page import BackendComponentConfig, ComponentPosition
from ..models.layout import LayoutStrategy


# ============================================================================
# Responsive breakpoints
# ============================================================================

BREAKPOINTS = {
    "mobile": 375,
    "tablet": 768,
    "desktop": 1024,
    "wide": 1440,
}

# Default component dimensions by type
DEFAULT_DIMENSIONS: Dict[str, Tuple[int, int]] = {
    "hero-section": (680, 220),
    "oshi-card": (340, 200),
    "attribute-wall": (340, 200),
    "tag-group": (680, 100),
    "music-player": (680, 120),
    "social-links": (680, 80),
    "quote": (680, 100),
    "friends-list": (680, 200),
    "media-list": (680, 200),
    "divider": (680, 20),
    "spacer": (680, 40),
    "text": (680, 80),
    "image": (340, 200),
    "avatar": (200, 200),
    "container": (680, 400),
    "merchandise-card": (200, 180),
    "guestbook": (680, 400),
    "watchlist": (680, 300),
    "gallery": (680, 400),
    "achievement-badges": (680, 200),
    "memorial-calendar": (680, 300),
    "cp-card": (680, 200),
    "media-card": (340, 200),
    "support-record": (680, 400),
}

# Gaps between components (vertical, horizontal)
VERTICAL_GAP = 10
HORIZONTAL_GAP = 20


# ============================================================================
# Input / Output models
# ============================================================================

class AutoLayoutInput(BaseModel):
    """Input for auto-layout calculation."""
    components: List[Dict[str, Any]] = Field(
        ..., description="List of component dicts with at least 'id' and 'type'"
    )
    canvas_width: int = Field(default=680, description="Canvas width")
    breakpoint: str = Field(
        default="desktop",
        description="Responsive breakpoint: mobile, tablet, desktop, wide"
    )
    layout_type: str = Field(default="single-column", description="Layout type")
    layout_strategy: Optional[LayoutStrategy] = Field(
        None, description="Phase 4: LLM-driven layout strategy"
    )


class AutoLayoutOutput(BaseModel):
    """Output for auto-layout calculation."""
    components: List[Dict[str, Any]] = Field(
        ..., description="Components with updated positions"
    )
    canvas_height: int = Field(..., description="Total canvas height after layout")
    overlaps_detected: int = Field(
        default=0, description="Number of overlaps detected and resolved"
    )


# ============================================================================
# Layout Engine
# ============================================================================

def _get_component_dims(comp: Dict[str, Any], canvas_width: int) -> Tuple[int, int]:
    """Get width/height for a component, respecting existing position if set."""
    pos = comp.get("position")
    if isinstance(pos, dict):
        w = pos.get("width") or pos.get("w")
        h = pos.get("height") or pos.get("h")
        if w and h:
            return (int(w), int(h))
    elif isinstance(pos, ComponentPosition):
        if pos.width and pos.height:
            return (pos.width, pos.height)

    comp_type = comp.get("type", "text")
    default_w, default_h = DEFAULT_DIMENSIONS.get(comp_type, (680, 100))

    # For mobile, halve widths and stack
    if canvas_width < 500:
        return (min(default_w, canvas_width), default_h)

    return (min(default_w, canvas_width), default_h)


def _rects_overlap(
    a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]
) -> bool:
    """Check if two rectangles (x, y, w, h) overlap."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return not (
        ax + aw <= bx
        or bx + bw <= ax
        or ay + ah <= by
        or by + bh <= ay
    )


def _simple_grid_layout(
    components: List[Dict[str, Any]],
    canvas_width: int,
    layout_type: str,
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Single-column or two-column grid layout.

    Returns:
        (updated_components, canvas_height, overlaps_resolved)
    """
    placed: List[Tuple[int, int, int, int]] = []  # (x, y, w, h)
    overlaps_resolved = 0
    current_y = 0

    two_column = layout_type == "two-column" and canvas_width >= 500
    col_width = (canvas_width - HORIZONTAL_GAP) // 2 if two_column else canvas_width

    # Track two-column state
    left_col_bottom = 0
    right_col_bottom = 0

    for comp in components:
        w, h = _get_component_dims(comp, canvas_width)

        # Full-width components always span both columns
        is_full_width = comp.get("type") in (
            "hero-section", "tag-group", "music-player",
            "social-links", "quote", "guestbook", "watchlist",
            "gallery", "support-record", "memorial-calendar",
            "achievement-badges", "divider", "spacer",
        )

        if two_column and not is_full_width:
            # Place in shorter column
            if left_col_bottom <= right_col_bottom:
                x = 0
                y = left_col_bottom
                left_col_bottom = y + h + VERTICAL_GAP
            else:
                x = col_width + HORIZONTAL_GAP
                y = right_col_bottom
                right_col_bottom = y + h + VERTICAL_GAP
        else:
            # Full-width or single-column: place at the bottom
            x = 0
            y = max(left_col_bottom, right_col_bottom, current_y)
            current_y = y + h + VERTICAL_GAP
            left_col_bottom = current_y
            right_col_bottom = current_y

        # Overlap check & resolution
        rect = (x, y, w, h)
        for placed_rect in placed:
            if _rects_overlap(rect, placed_rect):
                # Push down below the overlapping placed rect
                _, py, _, ph = placed_rect
                y = py + ph + VERTICAL_GAP
                rect = (x, y, w, h)
                overlaps_resolved += 1
                # Update column bottom
                if two_column and not is_full_width:
                    if x == 0:
                        left_col_bottom = y + h + VERTICAL_GAP
                    else:
                        right_col_bottom = y + h + VERTICAL_GAP
                else:
                    current_y = y + h + VERTICAL_GAP
                    left_col_bottom = current_y
                    right_col_bottom = current_y

        placed.append(rect)

        # Update component position
        comp["position"] = {
            "x": x,
            "y": y,
            "width": w,
            "height": h,
        }

    canvas_height = max(
        current_y,
        left_col_bottom,
        right_col_bottom,
    )

    return components, canvas_height, overlaps_resolved


# ============================================================================
# Strategy-driven layout algorithms (Phase 4)
# ============================================================================

# Layout constants for strategy algorithms
HEADER_HEIGHT = 20
MARGIN = 20
CANVAS_WIDTH_DEFAULT = 680
GOLDEN_RATIO = 1.618


def _layout_centerpiece(
    components: List[Dict[str, Any]],
    strategy: LayoutStrategy,
    canvas_width: int,
) -> Tuple[List[Dict[str, Any]], int, List[str]]:
    """Centerpiece strategy: core component centered and enlarged (60% width),
    other components in columns below.

    Args:
        components: List of component dicts
        strategy: LayoutStrategy with primary_component specified
        canvas_width: Canvas width

    Returns:
        (updated_components, canvas_height, warnings)
    """
    warnings: List[str] = []

    # Find primary component
    primary_idx = None
    primary_type = strategy.primary_component
    if primary_type:
        for i, comp in enumerate(components):
            if comp.get("type") == primary_type:
                primary_idx = i
                break

    # If no primary found, use first component
    if primary_idx is None:
        primary_idx = 0
        if primary_type:
            warnings.append(f"Primary component '{primary_type}' not found, using first component")

    primary = components[primary_idx]
    others = [c for i, c in enumerate(components) if i != primary_idx]

    # Layout primary: centered, 60% width
    primary_w = int(canvas_width * 0.6)
    _, primary_h = _get_component_dims(primary, primary_w)
    primary_x = (canvas_width - primary_w) // 2
    primary_y = HEADER_HEIGHT + 20

    primary["position"] = {
        "x": primary_x,
        "y": primary_y,
        "width": primary_w,
        "height": primary_h,
    }

    # Layout others: below primary, in columns
    current_y = primary_y + primary_h + 40  # 40px gap below primary

    if not others:
        return components, current_y, warnings

    # Calculate column count and width
    num_others = len(others)
    if num_others <= 2:
        col_count = num_others
    elif num_others <= 4:
        col_count = 2
    else:
        col_count = 3

    available_width = canvas_width - 2 * MARGIN
    col_width = (available_width - (col_count - 1) * HORIZONTAL_GAP) // col_count

    for i, comp in enumerate(others):
        col = i % col_count
        row = i // col_count

        w = min(col_width, _get_component_dims(comp, col_width)[0])
        h = _get_component_dims(comp, col_width)[1]

        x = MARGIN + col * (col_width + HORIZONTAL_GAP) + (col_width - w) // 2
        y = current_y + row * (h + VERTICAL_GAP)

        comp["position"] = {
            "x": x,
            "y": y,
            "width": w,
            "height": h,
        }

    # Calculate canvas height
    max_y = current_y
    for comp in others:
        pos = comp.get("position", {})
        bottom = pos.get("y", 0) + pos.get("height", 0)
        if bottom > max_y:
            max_y = bottom

    return components, max_y + MARGIN, warnings


def _layout_asymmetric(
    components: List[Dict[str, Any]],
    strategy: LayoutStrategy,
    canvas_width: int,
) -> Tuple[List[Dict[str, Any]], int, List[str]]:
    """Asymmetric strategy: golden ratio positioning, breaking symmetry.

    Uses the golden ratio (1.618) to offset components from center,
    creating visual tension and dynamic composition.

    Args:
        components: List of component dicts
        strategy: LayoutStrategy
        canvas_width: Canvas width

    Returns:
        (updated_components, canvas_height, warnings)
    """
    warnings: List[str] = []

    if not components:
        return components, HEADER_HEIGHT, warnings

    phi = GOLDEN_RATIO
    current_y = HEADER_HEIGHT + 10

    for i, comp in enumerate(components):
        w, h = _get_component_dims(comp, canvas_width)

        if i == 0:
            # First component: left-aligned with golden ratio offset
            x = MARGIN
        elif i == 1:
            # Second component: right-aligned, creating diagonal tension
            x = canvas_width - w - MARGIN
            # Offset y by golden ratio of first component's height
            prev_h = components[i - 1].get("position", {}).get("height", 200)
            current_y = HEADER_HEIGHT + 10 + int(prev_h / phi)
        else:
            # Alternate left and right with staggered y
            if i % 2 == 0:
                x = MARGIN + int(canvas_width * (1 / phi - 0.1))
            else:
                x = MARGIN + int(canvas_width * (1 - 1 / phi)) - w + MARGIN
            # Stagger y
            prev_comp = components[i - 1]
            prev_pos = prev_comp.get("position", {})
            prev_h = prev_pos.get("height", 100)
            current_y = prev_pos.get("y", current_y) + prev_h + int(VERTICAL_GAP * 1.5)

        # Make components slightly narrower for asymmetric feel
        if i > 0:
            w = min(w, int(canvas_width * 0.55))

        comp["position"] = {
            "x": x,
            "y": current_y,
            "width": w,
            "height": h,
        }

    # Calculate canvas height
    max_y = 0
    for comp in components:
        pos = comp.get("position", {})
        bottom = pos.get("y", 0) + pos.get("height", 0)
        if bottom > max_y:
            max_y = bottom

    return components, max_y + MARGIN, warnings


def _layout_gallery_grid(
    components: List[Dict[str, Any]],
    strategy: LayoutStrategy,
    canvas_width: int,
) -> Tuple[List[Dict[str, Any]], int, List[str]]:
    """Gallery grid strategy: equal-width grid (delegates to existing grid logic).

    This is essentially the existing two-column grid layout,
    but with strategy-aware spacing.

    Args:
        components: List of component dicts
        strategy: LayoutStrategy
        canvas_width: Canvas width

    Returns:
        (updated_components, canvas_height, warnings)
    """
    # Adjust gap based on strategy spacing
    spacing = strategy.spacing if strategy else "normal"
    if spacing == "tight":
        v_gap = 5
        h_gap = 10
    elif spacing == "loose":
        v_gap = 20
        h_gap = 30
    else:
        v_gap = VERTICAL_GAP
        h_gap = HORIZONTAL_GAP

    # Use the existing grid layout with two-column
    updated, canvas_height, overlaps = _simple_grid_layout(
        [c.copy() for c in components],
        canvas_width,
        "two-column",
    )

    return updated, canvas_height, []


def _apply_strategy_layout(
    components: List[Dict[str, Any]],
    strategy: LayoutStrategy,
    canvas_width: int,
) -> Tuple[List[Dict[str, Any]], int, List[str]]:
    """Route to the appropriate strategy-based layout algorithm.

    Args:
        components: List of component dicts
        strategy: LayoutStrategy from LLM
        canvas_width: Canvas width

    Returns:
        (updated_components, canvas_height, warnings)
    """
    strategy_type = strategy.type

    if strategy_type == "centerpiece":
        return _layout_centerpiece(components, strategy, canvas_width)
    elif strategy_type == "asymmetric":
        return _layout_asymmetric(components, strategy, canvas_width)
    elif strategy_type == "gallery-grid":
        return _layout_gallery_grid(components, strategy, canvas_width)
    elif strategy_type == "hero-first":
        # Hero-first is similar to centerpiece but primary is hero-section
        hero_strategy = strategy.model_copy(update={"primary_component": "hero-section"})
        return _layout_centerpiece(components, hero_strategy, canvas_width)
    elif strategy_type == "minimal-list":
        # Single column with loose spacing
        loose_strategy = strategy.model_copy(update={"spacing": "loose"})
        return _layout_gallery_grid(components, loose_strategy, canvas_width)
    else:
        # Fallback: use gallery-grid for unknown types
        return _layout_gallery_grid(components, strategy, canvas_width)


# ============================================================================
# Tool
# =============================================================================

class AutoLayoutTool(BaseTool[AutoLayoutInput, AutoLayoutOutput]):
    """Tool for automatically calculating component positions."""

    name = "auto_layout"
    description = "自动计算组件位置，避免重叠"
    tool_type = ToolType.LOCAL
    permission = ToolPermission.AUTHENTICATED

    async def execute(self, input_data: AutoLayoutInput) -> AutoLayoutOutput:
        """Calculate layout for components."""
        components = [c.copy() for c in input_data.components]
        canvas_width = input_data.canvas_width

        # Adjust canvas width for breakpoint
        bp = input_data.breakpoint
        if bp == "mobile":
            canvas_width = min(canvas_width, BREAKPOINTS["mobile"])
        elif bp == "tablet":
            canvas_width = min(canvas_width, BREAKPOINTS["tablet"])

        # Phase 4: Strategy-driven layout
        if input_data.layout_strategy is not None:
            updated, canvas_height, strategy_warnings = _apply_strategy_layout(
                components,
                input_data.layout_strategy,
                canvas_width,
            )
            return AutoLayoutOutput(
                components=updated,
                canvas_height=canvas_height,
                overlaps_detected=0,
            )

        # Legacy: simple grid layout (backward compatible)
        updated, canvas_height, overlaps = _simple_grid_layout(
            components,
            canvas_width,
            input_data.layout_type,
        )

        return AutoLayoutOutput(
            components=updated,
            canvas_height=canvas_height,
            overlaps_detected=overlaps,
        )

    def get_input_schema(self) -> type[AutoLayoutInput]:
        return AutoLayoutInput

    def get_output_schema(self) -> type[AutoLayoutOutput]:
        return AutoLayoutOutput


# Convenience function for direct use (no async, no tool wrapping)
def compute_layout(
    components: List[Dict[str, Any]],
    canvas_width: int = 680,
    layout_type: str = "single-column",
    breakpoint: str = "desktop",
) -> Tuple[List[Dict[str, Any]], int]:
    """Synchronous convenience function for layout computation.

    Args:
        components: List of component dicts (each needs at least 'id' and 'type')
        canvas_width: Canvas width in pixels
        layout_type: "single-column" or "two-column"
        breakpoint: "mobile", "tablet", "desktop", "wide"

    Returns:
        (components_with_positions, canvas_height)
    """
    updated, canvas_height, _ = _simple_grid_layout(
        [c.copy() for c in components],
        canvas_width,
        layout_type,
    )
    return updated, canvas_height
