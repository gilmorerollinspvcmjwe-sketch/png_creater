"""Tests for auto_layout tool."""

import pytest
from src.tools.auto_layout import compute_layout, _rects_overlap, _simple_grid_layout


# ============================================================================
# Tests for overlap detection
# ============================================================================

class TestRectsOverlap:
    """Tests for rectangle overlap detection."""

    def test_no_overlap(self):
        """Non-overlapping rectangles."""
        a = (0, 0, 100, 100)
        b = (200, 0, 100, 100)
        assert not _rects_overlap(a, b)

    def test_overlap(self):
        """Overlapping rectangles."""
        a = (0, 0, 100, 100)
        b = (50, 50, 100, 100)
        assert _rects_overlap(a, b)

    def test_adjacent_no_overlap(self):
        """Adjacent rectangles should not overlap."""
        a = (0, 0, 100, 100)
        b = (100, 0, 100, 100)
        assert not _rects_overlap(a, b)

    def test_contained(self):
        """Contained rectangle should overlap."""
        a = (0, 0, 200, 200)
        b = (50, 50, 50, 50)
        assert _rects_overlap(a, b)


# ============================================================================
# Tests for layout computation
# ============================================================================

class TestComputeLayout:
    """Tests for compute_layout function."""

    def test_single_component(self):
        """Single component should be placed at origin."""
        components = [{"id": "hero", "type": "hero-section"}]
        result, height = compute_layout(components)

        assert len(result) == 1
        assert result[0]["position"]["x"] == 0
        assert result[0]["position"]["y"] == 0
        assert height > 0

    def test_multiple_components_no_overlap(self):
        """Multiple components should not overlap."""
        components = [
            {"id": "hero", "type": "hero-section"},
            {"id": "oshi", "type": "oshi-card"},
            {"id": "quote", "type": "quote"},
            {"id": "social", "type": "social-links"},
        ]
        result, height = compute_layout(components)

        # Check no overlaps
        for i in range(len(result)):
            for j in range(i + 1, len(result)):
                pi = result[i]["position"]
                pj = result[j]["position"]
                rect_i = (pi["x"], pi["y"], pi["width"], pi["height"])
                rect_j = (pj["x"], pj["y"], pj["width"], pj["height"])
                assert not _rects_overlap(rect_i, rect_j), \
                    f"Components {result[i]['id']} and {result[j]['id']} overlap"

    def test_positions_have_required_fields(self):
        """Each component position should have x, y, width, height."""
        components = [
            {"id": "hero", "type": "hero-section"},
            {"id": "quote", "type": "quote"},
        ]
        result, _ = compute_layout(components)

        for comp in result:
            pos = comp["position"]
            assert "x" in pos
            assert "y" in pos
            assert "width" in pos
            assert "height" in pos

    def test_empty_components(self):
        """Empty component list should return empty."""
        result, height = compute_layout([])
        assert result == []
        assert height == 0

    def test_mobile_breakpoint(self):
        """Mobile breakpoint should constrain width."""
        components = [{"id": "hero", "type": "hero-section"}]
        result, _ = compute_layout(
            components, canvas_width=375, breakpoint="mobile"
        )

        assert result[0]["position"]["width"] <= 375

    def test_canvas_height_positive(self):
        """Canvas height should be positive for non-empty layouts."""
        components = [
            {"id": "hero", "type": "hero-section"},
            {"id": "oshi", "type": "oshi-card"},
        ]
        _, height = compute_layout(components)
        assert height > 0

    def test_vertical_ordering(self):
        """Components should be placed in order (y increases)."""
        components = [
            {"id": "hero", "type": "hero-section"},
            {"id": "quote", "type": "quote"},
            {"id": "social", "type": "social-links"},
        ]
        result, _ = compute_layout(components, layout_type="single-column")

        for i in range(len(result) - 1):
            y_current = result[i]["position"]["y"]
            y_next = result[i + 1]["position"]["y"]
            assert y_next >= y_current, \
                f"Component {result[i+1]['id']} placed above {result[i]['id']}"

    def test_two_column_layout(self):
        """Two-column layout should place half-width components side by side."""
        components = [
            {"id": "hero", "type": "hero-section"},  # full-width
            {"id": "oshi", "type": "oshi-card"},      # half-width
            {"id": "attr", "type": "attribute-wall"},  # half-width
        ]
        result, _ = compute_layout(
            components, canvas_width=680, layout_type="two-column"
        )

        # Hero should be full width
        assert result[0]["type"] == "hero-section"

        # oshi and attr should be in different columns
        oshi = result[1]
        attr = result[2]
        assert oshi["position"]["x"] != attr["position"]["x"] or \
               oshi["position"]["y"] != attr["position"]["y"]

    def test_preserves_existing_dimensions(self):
        """Should preserve existing width/height if set."""
        components = [
            {
                "id": "custom",
                "type": "text",
                "position": {"width": 400, "height": 150},
            },
        ]
        result, _ = compute_layout(components)

        assert result[0]["position"]["width"] == 400
        assert result[0]["position"]["height"] == 150
