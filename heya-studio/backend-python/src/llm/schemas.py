"""LLM output schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# Router Agent schemas
class IntentType(BaseModel):
    """Intent classification result."""
    intent: str = Field(..., description="Intent type: new_page, modify_page, chat")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    extracted_context: Optional[Dict[str, Any]] = Field(None, description="Extracted context. MUST use these exact keys: mbti, oshi, style_preference, hobbies. Do NOT use personality_type or favorite_character.")


class ExtractedContext(BaseModel):
    """Context extracted from user input."""
    mbti: Optional[str] = Field(None, description="MBTI personality type, e.g. INTJ, INFP. Use key 'mbti' NOT 'personality_type'.")
    oshi: Optional[List[Dict[str, str]]] = Field(None, description="Favorite characters. Use key 'oshi' NOT 'favorite_character'.")
    style_preference: Optional[str] = None
    page_id: Optional[str] = None
    selected_component_ids: Optional[List[str]] = None


# Design Agent schemas
class DesignSuggestion(BaseModel):
    """Design suggestion from Agent."""
    component_type: str
    reason: str
    priority: int = Field(default=1, ge=1, le=5)


class GenerationPlan(BaseModel):
    """Page generation plan."""
    theme_id: str
    components: List[str]
    reasoning: str
    needs_confirmation: bool = False


# Profile Extract schemas
class ExtractedProfile(BaseModel):
    """Profile extracted from conversation."""
    oshi: Optional[List[Dict[str, str]]] = None
    mbti: Optional[str] = None
    zodiac: Optional[str] = None
    blood_type: Optional[str] = None
    hobbies: Optional[List[str]] = None
    music: Optional[List[str]] = None
    anime: Optional[List[str]] = None
    styles: Optional[List[str]] = None
    social_links: Optional[List[Dict[str, str]]] = None
    confidence: float = Field(default=0.8, ge=0, le=1)


# Component Search schemas
class ComponentMatch(BaseModel):
    """Component match result."""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    relevance_score: float = Field(default=0.0, ge=0, le=1)


class ComponentSearchResult(BaseModel):
    """Component search result."""
    components: List[ComponentMatch]
    total: int
    query: str


# Validation schemas
class ValidationIssue(BaseModel):
    """Validation issue."""
    severity: str = Field(..., description="error, warning, info")
    code: str
    message: str
    field: Optional[str] = None
    suggestion: Optional[str] = None


class ValidationResult(BaseModel):
    """Validation result."""
    passed: bool
    issues: List[ValidationIssue] = Field(default_factory=list)
    score: float = Field(default=100.0, ge=0, le=100)


# Modify Agent schemas
class ModifyTarget(BaseModel):
    """Modify target identification."""
    target_ids: List[str]
    ambiguity: Optional[str] = None
    needs_confirmation: bool = False

class ModifyTargetLLM(BaseModel):
    """LLM 驱动的目标检测."""
    target_types: List[str] = Field(default_factory=list, description="目标组件类型列表，如 ['hero-section', 'oshi-card']")
    action: str = Field(default="", description="修改动作描述，如 'change_color', 'change_text', 'delete'")
    params: Dict[str, Any] = Field(default_factory=dict, description="修改参数")
    confidence: float = Field(default=0.8, ge=0, le=1, description="置信度")
    reasoning: Optional[str] = Field(None, description="LLM 判断理由")


class ModifyPlan(BaseModel):
    """Modification plan."""
    targets: List[str]
    action: str
    reasoning: str
    estimated_changes: int

class ModifyActionLLM(BaseModel):
    """LLM 解析的修改操作."""
    action_type: str = Field(..., description="操作类型: change_theme, change_color, change_text, delete, add, move")
    target_component_types: List[str] = Field(default_factory=list, description="目标组件类型")
    params: Dict[str, Any] = Field(default_factory=dict, description="具体参数，如 {'color': '#FF6B6B'}")
    confidence: float = Field(default=0.8, ge=0, le=1)


# Chat Agent schemas
class ChatResponse(BaseModel):
    """Chat agent response."""
    message: str
    suggestions: Optional[List[str]] = None
    should_redirect: bool = False
    redirect_hint: Optional[str] = None