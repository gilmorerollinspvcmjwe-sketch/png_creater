"""Theme matching models for Phase 4 LLM-driven semantic style mapping."""

from pydantic import BaseModel, Field
from typing import List, Optional


class ThemeAlternative(BaseModel):
    """An alternative theme suggestion with confidence score."""
    theme_id: str = Field(..., description="Theme identifier")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    reason: str = Field(default="", description="Why this theme was suggested")


class ThemeMatchResult(BaseModel):
    """Result of semantic theme matching."""
    theme_id: str = Field(..., description="Best matching theme identifier")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    reason: str = Field(default="", description="Why this theme was chosen")
    alternatives: List[ThemeAlternative] = Field(
        default_factory=list, description="Alternative theme suggestions"
    )
