"""Models package."""

from .page import (
    BackendPageConfig,
    BackendComponentConfig,
    ComponentPosition,
    ThemeConfig,
    ThemeColors,
    ThemeFonts,
    LayoutConfig,
    PageMetadata,
    ComponentType,
    ThemeId,
    create_hero_section,
    create_oshi_card,
    create_attribute_wall,
    create_tag_group,
    create_music_player,
    create_social_links,
    create_quote,
    create_default_page_config,
)
from .profile import UserProfile, Oshi, Personality, Interests, StylePreference, SocialLink
from .feedback import Feedback, FeedbackRequest
from .theme import ThemeAlternative, ThemeMatchResult
from .layout import LayoutStrategy, LayoutResult
from .validation import SemanticIssue, SemanticValidationResult

__all__ = [
    "BackendPageConfig",
    "BackendComponentConfig",
    "ComponentPosition",
    "ThemeConfig",
    "ThemeColors",
    "ThemeFonts",
    "LayoutConfig",
    "PageMetadata",
    "ComponentType",
    "ThemeId",
    "create_hero_section",
    "create_oshi_card",
    "create_attribute_wall",
    "create_tag_group",
    "create_music_player",
    "create_social_links",
    "create_quote",
    "create_default_page_config",
    "UserProfile",
    "Oshi",
    "Personality",
    "Interests",
    "StylePreference",
    "SocialLink",
    "Feedback",
    "FeedbackRequest",
    # Phase 4
    "ThemeAlternative",
    "ThemeMatchResult",
    "LayoutStrategy",
    "LayoutResult",
    "SemanticIssue",
    "SemanticValidationResult",
]