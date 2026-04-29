"""Semantic validation models for Phase 4 LLM-driven validation."""

from pydantic import BaseModel, Field
from typing import List, Literal


class SemanticIssue(BaseModel):
    """A semantic issue found by LLM validation."""
    severity: Literal["low", "medium", "high"] = Field(
        ..., description="Issue severity level"
    )
    category: str = Field(..., description="Issue category (theme_mismatch, missing_component, etc.)")
    message: str = Field(..., description="Human-readable issue description")
    suggestion: str = Field(..., description="Suggested fix")


class SemanticValidationResult(BaseModel):
    """Result of LLM semantic validation."""
    score: float = Field(..., ge=0, le=100, description="Overall semantic score 0-100")
    passed: bool = Field(..., description="Whether config passes semantic check")
    issues: List[SemanticIssue] = Field(
        default_factory=list, description="List of semantic issues found"
    )
    good_aspects: List[str] = Field(
        default_factory=list, description="Positive aspects of the config"
    )
